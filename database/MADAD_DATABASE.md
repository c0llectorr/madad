# MADAD — Database & Data Layer Implementation Plan
**Owner:** Yasir Iftikhar
**Stack:** PostgreSQL (central, hosted on Alibaba Cloud ApsaraDB, port **`5432`**, standard Postgres port — do not change this), SQLite (local cache on each coordinator's device, no network port — it's a file, not a service), Python for the sync service and geodata scripts.

Your role covers more than "the schema" — it's the entire data layer: the schema itself, the local-cache/central-sync logic, and the road/map data pipeline. This is intentional: it's genuinely a full third of the system's real engineering complexity, not a side task, and it's what frees Muhammad Ahmad to focus on extraction, prioritization, and routing logic instead of also owning data plumbing.

---

## 0. Primary Repository Structure (shared — identical in all three role files)

```
madad/
├── backend/                  ← Muhammad Ahmad owns this
├── frontend/                 ← Abdullah owns this
├── database/                 ← YOU own everything in this folder
├── docs/
│   └── API_CONTRACT.md
├── .gitignore
└── README.md
```
**Golden rule:** you only edit files inside `database/`. Muhammad Ahmad's backend imports your schema/session objects — he should never redefine a table structure himself. If the backend needs a new field, he tells you, you add it here, he pulls it in. This is what prevents the two of you from silently drifting into two different ideas of what a "site" record looks like.

## 1. Your Secondary Structure (inside `database/`)

```
database/
├── postgres/
│   ├── schema.sql                  # full CREATE TABLE statements, source of truth
│   ├── migrations/
│   │   └── 001_initial.sql
│   └── seed_data.sql               # demo support centers, depots, initial inventory
├── sqlite/
│   ├── local_schema.sql            # mirrors postgres schema, minus center-scoping complexity
│   └── sync_service.py             # local cache → central Postgres sync logic
├── geodata/
│   ├── fetch_osm.py                # pulls road network for the demo region via Overpass API
│   ├── gazetteer.py                # settlement name → lat/lng fuzzy-match lookup
│   └── demo_region.graphml         # pre-fetched, committed to repo so nobody depends on live internet during the demo
├── demo_data/
│   ├── sample_reports.json         # 15–20 staged situation reports for the demo
│   ├── damage_events.json          # the pre-staged "bridge just went down" event
│   └── seed_depots.json
├── requirements.txt
└── README.md                       # how to run migrations, load seed data, regenerate geodata
```

---

## 2. Central Schema — PostgreSQL (`postgres/schema.sql`)

