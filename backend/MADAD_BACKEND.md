# MADAD — Backend Implementation Plan
**Owner:** Muhammad Ahmad
**Stack:** Python 3.11, FastAPI, PostgreSQL (via Yasir's schema/session layer), Ollama (Gemma 2B/4B, stretch goal), Qwen via Alibaba Cloud (MVP extraction)
**Port:** Backend API runs on **`8000`** (`http://localhost:8000` locally; same port in staging/deployed config). This exact port number is also referenced in `MADAD_FRONTEND.md` and `MADAD_DATABASE.md` — do not change it without updating both other files and telling the team in the group chat.

---

## 0. Primary Repository Structure (shared across all three roles — do not deviate)

```
madad/
├── backend/                  ← YOU own everything in this folder
├── frontend/                 ← Abdullah owns this
├── database/                 ← Yasir owns this
├── docs/
│   └── API_CONTRACT.md       ← copy of Section 2 below, source of truth for all three of you
├── .gitignore
└── README.md
```

**Golden rule for merge safety:** you only ever edit files inside `backend/` and `docs/`. Never touch `frontend/` or `database/` directly. If you need a schema change, message Yasir — don't edit his SQL files yourself, even if it feels faster. This is what prevents merge conflicts across three people in three cities.

## 1. Your Secondary Structure (inside `backend/`)

```
backend/
├── app/
│   ├── main.py                     # FastAPI app instance, router registration, CORS
│   ├── api/
│   │   ├── deps.py                 # shared dependencies (DB session, current_user, current_center)
│   │   └── routes/
│   │       ├── auth.py
│   │       ├── reports.py
│   │       ├── sites.py
│   │       ├── depots.py
│   │       ├── plan.py
│   │       ├── dispatch.py
│   │       ├── roads.py
│   │       └── centers.py
│   ├── core/
│   │   ├── config.py               # env var loading (Pydantic Settings)
│   │   └── security.py             # password hashing, JWT
│   ├── services/
│   │   ├── extraction/
│   │   │   ├── base.py             # ExtractionProvider abstract interface
│   │   │   ├── qwen_provider.py    # MVP: Alibaba Cloud Qwen implementation
│   │   │   └── gemma_provider.py   # Stretch: local Ollama/Gemma implementation
│   │   ├── prioritization.py       # deterministic scoring engine
│   │   ├── routing.py              # OSM graph routing (calls Yasir's geodata files)
│   │   └── replanning.py           # diff-based replan logic
│   ├── schemas/                    # Pydantic request/response models (mirrors API_CONTRACT.md exactly)
│   │   ├── report.py
│   │   ├── site.py
│   │   ├── depot.py
│   │   ├── plan.py
│   │   └── dispatch.py
│   └── db/
│       └── session.py              # imports Base/engine from database/ package — do not redefine models here
├── tests/
│   ├── test_prioritization.py
│   ├── test_routing.py
│   └── test_replanning.py
├── requirements.txt                # exact pinned versions in API_CONTRACT.md — copy from there, don't freelance
├── .env.example
└── run.sh                          # `uvicorn app.main:app --reload --port 8000`
```

**Why this shape (SOLID, stated explicitly so nobody has to guess your reasoning later):**
- **Single Responsibility** — `prioritization.py`, `routing.py`, `replanning.py`, and each extraction provider are separate files, each doing exactly one job. Nobody should ever need to open `routing.py` to understand scoring logic.
- **Open/Closed** — `services/extraction/base.py` defines an abstract `ExtractionProvider` interface with one method, `extract(raw_text: str) -> ExtractedReport`. `qwen_provider.py` and `gemma_provider.py` both implement it. Adding a third provider later (or swapping Qwen for something else) never requires touching `reports.py` or any calling code — that's the entire point of the interface.
- **Dependency Inversion** — routes depend on the abstract `ExtractionProvider` type (injected via FastAPI's `Depends()`), never directly on `QwenProvider`. Which concrete provider gets used is decided in one place: `core/config.py`, via an `EXTRACTION_PROVIDER=qwen|gemma` environment variable.

```python
# services/extraction/base.py
from abc import ABC, abstractmethod
from app.schemas.report import ExtractedReport

class ExtractionProvider(ABC):
    @abstractmethod
    async def extract(self, raw_text: str) -> ExtractedReport:
        ...
```

This is the exact abstraction that lets you build the whole MVP against Qwen, then drop in Gemma later **only if there's time**, without rewriting anything else. Build `qwen_provider.py` first. Stub `gemma_provider.py` with a `NotImplementedError` until you actually get to it — that stub itself is useful, it documents the interface Gemma needs to satisfy.

---

## 2. API Contract

**The full authoritative spec — every field, type, status code, and error response — lives in `API_CONTRACT.md` at the repo root.** This section covers implementation-specific detail (extraction logic, corner cases, transaction rules) that builds on top of that contract; it does not restate it. If you change a response shape while building, update `API_CONTRACT.md` in the same commit, not after.

Base URL: `http://<backend-host>:8000/api`
Auth: every request after login includes header `Authorization: Bearer <token>`. Token expiry is configured via `JWT_EXPIRY_MINUTES` in `.env` — **agree this number with Abdullah before either of you writes auth-handling code**, since the frontend's session-refresh behavior (see `MADAD_FRONTEND.md` Section 2) depends on knowing this value.

### Auth
```
POST /api/auth/login
Request:  { "center_code": "RJP-01", "username": "bilal", "password": "..." }
Response: { "access_token": "...", "role": "coordinator", "center_id": 3, "center_name": "Rajanpur Support Center" }
```

### Centers
```
GET /api/centers
Response: [ { "id": 3, "code": "RJP-01", "name": "Rajanpur Support Center", "region": "Punjab", "lat": 29.10, "lng": 70.33 } ]
```

### Reports
```
POST /api/reports
Request:  {
  "center_id": 3,
  "source": "manual",                     // "manual" | "sms_stub" — sms_stub reserved for future use, unused in MVP
  "raw_text": "Chak 45 near Rajanpur, water entered 3 hours ago...",
  "structured_fields": {                  // optional — populated when the structured form is used instead of free text
    "location_name": "Chak 45",
    "headcount": 175,
    "severity": "high",
    "needs": ["food", "medical_evacuation"]
  }
}
Response: { "report_id": 42, "status": "pending_extraction" }

POST /api/reports/{id}/extract
Response: {
  "report_id": 42,
  "extracted": {
    "location_name": "Chak 45",
    "estimated_population": 175,
    "needs": ["food", "medical_evacuation"],
    "urgency_flags": ["elderly_present", "pregnancy"],
    "confidence": "single_unverified"
  }
}

PATCH /api/reports/{id}
Request:  { "location_name": "Chak 45", "lat": 29.15, "lng": 70.38, "estimated_population": 180,
            "needs": ["food", "medical_evacuation"], "urgency_flags": ["elderly_present"],
            "status": "confirmed" }
Response: { "site_id": 17, "status": "confirmed" }   // confirming a report creates/updates a Site record

GET /api/reports?center_id=3&status=pending
Response: [ { "report_id": 42, "raw_text": "...", "status": "pending_extraction", "created_at": "..." } ]
```

**Corner case — required, do not skip:** if `raw_text` is empty but `structured_fields` is present, skip the `/extract` call entirely and go straight to a confirmed site. This is the fast path the structured form enables — treat it as first-class, not a fallback.

**Corner case:** if extraction returns `location_name` that fails geocoding against the gazetteer (Yasir's `geodata/` lookup), return `{"extracted": {...}, "geocode_status": "unmatched"}` and require the coordinator to manually pin the location on the map before confirming. Never silently guess coordinates.

### Sites
```
GET /api/sites?center_id=3&status=unserved
Response: [ { "id": 17, "location_name": "Chak 45", "lat": 29.15, "lng": 70.38,
              "estimated_population": 180, "needs": [...], "urgency_flags": [...],
              "confidence": "corroborated", "priority_score": 245.0, "status": "unserved" } ]
```

### Depots
```
GET /api/depots?center_id=3
Response: [ { "id": 1, "name": "Depot A", "lat": 29.08, "lng": 70.30,
              "inventory": [{"resource_type": "food_packet", "quantity": 400},
                            {"resource_type": "boat", "quantity": 2}] } ]

PATCH /api/depots/{id}/inventory
Request:  { "resource_type": "food_packet", "quantity_delta": -50 }
Response: { "resource_type": "food_packet", "quantity": 350 }
```
**Corner case:** reject with `400` if `quantity_delta` would push quantity below zero. Never allow negative inventory — this is what protects the allocation engine from planning against resources that don't exist.

### Plan
```
POST /api/plan/generate
Request:  { "center_id": 3 }
Response: { "allocations": [
  { "site_id": 17, "depot_id": 1, "rank": 1, "priority_score": 245.0,
    "resources": { "boat": 1, "food_packet": 50 },
    "reasoning": "High population (180) + medical urgency flags" }
] }

POST /api/plan/replan
Request:  { "center_id": 3, "trigger": "new_report" }   // trigger: "new_report" | "road_damage" | "dispatch_complete"
Response: { "changed": [ { "site_id": 22, "old_rank": 3, "new_rank": 1, "reason": "route now blocked, escalated" } ],
            "unchanged": [17, 19] }
```
**Corner case, important for the demo:** `/replan` must only touch sites/dispatches with `status != 'dispatched'` and `status != 'delivered'`. A truck already en route does not get reassigned mid-journey — only unstarted work is replanned.

### Roads
```
POST /api/roads/damage
Request:  { "center_id": 3, "lat": 29.12, "lng": 70.35, "reason": "bridge submerged" }
Response: { "id": 5, "active": true }

GET /api/roads/damaged?center_id=3
Response: [ { "id": 5, "lat": 29.12, "lng": 70.35, "reason": "bridge submerged", "reported_at": "..." } ]
```

### Routes
```
GET /api/routes?from_depot_id=1&to_site_id=17
Response: { "distance_km": 14.2, "eta_minutes": 38, "geojson": {...},
            "avoided_damage": true, "delta_minutes_vs_direct": 40 }
```

### Dispatch
```
POST /api/dispatch
Request:  { "site_id": 17, "depot_id": 1, "resources": { "boat": 1, "food_packet": 50 } }
Response: { "dispatch_id": 9, "status": "planned", "route": {...}, "eta_minutes": 38 }
```
**Corner case:** creating a dispatch must be a single transaction — decrement inventory AND create the dispatch record AND update site status to `'planned'` together, or none of it. If inventory decrement fails (insufficient stock), the whole request fails with `409 Conflict` and nothing partial gets saved. This is the one place in the whole backend where a partial write would actually corrupt the operational picture — treat it as non-negotiable.

```
PATCH /api/dispatch/{id}/status
Request:  { "status": "delivered" }
Response: { "dispatch_id": 9, "status": "delivered" }
```

---

## 3. User Stories, In Build Order (each one assumes the previous is done — build top to bottom)

**Story 1 — As the backend, I can accept a manual report and store it.**
`POST /api/reports` with `raw_text` only → row inserted with `status='pending_extraction'`. No AI call yet. This is your very first working endpoint — get this deployed and callable before touching anything else, so Abdullah can start integrating against a real (if minimal) API on day one instead of waiting on you.

**Story 2 — As the backend, I can accept a structured-form report and skip extraction entirely.**
Same endpoint, but when `structured_fields` is present, immediately create a `confirmed` site record, no extraction call.

**Explicit field mapping — this is the one place two field names must be reconciled, don't let it get lost:** the request body's `structured_fields.headcount` maps directly to `sites.estimated_population` on insert. These are deliberately different names at the API boundary (`headcount` is what a human fills into a form; `estimated_population` is the canonical stored field used everywhere downstream — extraction, prioritization, the sites list) but they are the same value. Write this mapping as a single explicit line in `routes/reports.py`, e.g. `estimated_population = structured_fields["headcount"]` — don't let it get inferred implicitly.

**`structured_fields.severity` handling:** store it directly on `sites.severity` (nullable column — see `MADAD_DATABASE.md`). This field is populated **only** via this manual-entry fast path, never by AI extraction — the model never assigns severity, a human coordinator does, consistent with the extraction-never-decides principle governing every other story here. It feeds into `priority_score()` (Story 5) as an additional weight.

**Story 3 — As the backend, I can extract structured data from free text via Qwen.**
Implement `QwenProvider.extract()`, wire it to `/api/reports/{id}/extract`. This is where the function-calling tool schema lives:
```python
EXTRACT_TOOL = {
  "type": "function",
  "function": {
    "name": "extract_relief_need",
    "description": "Extract structured relief needs from a raw field situation report",
    "parameters": {
      "type": "object",
      "properties": {
        "location_name": {"type": "string"},
        "estimated_population": {"type": "integer"},
        "needs": {"type": "array", "items": {"type": "string",
          "enum": ["food", "water", "medical_evacuation", "shelter", "medicine", "general_evacuation"]}},
        "urgency_flags": {"type": "array", "items": {"type": "string",
          "enum": ["elderly_present", "children_present", "pregnancy", "injury_reported",
                   "water_rising", "stranded_no_exit"]}}
      },
      "required": ["location_name", "needs"]
    }
  }
}
```
The model extracts. It never decides anything. That principle governs every downstream story — don't let it drift.

**Story 4 — As the backend, I can geocode an extracted location name.**
Fuzzy-match `location_name` against Yasir's gazetteer table (`rapidfuzz`). On no match, return `geocode_status: unmatched` per the corner case above — this must not block the coordinator, it just means they pin the map manually.

**Story 5 — As the backend, I can compute a priority score for every unserved site.**
Pure function, no side effects, fully unit-testable — this is why it's its own file:
```python
def priority_score(site: dict, now: datetime) -> float:
    score = site["estimated_population"] * 1.0
    urgency_weights = {"injury_reported": 50, "pregnancy": 40, "water_rising": 30,
                        "stranded_no_exit": 30, "elderly_present": 15, "children_present": 15}
    score += sum(urgency_weights.get(f, 0) for f in site["urgency_flags"])
    severity_weights = {"critical": 50, "high": 30, "medium": 10, "low": 0}
    score += severity_weights.get(site.get("severity"), 0)   # .get() — severity is nullable, AI-extracted sites won't have it
    score += 10 if site["confidence"] == "corroborated" else 0
    hours_since_report = (now - site["last_report_time"]).total_seconds() / 3600
    score += hours_since_report * 5
    return score
```
Write `tests/test_prioritization.py` against this before moving on — it's the easiest thing in the whole system to verify correctness of, and the one judges are most likely to ask you to explain live.

**Reasoning string template — fixed format, do not let this be freestyled per-call:** every allocation's `reasoning` field must be generated as:
```python
def format_reasoning(site: dict) -> str:
    parts = [f"population {site['estimated_population']}"]
    if site["urgency_flags"]:
        parts.append(f"flags: {', '.join(site['urgency_flags'])}")
    if site.get("severity"):
        parts.append(f"severity: {site['severity']}")
    return f"Priority score {site['priority_score']:.0f}: " + ", ".join(parts)
```
This exact, fixed format is what the frontend's `AllocationPlanScreen` is built to display — an inconsistent or freeform reasoning string on any given call will still work functionally, but it'll look visually broken (inconsistent formatting) in the one screen judges will actually read closely.

**Story 6 — As the backend, I can generate an allocation plan.**
Greedy loop: sort unserved sites by `priority_score` descending, walk depots' inventory, assign until either resources or sites run out. Return the `reasoning` string per allocation (population + which urgency flags drove it) — this is what makes the plan feel transparent instead of a black box when Abdullah renders it.

**Story 7 — As the backend, I can compute a route that avoids damaged roads.**
Calls into `routing.py`, which loads the road graph Yasir provides in `database/geodata/`, removes any edge near an active `damaged_roads` entry, and runs shortest-path. Compute both the damaged-aware route and the naive direct route so you can return `delta_minutes_vs_direct` — that number is what sells the feature in the demo.

**Internal interface for `routing.py` — specified exactly so this is reproducible regardless of who or what implements it:**
```python
import osmnx as ox
import networkx as nx

GRAPH_PATH = "../database/geodata/demo_region.graphml"   # relative to backend/ root

def load_graph():
    G = ox.load_graphml(GRAPH_PATH)
    G = ox.add_edge_speeds(G)
    G = ox.add_edge_travel_times(G)   # adds a 'travel_time' attribute to every edge — this is the weight to route on
    return G

def apply_damage(G, damaged_points: list[tuple[float, float]]):
    G = G.copy()
    for lat, lng in damaged_points:
        u, v, key = ox.nearest_edges(G, lng, lat)   # note: osmnx takes (X=lng, Y=lat) order, not (lat, lng)
        if G.has_edge(u, v, key):
            G.remove_edge(u, v, key)
    return G

def compute_route(G, origin: tuple[float, float], dest: tuple[float, float]):
    orig_node = ox.nearest_nodes(G, origin[1], origin[0])
    dest_node = ox.nearest_nodes(G, dest[1], dest[0])
    path = nx.shortest_path(G, orig_node, dest_node, weight="travel_time")
    return path
```
Three specifics that must not be reinvented differently by anyone touching this file: the graph loads from `../database/geodata/demo_region.graphml` relative to `backend/`, routing weight is the `travel_time` edge attribute (added via `ox.add_edge_travel_times()`, not raw distance), and damaged points are snapped to their nearest edge via `ox.nearest_edges()` before removal — note OSMnx's `(x, y)` = `(lng, lat)` argument order, which is the single most common bug source when wiring this up.

**Story 8 — As the backend, I can create a dispatch and safely decrement inventory.**
Single-transaction requirement from the API contract above — this is the story most likely to have a subtle bug (partial writes under failure), so write the transaction test explicitly: simulate insufficient stock and assert nothing was written.

**Story 9 — As the backend, I can replan when something changes.**
Re-run stories 5–7 scoped to `sites.status NOT IN ('dispatched', 'delivered')` — note this is the corrected filter; `'planned_dispatched'` is not a valid status value anywhere in the schema and must never appear in this query. `'dispatched'` already covers "a truck has left" regardless of whether the associated dispatch record has since progressed to `en_route` or `delivered` (that finer-grained progression lives on `dispatches.status`, not `sites.status` — see `MADAD_DATABASE.md`) — so a site marked `dispatched` is correctly excluded from replanning either way, with no need to check the dispatch's own status separately. Diff old ranks vs. new ranks, return only what changed. This is your last story before the demo script — test it specifically against the "bridge just went down mid-demo" scenario, since that's the moment you're building the whole pitch around.

---

## 4. Stretch Goal — Local Gemma via Ollama (only after stories 1–9 are solid)

```bash
ollama pull gemma:4b
ollama serve   # localhost:11434
```
Implement `GemmaProvider(ExtractionProvider)` calling `http://localhost:11434/api/chat` with the same tool schema as Qwen. Switch providers via `.env`: `EXTRACTION_PROVIDER=gemma`. If this works, your pitch line is "processing never stops even if the center loses broader internet, because extraction runs on the coordinator's own machine" — but only claim this in the pitch if it's actually running, not planned.

## 5. Environment Variables (`.env.example` — copy this exactly, Yasir needs the same DB vars in his file)
```
DATABASE_URL=postgresql://user:password@<apsaradb-host>:5432/madad
SQLITE_CACHE_PATH=./local_cache.db
EXTRACTION_PROVIDER=qwen
QWEN_API_KEY=your_alibaba_cloud_key
OLLAMA_URL=http://localhost:11434
JWT_SECRET=change_me
JWT_EXPIRY_MINUTES=480
```

## 6. Local Run
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Anyone on the team should be able to run these four lines with zero further setup, once `.env` is filled in. If it requires more than that, something's wrong with your dependency list — fix it before pushing.
