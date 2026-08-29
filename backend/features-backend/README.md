# MADAD Backend Feature Implementation Plans Index
**Architecture Standard:** SOLID Principles & Single Source of Truth (`API_CONTRACT.md`)

This directory contains the individual feature implementation plans, edge case analyses, and exception handling specifications for the MADAD disaster relief coordination backend:

| Feature Plan | Focus & Scope | Core Endpoints |
| :--- | :--- | :--- |
| **[`AUTH_AND_CENTERS_PLAN.md`](./AUTH_AND_CENTERS_PLAN.md)** | Multi-tenant auth, JWT token lifecycle, center isolation | `POST /api/auth/login`<br>`GET /api/centers` |
| **[`REPORT_INGESTION_AND_EXTRACTION_PLAN.md`](./REPORT_INGESTION_AND_EXTRACTION_PLAN.md)** | SMS/form ingestion, Qwen function calling, fuzzy gazetteer geocoding, coordinator verification | `POST /api/reports`<br>`POST /api/reports/{id}/extract`<br>`PATCH /api/reports/{id}`<br>`GET /api/reports` |
| **[`SITES_AND_PRIORITIZATION_PLAN.md`](./SITES_AND_PRIORITIZATION_PLAN.md)** | Deterministic scoring engine, urgency weighting, time decay, transparent reasoning formatter | `GET /api/sites` |
| **[`DEPOTS_AND_INVENTORY_PLAN.md`](./DEPOTS_AND_INVENTORY_PLAN.md)** | Depot inventory balances, canonical resource array wire shape, negative stock protection | `GET /api/depots`<br>`PATCH /api/depots/{id}/inventory` |
| **[`ROAD_DAMAGE_AND_ROUTING_PLAN.md`](./ROAD_DAMAGE_AND_ROUTING_PLAN.md)** | OSMnx/NetworkX graph routing, impassable edge removal, travel time weights, detour delta calculation | `POST /api/roads/damage`<br>`GET /api/roads/damaged`<br>`GET /api/routes` |
| **[`ALLOCATION_PLANNING_AND_REPLANNING_PLAN.md`](./ALLOCATION_PLANNING_AND_REPLANNING_PLAN.md)** | Greedy resource-to-site matching, dynamic replan diffing, unstarted site filtering | `POST /api/plan/generate`<br>`POST /api/plan/replan` |
| **[`DISPATCH_MANAGEMENT_PLAN.md`](./DISPATCH_MANAGEMENT_PLAN.md)** | ACID multi-table dispatch execution, inventory decrement, forward-only status state machine | `POST /api/dispatch`<br>`PATCH /api/dispatch/{id}/status` |