```sql
CREATE TABLE support_centers (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(20) UNIQUE NOT NULL,     -- e.g. 'RJP-01'
    name        VARCHAR(120) NOT NULL,
    region      VARCHAR(80),
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
    id             SERIAL PRIMARY KEY,
    center_id      INTEGER NOT NULL REFERENCES support_centers(id) ON DELETE CASCADE,
    username       VARCHAR(60) UNIQUE NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    role           VARCHAR(20) NOT NULL DEFAULT 'coordinator'
                   CHECK (role IN ('coordinator', 'admin')),
    created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reports (
    id             SERIAL PRIMARY KEY,
    center_id      INTEGER NOT NULL REFERENCES support_centers(id) ON DELETE CASCADE,
    source         VARCHAR(20) NOT NULL DEFAULT 'manual'
                   CHECK (source IN ('manual', 'sms_stub')),
    raw_text       TEXT,
    extracted_json JSONB,
    status         VARCHAR(20) NOT NULL DEFAULT 'pending_extraction'
                   CHECK (status IN ('pending_extraction', 'extracted', 'confirmed', 'rejected')),
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sites (
    id                    SERIAL PRIMARY KEY,
    center_id             INTEGER NOT NULL REFERENCES support_centers(id) ON DELETE CASCADE,
    report_id             INTEGER REFERENCES reports(id) ON DELETE SET NULL,
    location_name         VARCHAR(150) NOT NULL,
    lat                   DOUBLE PRECISION NOT NULL,
    lng                   DOUBLE PRECISION NOT NULL,
    estimated_population  INTEGER NOT NULL DEFAULT 0,
    needs                 JSONB NOT NULL DEFAULT '[]',
    urgency_flags         JSONB NOT NULL DEFAULT '[]',
    confidence            VARCHAR(20) NOT NULL DEFAULT 'single_unverified'
                          CHECK (confidence IN ('single_unverified', 'corroborated')),
    priority_score        DOUBLE PRECISION,
    severity              VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical') OR severity IS NULL),
    status                VARCHAR(20) NOT NULL DEFAULT 'unserved'
                          CHECK (status IN ('unserved', 'planned', 'dispatched', 'delivered')),
    -- Note: 'en_route' is intentionally NOT a site status. It exists only on `dispatches.status`.
    -- A site moving to 'dispatched' already means "do not touch in replanning," regardless of
    -- whether the associated dispatch has since progressed to en_route or delivered.
    last_report_time      TIMESTAMPTZ DEFAULT now(),
    created_at             TIMESTAMPTZ DEFAULT now(),
    updated_at             TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE depots (
    id          SERIAL PRIMARY KEY,
    center_id   INTEGER NOT NULL REFERENCES support_centers(id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE inventory (
    id             SERIAL PRIMARY KEY,
    depot_id       INTEGER NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
    resource_type  VARCHAR(40) NOT NULL,   -- 'food_packet' | 'water_container' | 'boat' | 'ambulance' | 'tent' | 'medicine_kit'
    quantity       INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at     TIMESTAMPTZ DEFAULT now(),
    UNIQUE (depot_id, resource_type)
);

CREATE TABLE dispatches (
    id               SERIAL PRIMARY KEY,
    center_id        INTEGER NOT NULL REFERENCES support_centers(id) ON DELETE CASCADE,
    site_id          INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    depot_id         INTEGER NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
    resources_loaded JSONB NOT NULL,
    route_geojson    JSONB,
    distance_km      DOUBLE PRECISION,
    eta_minutes      INTEGER,
    status           VARCHAR(20) NOT NULL DEFAULT 'planned'
                     CHECK (status IN ('planned', 'en_route', 'delivered')),
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE damaged_roads (
    id            SERIAL PRIMARY KEY,
    center_id     INTEGER NOT NULL REFERENCES support_centers(id) ON DELETE CASCADE,
    lat           DOUBLE PRECISION NOT NULL,
    lng           DOUBLE PRECISION NOT NULL,
    reason        VARCHAR(200),
    active        BOOLEAN NOT NULL DEFAULT true,
    reported_at   TIMESTAMPTZ DEFAULT now()
);

-- Indexes worth adding now, not after something is slow in front of judges:
CREATE INDEX idx_sites_center_status ON sites(center_id, status);
CREATE INDEX idx_dispatches_center_status ON dispatches(center_id, status);
CREATE INDEX idx_reports_center_status ON reports(center_id, status);
```

**Insert / update / delete rules — read this before writing any query against these tables, not after:**
- **Never hard-delete a `report`, `site`, or `dispatch` row.** Use status transitions instead (`'rejected'`, etc.). Hard deletes destroy the audit trail of what happened during a real disaster response, which is exactly the kind of record-keeping this app exists to provide. `support_centers`, `users`, and `depots` are the only tables where a hard delete is ever acceptable, and only for genuine setup mistakes, never as a normal operation.
- **Inventory quantity must never go negative** — enforced at the DB level via the `CHECK (quantity >= 0)` constraint above, as a second line of defense behind the backend's own transaction logic. Two layers here is deliberate, not redundant — the DB constraint protects you even if a future bug in the backend forgets to check first.
- **`sites.status` transitions are one-directional under normal operation**: `unserved → planned → dispatched → delivered`. The only backward transition that's valid is `planned → unserved`, and only when a dispatch tied to it is cancelled before departure. Don't allow the backend to write any other backward transition — if you see one in a code review, flag it to Muhammad Ahmad.
- **`dispatches` creation must always happen alongside an `inventory` decrement and a `sites.status` update, in one transaction** — this is the backend's responsibility to wrap correctly, but you should write this rule into `README.md` in this folder so it's documented in the data layer too, not only in the backend's code comments.

---

## 3. SCOPE DECISION: SQLite Offline Sync Is CUT From This Build

