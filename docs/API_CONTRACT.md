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

Full request/response JSON shapes for every endpoint above are documented in Section 2 of `MADAD_BACKEND.md` and `MADAD_FRONTEND.md` — this table is the quick-reference index, not the full spec. When in doubt, treat `MADAD_BACKEND.md` Section 2 as authoritative, since it's owned by the person implementing the responses.
