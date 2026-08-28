-- =============================================================================
-- MADAD — Local SQLite Cache Schema
-- [PHASE 2 — NOT BUILT FOR THIS DEMO]
-- =============================================================================
-- This file is kept as a documented Phase 2 design, not as something to run
-- during the hackathon build. See MADAD_DATABASE.md Section 3a for full
-- rationale and design notes.
--
-- DO NOT run this file unless the team explicitly decides to build the
-- offline sync layer (requires ~1.5 days of additional engineering).
-- =============================================================================
--
-- KEY DESIGN DECISIONS FOR PHASE 2 (document here so they aren't re-litigated):
--
-- 1. LOCAL UUIDs instead of SERIAL integers:
--    If two coordinators are offline and both create a site with id=1, they
--    collide the moment both sync to central Postgres. UUIDs generated locally
--    are globally unique by construction — no collision possible.
--
-- 2. Same table shapes as Postgres (minus center_id foreign key complexity):
--    A single coordinator's device only ever writes for its own center.
--
-- 3. sync_queue table:
--    Every local write queues an entry. Background sync_service.py pushes
--    queued rows to central Postgres whenever connectivity is available.
--
-- 4. Conflict resolution: last-write-wins (ON CONFLICT ... DO UPDATE).
--    Simple and defensible for a hackathon. Real ODK/KoboToolbox-style systems
--    use more sophisticated merge — state this clearly if judges ask.
-- =============================================================================

-- reports (same columns as Postgres, UUIDs instead of SERIAL)
CREATE TABLE IF NOT EXISTS reports (
    id             TEXT PRIMARY KEY,             -- UUID, generated client-side
    source         TEXT NOT NULL DEFAULT 'manual'
                   CHECK (source IN ('manual', 'sms_stub')),
    raw_text       TEXT,
    extracted_json TEXT,                         -- stored as JSON string in SQLite
    status         TEXT NOT NULL DEFAULT 'pending_extraction'
                   CHECK (status IN ('pending_extraction', 'extracted', 'confirmed', 'rejected')),
    created_at     TEXT DEFAULT (datetime('now')),
    updated_at     TEXT DEFAULT (datetime('now'))
);

-- sites
CREATE TABLE IF NOT EXISTS sites (
    id                    TEXT PRIMARY KEY,
    report_id             TEXT REFERENCES reports(id) ON DELETE SET NULL,
    location_name         TEXT NOT NULL,
    lat                   REAL NOT NULL,
    lng                   REAL NOT NULL,
    estimated_population  INTEGER NOT NULL DEFAULT 0,
    needs                 TEXT NOT NULL DEFAULT '[]',     -- JSON array as string
    urgency_flags         TEXT NOT NULL DEFAULT '[]',
    confidence            TEXT NOT NULL DEFAULT 'single_unverified'
                          CHECK (confidence IN ('single_unverified', 'corroborated')),
    priority_score        REAL,
    severity              TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical') OR severity IS NULL),
    status                TEXT NOT NULL DEFAULT 'unserved'
                          CHECK (status IN ('unserved', 'planned', 'dispatched', 'delivered')),
    last_report_time      TEXT DEFAULT (datetime('now')),
    created_at            TEXT DEFAULT (datetime('now')),
    updated_at            TEXT DEFAULT (datetime('now'))
);

-- depots (read-only on device — written by admin at setup, not synced back)
CREATE TABLE IF NOT EXISTS depots (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lat  REAL NOT NULL,
    lng  REAL NOT NULL
);

-- inventory
CREATE TABLE IF NOT EXISTS inventory (
    id             TEXT PRIMARY KEY,
    depot_id       TEXT NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
    resource_type  TEXT NOT NULL,
    quantity       INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at     TEXT DEFAULT (datetime('now')),
    UNIQUE (depot_id, resource_type)
);

-- dispatches
CREATE TABLE IF NOT EXISTS dispatches (
    id               TEXT PRIMARY KEY,
    site_id          TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    depot_id         TEXT NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
    resources_loaded TEXT NOT NULL,      -- JSON array as string
    route_geojson    TEXT,
    distance_km      REAL,
    eta_minutes      INTEGER,
    status           TEXT NOT NULL DEFAULT 'planned'
                     CHECK (status IN ('planned', 'en_route', 'delivered')),
    created_at       TEXT DEFAULT (datetime('now')),
    updated_at       TEXT DEFAULT (datetime('now'))
);

-- damaged_roads
CREATE TABLE IF NOT EXISTS damaged_roads (
    id          TEXT PRIMARY KEY,
    lat         REAL NOT NULL,
    lng         REAL NOT NULL,
    reason      TEXT,
    active      INTEGER NOT NULL DEFAULT 1,  -- SQLite has no BOOLEAN; 1=true, 0=false
    reported_at TEXT DEFAULT (datetime('now'))
);

-- sync_queue: tracks every local write that needs to push to central Postgres
CREATE TABLE IF NOT EXISTS sync_queue (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name    TEXT NOT NULL,
    record_id     TEXT NOT NULL,            -- UUID of the record to sync
    operation     TEXT NOT NULL CHECK (operation IN ('insert', 'update')),
    payload_json  TEXT NOT NULL,            -- full record snapshot at time of write
    synced        INTEGER NOT NULL DEFAULT 0,  -- 0=pending, 1=done
    created_at    TEXT DEFAULT (datetime('now'))
);
