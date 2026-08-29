# Extensive Integration & Testing Plan: MADAD (Full Application Flow)

## Executive Summary
This plan integrates **React Native/Expo frontend**, **FastAPI backend**, and **PostgreSQL** into a working prototype for end-to-end testing.

---

## Quick Start (PostgreSQL)

### Option A — Docker (recommended if local Postgres password differs)

```bash
# From project root — starts Postgres on port 5432 with schema + seed applied
docker compose up -d

# Wait until healthy, then start backend
cd backend
venv\Scripts\activate          # Windows
python -m uvicorn app.main:app --reload --port 8000
```

### Option B — Existing PostgreSQL installation

1. Create database: `CREATE DATABASE madad;`
2. Run schema: `psql -U postgres -d madad -f database/postgres/migrations/001_initial.sql`
3. Run seed: `psql -U postgres -d madad -f database/postgres/seed_data.sql`
4. Set `DATABASE_URL` in `.env` / `backend/.env` to match your credentials
5. Start backend (tables also auto-create on startup via SQLAlchemy if empty)

### Frontend

```bash
cd frontend
# frontend/.env already points to live API:
#   EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api
#   EXPO_PUBLIC_USE_MOCK=false
npm start
```

**Physical device:** set `EXPO_PUBLIC_API_BASE_URL` to your PC LAN IP.  
**Android emulator:** use `http://10.0.2.2:8000/api`.

### Login credentials

| Center | Code   | Username | Password  |
|--------|--------|----------|-----------|
| Rajanpur | RJP-01 | bilal    | bilal123  |

### Verify integration

```bash
python test_e2e_integration.py
```

---

## Complete End-to-End System Architecture

(See sequence diagram in original plan — login → reports → extract → confirm → plan → dispatch.)

---

## Integration Phases

### Phase 1: Frontend Live API (`frontend/.env`)
```env
EXPO_PUBLIC_API_BASE_URL="http://localhost:8000/api"
EXPO_PUBLIC_USE_MOCK="false"
```

### Phase 2: API contract verification
All routes in `docs/API_CONTRACT.md` — run `python test_e2e_integration.py` after backend is up.

### Phase 3: Manual UI walkthrough
1. Login (RJP-01 / bilal / bilal123)
2. Dashboard → Pending Reports → Process → Confirm
3. Manual report entry (FAB +)
4. Map → view sites/depots
5. Allocation Plan → Dispatch → status updates

---

## Environment files (created)

| File | Purpose |
|------|---------|
| `.env` | Root config (DATABASE_URL, JWT, Groq) |
| `backend/.env` | Backend overrides when run from `backend/` |
| `frontend/.env` | Live API URL, mock disabled |
