-- =============================================================================
-- MADAD — Central PostgreSQL Schema
-- Owner: Yasir Iftikhar (database/)
-- Target: PostgreSQL 14+ (Alibaba Cloud ApsaraDB for prod; local PostgreSQL for dev)
--
-- RULES (read before writing any query against these tables):
--   1. Never hard-delete report, site, or dispatch rows — use status transitions.
--   2. inventory.quantity must never go negative (enforced at DB level + backend).
--   3. sites.status is one-directional: unserved → planned → dispatched → delivered.
--      Only backward transition: planned → unserved (dispatch cancelled before departure).
--   4. Dispatch creation must ALWAYS happen in one transaction:
--      inventory decrement + sites.status update + dispatches INSERT — all or nothing.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- support_centers
-- ---------------------------------------------------------------------------
CREATE TABLE support_centers (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(20)  UNIQUE NOT NULL,    -- e.g. 'RJP-01'
    name        VARCHAR(120) NOT NULL,
    region      VARCHAR(80),
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id             SERIAL PRIMARY KEY,
    center_id      INTEGER NOT NULL REFERENCES support_centers(id) ON DELETE CASCADE,
    username       VARCHAR(60) UNIQUE NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    role           VARCHAR(20) NOT NULL DEFAULT 'coordinator'
                   CHECK (role IN ('coordinator', 'admin')),
    created_at     TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- sites
-- ---------------------------------------------------------------------------
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
    -- NOTE: 'en_route' is intentionally NOT a site status. It exists only on dispatches.status.
    -- A site set to 'dispatched' means "do not touch in replanning," regardless of whether the
    -- associated dispatch has since progressed to en_route or delivered.
    last_report_time      TIMESTAMPTZ DEFAULT now(),
    created_at            TIMESTAMPTZ DEFAULT now(),
    updated_at            TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- depots
-- ---------------------------------------------------------------------------
CREATE TABLE depots (
    id          SERIAL PRIMARY KEY,
    center_id   INTEGER NOT NULL REFERENCES support_centers(id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- inventory
-- ---------------------------------------------------------------------------
CREATE TABLE inventory (
    id             SERIAL PRIMARY KEY,
    depot_id       INTEGER NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
    resource_type  VARCHAR(40) NOT NULL,
    -- Valid resource_type values: 'food_packet' | 'water_container' | 'boat' |
    --                             'ambulance' | 'tent' | 'medicine_kit'
    quantity       INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at     TIMESTAMPTZ DEFAULT now(),
    UNIQUE (depot_id, resource_type)
);

-- ---------------------------------------------------------------------------
-- dispatches
-- ---------------------------------------------------------------------------
CREATE TABLE dispatches (
    id               SERIAL PRIMARY KEY,
    center_id        INTEGER NOT NULL REFERENCES support_centers(id) ON DELETE CASCADE,
    site_id          INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    depot_id         INTEGER NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
    resources_loaded JSONB NOT NULL,
    -- Shape: [{"resource_type": "food_packet", "quantity": 50}, ...]
    -- ALWAYS array-of-objects, never a dict — matches API_CONTRACT.md canonical resource shape.
    route_geojson    JSONB,
    distance_km      DOUBLE PRECISION,
    eta_minutes      INTEGER,
    status           VARCHAR(20) NOT NULL DEFAULT 'planned'
                     CHECK (status IN ('planned', 'en_route', 'delivered')),
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- damaged_roads
-- ---------------------------------------------------------------------------
CREATE TABLE damaged_roads (
    id            SERIAL PRIMARY KEY,
    center_id     INTEGER NOT NULL REFERENCES support_centers(id) ON DELETE CASCADE,
    lat           DOUBLE PRECISION NOT NULL,
    lng           DOUBLE PRECISION NOT NULL,
    reason        VARCHAR(200),
    active        BOOLEAN NOT NULL DEFAULT true,
    reported_at   TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- Added now rather than retroactively — judges will be watching live queries.
-- ---------------------------------------------------------------------------
CREATE INDEX idx_sites_center_status      ON sites(center_id, status);
CREATE INDEX idx_dispatches_center_status ON dispatches(center_id, status);
CREATE INDEX idx_reports_center_status    ON reports(center_id, status);