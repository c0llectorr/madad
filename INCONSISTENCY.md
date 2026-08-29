# MADAD — Codebase Inconsistency & Contract Audit Analysis

## Overview
This document contains a comprehensive analysis of all current inconsistencies, architectural deviations, database schema mismatches, API contract violations, and naming discrepancies across the **MADAD** codebase (`backend/`, `frontend/`, `database/`, `docs/`, and root configurations).

> [!IMPORTANT]
> **Project Name Directive**: The official name of this project is strictly **MADAD** (no taglines, suffixes, or extensions attached).

---

## 1. Project Naming & Branding Inconsistencies

| File Location | Current Value / Pattern | Required Standard | Impact & Description |
| :--- | :--- | :--- | :--- |
| `backend/app/core/config.py` | `PROJECT_NAME: str = "MADAD Disaster Relief Coordination Backend"` | `PROJECT_NAME: str = "MADAD"` | App title string appends extra backend tagline in OpenAPI specs and logs. |
| `backend/app/main.py` | `"service": "madad-backend"` in `/health` | `"service": "MADAD"` | Health check payload appends extra suffix. |
| `README.md` | `# **MADAD** \n AI-assisted disaster relief coordination system...` | `# MADAD` | Root README contains descriptive tagline in title header. |
| `PROJECT_OVERVIEW.md` | `# MADAD Project Overview` | `# MADAD` | Overview document header contains extra description. |
| `test_configuration.py` | `"MADAD Disaster Relief Coordination Backend"` | `"MADAD"` | Test suite references old backend descriptive name. |
| `database/README.md` & `MADAD_DATABASE.md` | `# MADAD — Database Layer` | `# MADAD` | Database documentation appends section tagline. |
| `frontend/README.md` & `MADAD_FRONTEND.md` | `# MADAD Frontend` | `# MADAD` | Frontend documentation appends component suffix. |

---

## 2. Database Schema vs. SQLAlchemy Models Mismatch

### Critical Schema Divergences

#### A. Table Name Mismatch: `support_centers` vs `centers`
* **PostgreSQL Schema (`database/postgres/schema.sql`)**: Defines table name as `support_centers`.
* **SQLAlchemy Models (`backend/app/db/models.py`)**: Defines `__tablename__ = "centers"`.
* **Impact**: Raw SQL queries or foreign keys referencing `support_centers` fail when executed against SQLAlchemy-created SQLite/PostgreSQL instances where the table is named `centers`.
* **Fix**: Standardize table name across `schema.sql` and `models.py` to `support_centers` (or `centers`).

#### B. Column Name Mismatch: `extracted_json` vs `extracted_data`
* **PostgreSQL Schema (`database/postgres/schema.sql`)**: Defines column `reports.extracted_json JSONB`.
* **SQLAlchemy Models (`backend/app/db/models.py`)**: Defines `Report.extracted_data Column(Text)`.
* **Impact**: Database queries expecting `extracted_json` fail or produce `AttributeError`/`UndefinedColumnError`.

#### C. Missing Foreign Keys & Columns in SQLAlchemy Models
* **`sites.report_id`**: Defined as `INTEGER REFERENCES reports(id) ON DELETE SET NULL` in `schema.sql`, but completely missing from SQLAlchemy `Site` model in `models.py`.
* **`dispatches.center_id`**: Defined as `INTEGER NOT NULL REFERENCES support_centers(id)` in `schema.sql`, but missing from SQLAlchemy `Dispatch` model in `models.py`.
* **Timestamps (`updated_at`)**: `schema.sql` contains `updated_at TIMESTAMPTZ` on `reports`, `sites`, `inventory`, `dispatches`. SQLAlchemy models in `models.py` omit `updated_at` entirely.

#### D. Database Constraints Missing in SQLAlchemy Models
* **`inventory` Constraints**: PostgreSQL schema enforces `CHECK (quantity >= 0)` and `UNIQUE (depot_id, resource_type)`. SQLAlchemy `Inventory` model lacks both `CheckConstraint('quantity >= 0')` and `UniqueConstraint('depot_id', 'resource_type')`.
* **Indexes**: `schema.sql` creates composite indexes `idx_sites_center_status`, `idx_dispatches_center_status`, `idx_reports_center_status`. SQLAlchemy models omit these composite index definitions.

#### E. Status Enum Value Inconsistencies
* **`Report.status`**:
  * PostgreSQL Schema: `CHECK (status IN ('pending_extraction', 'extracted', 'confirmed', 'rejected'))`
  * SQLAlchemy Model & Routes: Only uses `'pending_extraction'`, `'confirmed'`, `'rejected'` (bypasses `'extracted'`).
  * API Contract: Documents `'pending_extraction'`, `'confirmed'`.

---

## 3. Backend Implementation vs. API Contract (`docs/API_CONTRACT.md`)

