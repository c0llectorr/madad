# Mock API Layer

Intercepts every outgoing HTTP call made by the app and returns local data
instead of hitting a real backend. Nothing in the app's hooks, API files, or
components needs to change — the mock adapter sits transparently below the
entire API layer.

## How it works

```bash
app/_layout.tsx
  └─ if EXPO_PUBLIC_USE_MOCK === 'true'
       └─ setupMocks()          ← src/mocks/index.ts
            └─ MockAdapter(apiClient)
                 └─ intercepts all axios requests on the shared apiClient
```

[`axios-mock-adapter`](https://github.com/ctimmerm/axios-mock-adapter) is
attached directly to the `apiClient` axios instance defined in
`src/api/client.ts`. Every route registered in `setupMocks()` matches the
same URL patterns the real API files use, so swapping in the real backend
requires only changing the env flag.

## Turning mock mode on / off

In `frontend/.env`:

```bash
EXPO_PUBLIC_USE_MOCK=true   # all requests handled locally
EXPO_PUBLIC_USE_MOCK=false  # requests go to EXPO_PUBLIC_API_BASE_URL
```

**Do not commit `.env` with `USE_MOCK=true` to production branches.**
`.env.example` is the reference template for onboarding new developers.

## File structure

```bash
src/mocks/
  index.ts            ← central handler; call setupMocks() once at boot
  auth.mock.ts        ← LoginResponse, Center[]
  reports.mock.ts     ← ReportListItem[], ExtractReportResponse, CreateReportResponse
  sites.mock.ts       ← Site[]
  depots.mock.ts      ← Depot[] with inventory
  dispatch.mock.ts    ← CreateDispatchResponse (x2)
  plan.mock.ts        ← GeneratePlanResponse, ReplanResponse
  roads.mock.ts       ← DamagedRoad[], RouteResponse (per depot/site pair)
  README.md           ← this file
```

## Endpoints handled

| Method | Path                    | Notes                                                                     |
| ------ | ----------------------- | ------------------------------------------------------------------------- |
| POST   | `/auth/login`           | Accepts any credentials; returns coordinator session                      |
| GET    | `/centers`              | Returns 3 centers (ISB, LHR, KHI)                                         |
| GET    | `/reports`              | Filterable by `?status=`                                                  |
| POST   | `/reports`              | Adds to in-memory list; manual reports also create a site                 |
| POST   | `/reports/:id/extract`  | Report 2 returns `geocode_status: unmatched` to exercise pin-drop         |
| PATCH  | `/reports/:id`          | Confirm/reject; confirmed reports create a new site                       |
| GET    | `/sites`                | Filterable by `?status=`                                                  |
| GET    | `/depots`               | Returns 2 depots with full inventory                                      |
| PATCH  | `/depots/:id/inventory` | Adjusts quantity in-memory; floors at 0                                   |
| POST   | `/dispatch`             | Creates dispatch, deducts depot inventory, marks site as `dispatched`     |
| PATCH  | `/dispatch/:id/status`  | Updates status; `delivered` marks first dispatched site as `delivered`    |
| POST   | `/plan/generate`        | Returns the full 4-allocation mock plan                                   |
| POST   | `/plan/replan`          | Returns the mock replan that promotes site 4                              |
| GET    | `/roads/damaged`        | Returns 3 pre-seeded damaged road markers                                 |
| POST   | `/roads/damage`         | Adds a new marker to in-memory list                                       |
| GET    | `/routes`               | Looks up by `from_depot_id` + `to_site_id`; falls back to a generic route |

## In-memory state

`setupMocks()` initialises mutable arrays for `reports`, `sites`, `depots`,
and `damagedRoads`. Mutations (POST / PATCH) update these arrays in-memory,
so subsequent GET calls within the same session reflect the changes — no
persistence across reloads.

Pre-seeded data at startup:

| Domain        | Seed data                                                    |
| ------------- | ------------------------------------------------------------ |
| Reports       | 4 reports across all statuses                                |
| Sites         | 4 sites (2 × unserved, 1 × in_progress, 1 × unserved/medium) |
| Depots        | 2 depots — Islamabad (Alpha) and Rawalpindi (Beta)           |
| Damaged roads | 3 markers around Islamabad/Rawalpindi                        |

## Adding a new endpoint

1. Add the mock response shape to the relevant `*.mock.ts` file (or create
   a new one if the domain doesn't exist yet).
2. Register the handler in `src/mocks/index.ts` inside `setupMocks()`,
   following the existing pattern.
3. That's it — no changes needed anywhere else in the app.

## Switching to the real backend

1. Set `EXPO_PUBLIC_USE_MOCK=false` in `.env`.
2. Set `EXPO_PUBLIC_API_BASE_URL` to the backend address.
3. Rebuild or restart Metro — the `require('../src/mocks')` call in
   `_layout.tsx` is guarded by the env check and will not run.

The mock files themselves can stay in the repo indefinitely; they are
dev-only and are never bundled in production builds because the
`require()` call is dead code when `EXPO_PUBLIC_USE_MOCK !== 'true'`.