**Read this before Sections 3–4 below.** After review, the local-cache-plus-sync layer is being cut from the hackathon MVP. Reasoning: it's a genuine distributed-systems problem (conflict resolution, UUID collision handling, retry logic) worth roughly a day and a half of the four days you have — and since judging happens over a live connection, it produces zero visible difference at the table. That's the wrong trade for this specific deadline.

**What this means practically:** build straight against central PostgreSQL. No local SQLite cache, no `sync_service.py` running in the background, no `local_uuid` columns needed anywhere.

**What to say in the pitch, honestly, not defensively:** *"Madad is architected for offline-first field operation — the coordinator's Gemma extraction layer already runs locally for exactly this reason. For this build, we prioritized the live coordination and routing experience you're seeing; the local-cache-and-sync layer for full offline resilience is the next phase, and the schema is already designed to support it."* That's true, it's specific, and it's the same "Phase 1 built / Phase 2 roadmap" framing that's worked in every pitch so far — say it plainly if a judge asks, don't oversell it as already built.

Sections 3 and 4 below are kept in this document **as the documented Phase 2 design**, not as something to build this week. Don't run `sync_service.py`. Don't add `local_uuid` to `schema.sql`. If you finish everything else with real time to spare, revisit this section with the team — but that's a decision to make together on day 3 or 4, not a default to fall back into on day 1.

---

## 3a. [PHASE 2 — NOT BUILT FOR THIS DEMO] Local Cache Schema — SQLite (`sqlite/local_schema.sql`)

