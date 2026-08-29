-- =============================================================================
-- MADAD — Seed Data
-- Owner: Yasir Iftikhar (database/)
--
-- Load order (dependency chain — do NOT reorder):
--   support_centers → users → depots → inventory
--
-- reports, sites, dispatches are intentionally LEFT EMPTY at seed time.
-- Those get created LIVE during the demo — watching them appear is the point.
--
-- Default password for all seeded accounts: bilal123
-- Hash: bcrypt, cost factor 12, generated with passlib[bcrypt]
-- Muhammad Ahmad's backend uses passlib[bcrypt] to verify — compatible format.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Support Centers
-- ---------------------------------------------------------------------------
INSERT INTO support_centers (code, name, region, lat, lng) VALUES
    ('RJP-01', 'Rajanpur Support Center',    'Punjab',  29.1042,  70.3295),
    ('MZF-01', 'Muzaffargarh Support Center','Punjab',  30.0720,  71.1929)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Users
-- All passwords = "bilal123"
-- Hash = $2b$12$7vG/1n8WclAL1PP5tA857OfTx0WnVcN0FEfdH3f6YHrx0eIrY5k76
-- ---------------------------------------------------------------------------
INSERT INTO users (center_id, username, password_hash, role) VALUES
    -- Rajanpur center
    (1, 'bilal',   '$2b$12$7vG/1n8WclAL1PP5tA857OfTx0WnVcN0FEfdH3f6YHrx0eIrY5k76', 'coordinator'),
    (1, 'admin_rjp', '$2b$12$7vG/1n8WclAL1PP5tA857OfTx0WnVcN0FEfdH3f6YHrx0eIrY5k76', 'admin'),
    -- Muzaffargarh center
    (2, 'sara',    '$2b$12$7vG/1n8WclAL1PP5tA857OfTx0WnVcN0FEfdH3f6YHrx0eIrY5k76', 'coordinator'),
    (2, 'admin_mzf','$2b$12$7vG/1n8WclAL1PP5tA857OfTx0WnVcN0FEfdH3f6YHrx0eIrY5k76', 'admin')
ON CONFLICT (username) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Depots
-- Rajanpur center: Depot A (closer, main hub), Depot B (further, secondary)
-- Muzaffargarh center: matching two depots
-- ---------------------------------------------------------------------------
INSERT INTO depots (center_id, name, lat, lng) VALUES
    -- Rajanpur
    (1, 'Depot A — Rajanpur Main',     29.0981, 70.3190),   -- ~1.5 km southwest of center
    (1, 'Depot B — Jampur Road',       29.0502, 70.5901),   -- ~35 km east, near Jampur
    -- Muzaffargarh
    (2, 'Depot A — Muzaffargarh Main', 30.0650, 71.1850),
    (2, 'Depot B — Alipur Road',       29.8120, 70.9132)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Inventory
-- Depot A (RJP): full kit — food, water, boats, ambulance, medicine
-- Depot B (RJP): lighter — food, tents (further from flood zone)
-- Muzaffargarh mirrors same pattern.
--
-- resource_type enum: food_packet | water_container | boat | ambulance | tent | medicine_kit
-- ---------------------------------------------------------------------------
INSERT INTO inventory (depot_id, resource_type, quantity) VALUES
    -- Depot A — Rajanpur Main (depot_id = 1)
    (1, 'food_packet',      400),
    (1, 'water_container',  150),
    (1, 'boat',               2),
    (1, 'ambulance',          1),
    (1, 'medicine_kit',      30),
    (1, 'tent',              20),

    -- Depot B — Jampur Road (depot_id = 2)
    (2, 'food_packet',      200),
    (2, 'tent',              60),
    (2, 'water_container',   50),

    -- Depot A — Muzaffargarh Main (depot_id = 3)
    (3, 'food_packet',      350),
    (3, 'water_container',  120),
    (3, 'boat',               1),
    (3, 'ambulance',          1),
    (3, 'medicine_kit',      25),
    (3, 'tent',              30),

    -- Depot B — Alipur Road (depot_id = 4)
    (4, 'food_packet',      180),
    (4, 'tent',              45),
    (4, 'water_container',   40)
ON CONFLICT (depot_id, resource_type) DO NOTHING;

COMMIT;
