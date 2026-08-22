# MADAD — API Contract (Single Source of Truth)
This file must always match the contract sections in `MADAD_BACKEND.md` and `MADAD_FRONTEND.md` exactly. If you change an endpoint, update all three places in the same commit — not "later."

**Base URL:** `http://<backend-host>:8000/api`
**Ports:** Backend `8000` | PostgreSQL (Alibaba Cloud ApsaraDB) `5432` | Expo dev server `8081`
**Auth:** `Authorization: Bearer <token>` header on every request after login.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Coordinator login, returns token + center info |
| GET | `/api/centers` | List all support centers |
| POST | `/api/reports` | Submit a raw-text or structured-form report |
| POST | `/api/reports/{id}/extract` | Run AI extraction on a raw-text report |
| PATCH | `/api/reports/{id}` | Coordinator confirms/edits extracted data → creates a Site |
| GET | `/api/reports` | List reports, filterable by center/status |
| GET | `/api/sites` | List sites, filterable by center/status |
| GET | `/api/depots` | List depots with current inventory |
| PATCH | `/api/depots/{id}/inventory` | Adjust inventory quantity |
| POST | `/api/plan/generate` | Generate a ranked allocation plan |
| POST | `/api/plan/replan` | Recompute plan for unstarted sites/dispatches only |
| POST | `/api/roads/damage` | Flag a road/bridge segment as impassable |
| GET | `/api/roads/damaged` | List currently active damage reports |
| GET | `/api/routes` | Get route between a depot and a site, damage-aware |
| POST | `/api/dispatch` | Create a dispatch (transactional: inventory + site status + record) |
| PATCH | `/api/dispatch/{id}/status` | Update dispatch status (planned → en_route → delivered) |

**This file is now the single authoritative spec — not a quick-reference index.** `MADAD_BACKEND.md` and `MADAD_FRONTEND.md` both point back here instead of keeping their own copies, specifically so the two of you can never accidentally build against two different versions of the same endpoint again.

---

## Library Versions (pin these exactly — do not install "latest")

**Backend (`backend/requirements.txt`):**
```
fastapi==0.115.0
uvicorn[standard]==0.30.6
pydantic==2.9.2
pydantic-settings==2.5.2
sqlalchemy==2.0.35
psycopg2-binary==2.9.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
osmnx==1.9.4
networkx==3.3
rapidfuzz==3.9.7
httpx==0.27.2
python-multipart==0.0.9
```

**Database (`database/requirements.txt`):**
```
psycopg2-binary==2.9.9
sqlalchemy==2.0.35
osmnx==1.9.4
networkx==3.3
rapidfuzz==3.9.7
```

**Frontend (`frontend/package.json` core dependencies):**
```
expo: ~51.0.28
react: 18.2.0
react-native: 0.74.5
react-navigation/native: ^6.1.18
react-navigation/native-stack: ^6.11.0
axios: ^1.7.7
react-native-maps: 1.14.0
expo-print: ~13.0.1
typescript: ~5.3.3
```
**Why pin exact versions rather than `^` ranges everywhere:** three people on three machines installing "whatever's newest" on different days is a guaranteed way to get subtly incompatible builds that only fail when you try to merge. Exact pins mean `npm install` / `pip install -r requirements.txt` gives everyone byte-identical dependency trees. If a version above is wrong for your actual OS/setup, the fix is to agree on a replacement as a team and update this file in one commit — not to quietly install something different locally.

---

## Full Endpoint Specification (request/response, every field, status codes, error shapes)

Every endpoint below documents: request body (with types), success response (with types), and possible error responses. Treat a field marked `required` as required — sending a request without it should get you a `422` from FastAPI's own Pydantic validation, before your route code even runs.

### `POST /api/auth/login`
Request:
```json
{ "center_code": "string, required", "username": "string, required", "password": "string, required" }
```
Success `200`:
```json
{ "access_token": "string (JWT)", "token_type": "bearer", "role": "coordinator | admin",
  "center_id": "integer", "center_name": "string" }
```
Errors: `401` `{"detail": "Incorrect username or password"}` · `404` `{"detail": "Center code not found"}`

