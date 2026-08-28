# MADAD — Database Layer

**Owner:** Yasir Iftikhar  
**Stack:** PostgreSQL 14+ (local for dev; Alibaba Cloud ApsaraDB for prod), Python

---

## Folder Structure

```
database/
├── postgres/
│   ├── schema.sql              # Full CREATE TABLE statements — source of truth
│   ├── migrations/
│   │   └── 001_initial.sql    # Idempotent version (IF NOT EXISTS + transaction)
│   └── seed_data.sql           # Demo centers, users, depots, inventory
├── sqlite/                     # [PHASE 2 — do not run]
│   ├── local_schema.sql
│   └── sync_service.py
├── geodata/
│   ├── fetch_osm.py            # Run ONCE on Day 1 to generate demo_region.graphml
│   ├── gazetteer.py            # Fuzzy settlement-name → lat/lng lookup
│   └── demo_region.graphml    # Pre-fetched, committed to repo
├── demo_data/
│   ├── sample_reports.json     # 17 staged reports (mix of Urdu/English)
│   ├── damage_events.json      # Pre-staged bridge damage for replanning demo
│   └── seed_depots.json        # Machine-readable depot seed (for scripted resets)
├── requirements.txt
└── README.md                   # ← you are here
```

---

## Setup (MVP — run in this order)

### 1. Install dependencies

```bash
cd database
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure PostgreSQL

For local development, install PostgreSQL and create the database:

```bash
psql -U postgres -c "CREATE DATABASE madad;"
```

Set your connection string (replace with your actual credentials):

```
postgresql://postgres:<password>@localhost:5432/madad
```

For Alibaba Cloud ApsaraDB (when provisioned), use the provided connection string directly.

### 3. Run the schema migration

```bash
# Option A — idempotent (safe to re-run):
psql <connection_string> -f postgres/migrations/001_initial.sql

# Option B — clean slate (drop and recreate):
psql <connection_string> -f postgres/schema.sql
```

### 4. Load seed data

```bash
psql <connection_string> -f postgres/seed_data.sql
```

**Seeded accounts (password for all: `madad123`):**

| Center | Code   | Username    | Role        |
|--------|--------|-------------|-------------|
| Rajanpur | RJP-01 | bilal     | coordinator |
| Rajanpur | RJP-01 | admin_rjp | admin       |
| Muzaffargarh | MZF-01 | sara  | coordinator |
| Muzaffargarh | MZF-01 | admin_mzf | admin   |

### 5. Fetch the road network (run once, on Day 1)

```bash
python geodata/fetch_osm.py
```

This downloads the Rajanpur, Punjab, Pakistan road network from OpenStreetMap and saves it as `geodata/demo_region.graphml`. **Commit this file to the repo immediately after generating it.** The live demo must not depend on Overpass API availability.

### 6. Verify the gazetteer

```bash
python geodata/gazetteer.py
```

All tests should print `PASS`. If any fail, check the threshold or settlement entries in `gazetteer.py`.

---

## Transaction Rule (IMPORTANT — document here for Muhammad Ahmad)

> **Creating a dispatch must always be a single database transaction:**
> inventory decrement + `sites.status` update to `'planned'` + `dispatches` INSERT — all or nothing.
>
> If inventory decrement fails (quantity would go below zero), the whole request must fail with `409 Conflict` and nothing partial must be written.
>
> This is enforced at two layers:
> 1. **Backend** (`backend/app/api/routes/dispatch.py`) — transaction logic in application code.
> 2. **Database** (`inventory.quantity CHECK (quantity >= 0)`) — DB constraint as second line of defense.
>
> Both layers are intentional. The DB constraint protects against future backend bugs, not just the current one.

---

## Data Rules (reference for Muhammad Ahmad when writing queries)

1. **Never hard-delete** `report`, `site`, or `dispatch` rows. Use status transitions (`'rejected'`, `'delivered'`). Hard deletes destroy the audit trail this app exists to provide.
2. **`inventory.quantity` must never go negative** — enforced by DB `CHECK` constraint and backend transaction logic.
3. **`sites.status` is one-directional** under normal operation: `unserved → planned → dispatched → delivered`. The only valid backward transition is `planned → unserved` (dispatch cancelled before departure).
4. **`en_route` is NOT a `sites.status`** — it exists only on `dispatches.status`. A site set to `'dispatched'` already means "do not touch in replanning," regardless of whether the dispatch has since progressed to `en_route` or `delivered`.

---

## Demo Data

- **`demo_data/sample_reports.json`** — 17 staged reports. Feed these through the UI during the demo. Do NOT pre-load them into the database — they should be created live so judges watch the pipeline in action.
- **`demo_data/damage_events.json`** — Fire the bridge damage event **after** the first allocation plan is shown. Call `POST /api/roads/damage` with the coordinates, then `POST /api/plan/replan` with `trigger="road_damage"` to show the replanning moment.
- **`demo_data/seed_depots.json`** — Machine-readable version of the depot seed. Use this for scripted demo resets if needed.

---

## What Is NOT Built (Phase 2)

| Item | Status | Pitch line |
|---|---|---|
| SQLite offline cache | Phase 2 — not built | "Architected for offline-first — schema already supports it; prioritized live coordination for this build." |
| `sync_service.py` | Phase 2 — do not run | Same as above |

The `sqlite/` folder is kept as documented Phase 2 design — do not run these files unless the team explicitly decides to revisit offline sync with genuine spare time on Day 3 or 4.