| Endpoint | API Contract Requirement | Backend Implementation (`app/api/routes/`) | Status / Inconsistency |
| :--- | :--- | :--- | :--- |
| `POST /api/dispatch` | Must execute in a single ACID transaction (Inventory lock `FOR UPDATE` + Inventory decrement + Site status `planned` + Dispatch record insertion). | `dispatch.py` performs sequential queries without `FOR UPDATE` row locks or an explicit `with db.begin():` block. | **High**: Risk of race conditions during concurrent dispatches. |
| `POST /api/dispatch` | `Dispatch` record requires `center_id`. | `dispatch.py` does not pass `center_id` when creating `Dispatch` model because model lacks the column. | **High**: Multi-tenant center isolation broken on dispatch records. |
| `POST /api/reports` | Returns `201 Created` with `{ "report_id": int, "status": "pending_extraction" \| "confirmed" }`. | `reports.py` returns `ReportCreateResponse` correctly. | **Compliant** |
| `PATCH /api/reports/{id}` | Enforces deduplication / corroboration logic for sites within 500m. | `reports.py` checks `Site.location_name.ilike(...)` instead of spatial distance check. | **Medium**: Sub-optimal location matching during report confirmation. |
| `POST /api/plan/replan` | Replan engine returns `unchanged: int[]` (array of site IDs). | `replanning.py` constructs `ReplanResponse` with site ID list. | **Compliant** |
| `POST /api/plan/replan` | `old_rank` in `ReplanChange` should reflect actual previous rank. | `replanning.py` uses dummy `old_rank = max(1, new_rank - 1)`. | **Medium**: Rank deltas in replan diff are artificial. |
| `GET /api/routes` | Returns `404 Not Found` with `{"detail": "No route found..."}` if graph is disconnected. | `routing.py` uses a synthetic geometric fallback router when OSMnx graph is missing rather than raising graph disconnection errors. | **Medium**: Hides true graph disconnection states in mock mode. |

---

## 4. Frontend & Mock Layer Inconsistencies

### A. Mock Data vs. Production Seed Data Mismatch
* **Location & Center Data**: Frontend mock layer (`frontend/src/mocks/auth.mock.ts`, `depots.mock.ts`, `roads.mock.ts`) uses Islamabad, Rawalpindi, and Karachi centers.
* **Backend Seed Data (`database/postgres/seed_data.sql`)**: Uses Rajanpur (`RJP-01`) and Muzaffargarh (`MZF-01`).
* **Impact**: Switching `EXPO_PUBLIC_USE_MOCK=false` causes UI data to completely shift regions and IDs.

### B. Missing Endpoint Clients / Type Mismatches
* **Resource Wire Format**: API contract mandates canonical resource shape `[{"resource_type": "string", "quantity": number}]`. Frontend `frontend/src/types/index.ts` enforces this interface (`Resource`), but some internal components in `AllocationPlanScreen.tsx` attempt to parse resource dictionaries if mock data is malformed.
* **React Native Maps Provider**: `MapScreen.tsx` uses OpenStreetMap tile overlay via `UrlTile`. `provider={null}` must be explicitly maintained to prevent fallback to Google Maps API on Android devices without API keys.

---

## 5. Test Suite & Code Quality Inconsistencies

### A. SQLAlchemy 2.0 Syntax Error in `test_configuration.py`
* **File**: `test_configuration.py` (Line 143)
* **Code**: `result = db.execute("SELECT 1")`
* **Issue**: SQLAlchemy 2.0 requires executable queries to be wrapped in `sqlalchemy.text()`, i.e., `db.execute(text("SELECT 1"))`. Passing a raw string raises `sqlalchemy.exc.ObjectNotExecutableError`.

### B. Inconsistent Import Patterns
* **Backend**: Mixed import strategies between relative imports (`from app.db.models import Site`) and absolute/parent system path manipulation (`sys.path.insert(0, ...)` in `geocoding.py`).

---

## 6. Actionable Resolution Priority Order

1. **Immediate (Critical)**:
   - Normalize project branding to **MADAD** across all files and settings.
   - Synchronize PostgreSQL `schema.sql` and SQLAlchemy `models.py` (table names, column names, missing foreign keys `report_id`, `center_id`, and `updated_at` columns).
   - Fix `test_configuration.py` raw SQL execution query with `text("SELECT 1")`.

2. **Short-Term (High Priority)**:
   - Implement row locking (`FOR UPDATE`) and explicit transaction blocks in `backend/app/api/routes/dispatch.py`.
   - Update frontend mock data in `frontend/src/mocks/` to use Rajanpur (`RJP-01`) data to match backend seed data.
   - Calculate accurate previous rank deltas in `ReplanningService.replan()`.

3. **Medium-Term (Code Quality & Robustness)**:
   - Enforce database check constraints (`quantity >= 0`) and composite indexes in SQLAlchemy models.
   - Standardize geocoding distance-based corroboration in `reports.py`.

---
*Audit completed for MADAD project.*