### `GET /api/centers`
Success `200`: `[{ "id": "integer", "code": "string", "name": "string", "region": "string", "lat": "float", "lng": "float" }]`

### `POST /api/reports`
Request:
```json
{
  "center_id": "integer, required",
  "source": "manual | sms_stub, required",
  "raw_text": "string, optional — required if structured_fields is omitted",
  "structured_fields": {
    "location_name": "string", "headcount": "integer", "severity": "low | medium | high | critical",
    "needs": ["food | water | medical_evacuation | shelter | medicine | general_evacuation"]
  }
}
```
Success `201`: `{ "report_id": "integer", "status": "pending_extraction | confirmed" }`
Errors: `422` if both `raw_text` and `structured_fields` are missing — a report must contain one or the other.

**Field mapping (required reading before implementing either side of this endpoint):** `structured_fields.headcount` → stored as `sites.estimated_population`. These are intentionally different names — `headcount` is the form-facing label a coordinator fills in; `estimated_population` is the canonical field used everywhere downstream (extraction responses, the sites list, prioritization). `structured_fields.severity` → stored directly as `sites.severity` (nullable column, populated only via this manual path, never by AI extraction — see `MADAD_BACKEND.md` Story 2 and `MADAD_DATABASE.md` schema).

### `POST /api/reports/{id}/extract`
Success `200`:
```json
{ "report_id": "integer",
  "extracted": { "location_name": "string", "estimated_population": "integer",
    "needs": ["string enum, see above"], "urgency_flags": ["string enum, see backend spec"],
    "confidence": "single_unverified | corroborated" },
  "geocode_status": "matched | unmatched" }
```
Errors: `404` report not found · `409` `{"detail": "Report already extracted"}` if called twice · `503` `{"detail": "Extraction provider unavailable"}` if Qwen/Gemma call fails — frontend must show a retry option, not a silent failure, on this specific error.

### `PATCH /api/reports/{id}`
Request:
```json
{ "location_name": "string, required", "lat": "float, required", "lng": "float, required",
  "estimated_population": "integer, required", "needs": ["string"], "urgency_flags": ["string"],
  "status": "confirmed | rejected, required" }
```
Success `200`: `{ "site_id": "integer, null if status=rejected", "status": "string" }`
Errors: `422` if `status=confirmed` but `lat`/`lng` are missing — this enforces the "never confirm with no coordinates" rule from the pin-drop fallback.

### `GET /api/reports?center_id=&status=`
Success `200`: `[{ "report_id": "integer", "raw_text": "string|null", "status": "string", "created_at": "ISO 8601 string" }]`

### `GET /api/sites?center_id=&status=`
Success `200`: `[{ "id": "integer", "location_name": "string", "lat": "float", "lng": "float",
  "estimated_population": "integer", "needs": ["string"], "urgency_flags": ["string"],
  "confidence": "string", "priority_score": "float", "status": "string" }]`

### `GET /api/depots?center_id=`
Success `200`: `[{ "id": "integer", "name": "string", "lat": "float", "lng": "float",
  "inventory": [{ "resource_type": "string", "quantity": "integer" }] }]`

### `PATCH /api/depots/{id}/inventory`
Request: `{ "resource_type": "string, required", "quantity_delta": "integer, required (can be negative)" }`
Success `200`: `{ "resource_type": "string", "quantity": "integer" }`
Errors: `409` `{"detail": "Insufficient inventory, cannot go below zero"}`

### `POST /api/plan/generate`
Request: `{ "center_id": "integer, required" }`
Success `200`: `{ "allocations": [{ "site_id": "integer", "depot_id": "integer", "rank": "integer",
  "priority_score": "float", "resources": [{"resource_type": "string", "quantity": "integer"}], "reasoning": "string" }] }`
Errors: `200` with `"allocations": []` and `"message": "No unserved sites"` — this is a valid empty state, not an error, and the frontend must render it as "all clear" rather than a blank/broken screen.

### `POST /api/plan/replan`
Request: `{ "center_id": "integer, required", "trigger": "new_report | road_damage | dispatch_complete, required" }`
Success `200`: `{ "changed": [{ "site_id": "integer", "old_rank": "integer|null", "new_rank": "integer",
  "reason": "string" }], "unchanged": "integer[] — array of site IDs only, NOT full site objects" }`