Same table shapes as Postgres, minus `center_id` foreign key complexity (a single coordinator's device only ever writes for its own center), plus one extra table to track what's waiting to sync:

```sql
-- reports, sites, depots, inventory, dispatches, damaged_roads: same columns as Postgres above,
-- but IDs are locally generated (use a UUID text column instead of SERIAL, so local records
-- never collide with central records generated on a different device before they've synced).

CREATE TABLE sync_queue (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name    TEXT NOT NULL,
    record_id     TEXT NOT NULL,          -- the UUID of the record needing sync
    operation     TEXT NOT NULL CHECK (operation IN ('insert', 'update')),
    payload_json  TEXT NOT NULL,          -- full record snapshot at time of write
    synced        BOOLEAN NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT current_timestamp
);
```

**Why UUIDs locally, not auto-increment integers:** if two different coordinators' devices are both offline and both create a new site with `id=1`, you get a collision the moment both try to sync to the same central table. A UUID generated locally is globally unique by construction, so there's never a collision to resolve — this is the single most important design decision in the whole sync layer, get it right from the start rather than discovering the problem during integration testing on day three.

---

## 4a. [PHASE 2 — NOT BUILT FOR THIS DEMO] Sync Service (`sqlite/sync_service.py`)

**What it does, in plain terms:** every write from the coordinator's app first goes into the local SQLite file — instantly, with no network dependency. A background loop, running every 30 seconds (or triggered manually via a "Sync Now" action if you want a visible one for the demo), checks `sync_queue` for unsynced rows and pushes them to the central Postgres database whenever connectivity is available.

```python
import time
import sqlite3
import psycopg2
import json
from datetime import datetime

def get_unsynced_records(sqlite_conn):
    cur = sqlite_conn.execute(
        "SELECT id, table_name, record_id, operation, payload_json FROM sync_queue WHERE synced = 0"
    )
    return cur.fetchall()

def push_to_central(pg_conn, table_name, record_id, operation, payload):
    cur = pg_conn.cursor()
    if operation == "insert":
        columns = list(payload.keys())
        values = list(payload.values())
        placeholders = ", ".join(["%s"] * len(values))
        col_names = ", ".join(columns)
        cur.execute(
            f"INSERT INTO {table_name} ({col_names}) VALUES ({placeholders}) "
            f"ON CONFLICT (local_uuid) DO UPDATE SET " +
            ", ".join(f"{c} = EXCLUDED.{c}" for c in columns if c != "local_uuid"),
            values
        )
    elif operation == "update":
        set_clause = ", ".join(f"{k} = %s" for k in payload if k != "local_uuid")
        values = [v for k, v in payload.items() if k != "local_uuid"] + [record_id]
        cur.execute(f"UPDATE {table_name} SET {set_clause} WHERE local_uuid = %s", values)
    pg_conn.commit()

def sync_loop(sqlite_path, pg_conn_string, interval_seconds=30):
    while True:
        sqlite_conn = sqlite3.connect(sqlite_path)
        try:
            pg_conn = psycopg2.connect(pg_conn_string)
            for row in get_unsynced_records(sqlite_conn):
                queue_id, table_name, record_id, operation, payload_json = row
                push_to_central(pg_conn, table_name, record_id, operation, json.loads(payload_json))
                sqlite_conn.execute("UPDATE sync_queue SET synced = 1 WHERE id = ?", (queue_id,))
            sqlite_conn.commit()
            pg_conn.close()
        except psycopg2.OperationalError:
            pass  # central DB unreachable — this is expected during an actual outage, not an error to alarm on
        finally:
            sqlite_conn.close()
        time.sleep(interval_seconds)
```

**Important note for the demo specifically:** add a `local_uuid` column to every central Postgres table (in addition to the `SERIAL id`) so `ON CONFLICT` has something reliable to key against — a record created offline and later synced needs a way to be recognized as "the same record" even though its central `id` didn't exist yet at creation time. Add this column now, in `postgres/schema.sql`, before Muhammad Ahmad starts writing queries against these tables — retrofitting it later touches every table.

**Honest scope note:** conflict resolution here is intentionally simple — last-write-wins via the `ON CONFLICT ... DO UPDATE` clause. Real distributed-sync systems (like the ODK/KoboToolbox pattern this design is based on) often need more sophisticated merge logic for genuinely simultaneous conflicting edits. For a hackathon demo, last-write-wins is a defensible, statable simplification — say so plainly if a judge asks, rather than implying it's more sophisticated than it is.

---

## 5. Geodata Pipeline (`geodata/fetch_osm.py`, `geodata/gazetteer.py`)

```python
import osmnx as ox

def fetch_region_graph(place_name: str, save_path: str):
    """Run this once, ahead of the hackathon days, not live during the event."""
    graph = ox.graph_from_place(place_name, network_type="drive")
    ox.save_graphml(graph, save_path)
    return graph
```
**Do this on day one, not day four:** run `fetch_region_graph("Rajanpur, Punjab, Pakistan", "demo_region.graphml")` once, early, and commit the resulting file to the repo. This means nobody's demo depends on live Overpass API availability during judging — a public API being slow or rate-limited during your actual pitch would be a bad way to lose points on something that was entirely avoidable.

`gazetteer.py` should load a simple settlement-name-to-coordinates lookup (build this from OSM place nodes in the same region extract, or a small hand-curated CSV of the villages in your demo scenario — for a focused regional demo, a hand-curated list of 20–30 real place names is actually more reliable than a huge generic dataset, since you control exactly what the fuzzy-matcher needs to handle).

---

## 6. Seed & Demo Data (`demo_data/`)

- `seed_depots.json` — 2 depots with realistic starting inventory (matches the walkthrough: Depot A with food/water/boats/ambulance, Depot B further away with food/tents).
- `sample_reports.json` — 15–20 staged reports, deliberately varied: some clear, some vague (to demonstrate the review/edit step actually matters), a mix of Urdu and English, at least 2–3 that reference the same location under different phrasing (to demonstrate deduplication).
- `damage_events.json` — the one bridge-damage event staged to fire partway through the live demo, timed to trigger the replanning moment.

**Load order for setup scripts:** `support_centers` → `users` → `depots` → `inventory` → (leave `reports`/`sites`/`dispatches` empty at seed time — those get created live, during the actual demo, not pre-populated, since watching them get created live is the point of the demo).

## 7. Local Run (MVP — matches the Section 3 scope decision, sync service intentionally excluded)
```bash
cd database
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
psql <connection_string> -f postgres/schema.sql
psql <connection_string> -f postgres/seed_data.sql
python geodata/fetch_osm.py     # run once, on Day 1, commits demo_region.graphml
```
That's the complete run sequence for this build. `sqlite/sync_service.py` is Phase 2 (Section 4a) — do not run it unless the team explicitly decides to revisit that scope with real time to spare.