### `POST /api/roads/damage`
Request: `{ "center_id": "integer, required", "lat": "float, required", "lng": "float, required", "reason": "string, optional" }`
Success `201`: `{ "id": "integer", "active": true }`

### `GET /api/roads/damaged?center_id=`
Success `200`: `[{ "id": "integer", "lat": "float", "lng": "float", "reason": "string|null", "reported_at": "ISO 8601 string" }]`

### `GET /api/routes?from_depot_id=&to_site_id=`
Success `200`: `{ "distance_km": "float", "eta_minutes": "integer", "geojson": "GeoJSON LineString object",
  "avoided_damage": "boolean", "delta_minutes_vs_direct": "integer" }`
Errors: `404` `{"detail": "No route found — depot and site may be disconnected in the road graph"}` — frontend must handle this explicitly (show "no route available," not crash on a missing `geojson` field).

### `POST /api/dispatch`
Request: `{ "site_id": "integer, required", "depot_id": "integer, required", "resources": [{"resource_type": "string", "quantity": "integer"}] }`
Success `201`: `{ "dispatch_id": "integer", "status": "planned", "route": {"geojson": "...", "distance_km": "float"}, "eta_minutes": "integer" }`
Errors: `409` `{"detail": "Insufficient inventory for one or more resources"}` — entire request fails, nothing partial written (see transaction rule in `MADAD_BACKEND.md`).

**CANONICAL RESOURCE SHAPE — applies everywhere in this API, no exceptions:** any list of resources/inventory, in any request or response, is always `[{"resource_type": "string", "quantity": "integer"}]` — an array of objects. Never a `{resource_type: quantity}` dictionary, on either the request or response side, anywhere in this contract. This is deliberately chosen over a dictionary shape because it's self-describing on the wire and types cleanly in TypeScript as `Resource[]` without ambiguity. If the backend's internal Python code finds a dict more convenient for computation (e.g., in `prioritization.py` or `routing.py`), that's fine — convert to/from the array shape only at the API boundary, in the route handler, never expose the dict shape in a response body.

### `PATCH /api/dispatch/{id}/status`
Request: `{ "status": "en_route | delivered, required" }`
Success `200`: `{ "dispatch_id": "integer", "status": "string" }`
Errors: `422` if attempting to set status backward (e.g., `delivered` → `en_route`) — status only moves forward.

---

## General Error Response Shape (applies to every endpoint above unless stated otherwise)
```json
{ "detail": "human-readable message" }
```
Frontend should always render `detail` directly to the coordinator on error — don't build custom messages per error code, the backend's message is already written to be field-usable.

---

## Explicitly Cut From This Build (do not implement — say so in the pitch instead of skipping silently)

| Feature | Why cut | What to say to judges if asked |
|---|---|---|
| SQLite offline sync | ~1.5 days of distributed-systems work, zero visible demo value under live-connection judging | "Architected for offline-first — the schema and design already support it; prioritized the live coordination experience for this build." |
| End-of-day situation report export | Never had a full spec; new endpoint + screen + document generation | "The data model already captures everything needed — a one-click export is the natural next step." |
| Report deduplication/merging UI | Described conceptually but has no endpoint, schema support, or screen | "Corroborated reports already boost a site's confidence and priority score automatically — full dedup grouping is next iteration." |
| `expo-print` PDF dispatch orders | Native print module, unpredictable Android behavior under time pressure | Not needed — replaced with a share-sheet summary carrying identical information. |
| Gemma/Ollama local extraction | Real stretch goal, keep the `GemmaProvider` interface stub even if unused | "The extraction layer is provider-agnostic by design — Qwen runs the MVP, a local Gemma model is a drop-in swap for full offline resilience." |
| Onboarding slides | Zero functional value, build last if time remains | If unbuilt: go straight from first launch to Login. This costs nothing in judging. |

Anyone on the team who has spare time before the deadline should look at this list before starting anything not already specified elsewhere in these documents — these are the *known* places extra time could go, not the only reasonable use of it, but they're a better default than inventing new scope.
