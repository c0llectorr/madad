# Feature Plan: Dispatch Management & Transactional State Machine
**File:** `features-backend/DISPATCH_MANAGEMENT_PLAN.md`
**Module:** `app.api.routes.dispatch`, `app.services.routing`, `app.schemas.dispatch`
**Primary Endpoints:** `POST /api/dispatch`, `PATCH /api/dispatch/{id}/status`

---

## 1. Feature Overview & Functional Objective
Executes confirmed relief dispatches from depots to affected sites. Acts as the system's strict transactional boundary: simultaneously deducts inventory from depot stock, calculates damage-avoiding route and ETA, creates the dispatch manifest, and sets site status to `planned`. Enforces a forward-only status state machine (`planned` $\to$ `en_route` $\to$ `delivered`) to track field execution.

---

## 2. SOLID Architectural Mapping

- **Single Responsibility Principle (SRP):**
  - `routes/dispatch.py`: Coordinates the HTTP lifecycle, executes the atomic ACID transaction block, and validates state machine transitions.
  - `services/routing.py`: Computes route geometry, distance, and ETA for the dispatch manifest.
  - `schemas/dispatch.py`: Defines request/response models and validates resource list schemas.
- **Open/Closed Principle (OCP):**
  - Status transition hooks (e.g., driver SMS notification, telemetry logging) can attach as event subscribers without modifying the core transaction logic.
- **Liskov Substitution Principle (LSP):**
  - All status transitions conform to a formal finite state machine (FSM) validator.
- **Interface Segregation Principle (ISP):**
  - Resource manifests strictly utilize `List[ResourceItem]`, isolating dispatch consumers from internal table layout.
- **Dependency Inversion Principle (DIP):**
  - Route handlers inject the database session dependency with explicit commit/rollback controls.

---

## 3. Atomic ACID Transaction Specification

```
BEGIN TRANSACTION;
  1. Acquire row lock on Depot inventory:
     SELECT quantity FROM inventory WHERE depot_id = :depot_id AND resource_type = :res_type FOR UPDATE;
  
  2. Verify all requested quantities <= available quantities:
     IF any(requested > available) THEN
       ROLLBACK;
       RAISE 409 Conflict ("Insufficient inventory for one or more resources");
     END IF;

  3. Deduct requested quantities:
     UPDATE inventory SET quantity = quantity - :req_qty WHERE depot_id = :depot_id AND resource_type = :res_type;

  4. Compute route and ETA via routing service (damage-aware).

  5. Insert Dispatch record:
     INSERT INTO dispatches (site_id, depot_id, resources_loaded, route_geojson, eta_minutes, status, created_at)
     VALUES (:site_id, :depot_id, :resources_json, :route_geojson, :eta_minutes, 'planned', NOW())
     RETURNING id;

  6. Update Site status:
     UPDATE sites SET status = 'planned' WHERE id = :site_id;
COMMIT;
```

---

## 4. API Contract Specifications

### `POST /api/dispatch`
- **Request (`DispatchCreateRequest`):**
  ```json
  {
    "site_id": 17,
    "depot_id": 1,
    "resources": [
      { "resource_type": "boat", "quantity": 1 },
      { "resource_type": "food_packet", "quantity": 50 }
    ]
  }
  ```
- **Success `201 Created` (`DispatchResponse`):**
  ```json
  {
    "dispatch_id": 9,
    "status": "planned",
    "route": {
      "geojson": {
        "type": "LineString",
        "coordinates": [[70.30, 29.08], [70.38, 29.15]]
      },
      "distance_km": 14.2
    },
    "eta_minutes": 38
  }
  ```
- **Errors:**
  - `404 Not Found`: Site or Depot ID does not exist.
  - `409 Conflict`: `{"detail": "Insufficient inventory for one or more resources"}`.

### `PATCH /api/dispatch/{id}/status`
- **Request (`DispatchStatusUpdateRequest`):**
  ```json
  {
    "status": "en_route"
  }
  ```
- **Success `200 OK` (`DispatchStatusResponse`):**
  ```json
  {
    "dispatch_id": 9,
    "status": "en_route"
  }
  ```
- **Status State Machine Rules:**
  - Allowed forward paths: `planned` $\to$ `en_route` $\to$ `delivered`.
  - When transitioning to `en_route`: update `sites.status = 'dispatched'`.
  - When transitioning to `delivered`: update `sites.status = 'delivered'`.
- **Errors:**
  - `422 Unprocessable Entity`: `{"detail": "Cannot transition status backward"}` (e.g. `delivered` $\to$ `en_route` or `delivered` $\to$ `planned`).

---

## 5. Edge Cases & Exception Handling

| Edge Case / Failure Mode | Root Cause | Handling Strategy & Mitigation |
| :--- | :--- | :--- |
| **Partial Inventory Shortage** | Depot has 50 food packets but lacks requested boat. | Entire transaction is aborted and rolled back. No partial deduction or phantom dispatch is created. Return `409 Conflict`. |
| **Simultaneous Dispatch of Same Resource** | Two coordinators click "Dispatch" on the last remaining boat at the same second. | `SELECT ... FOR UPDATE` row locking forces one request to wait. The second evaluates post-deduction stock (0 boats) and fails cleanly with `409 Conflict`. |
| **Backward Status Transition Attempt** | Accidental UI click attempting to revert a delivered dispatch to en-route. | FSM validation table `{ "planned": ["en_route"], "en_route": ["delivered"], "delivered": [] }`. If `new_status` not in `FSM[current_status]`, return `422 Unprocessable Entity`. |
| **Dispatch to Already Served Site** | Coordinator attempts to dispatch supplies to a site already marked `delivered`. | Check `site.status`. If `site.status == 'delivered'`, return `409 Conflict: {"detail": "Site has already been delivered and served"}`. |
| **Routing Graph Failure during Dispatch** | Route service encounters temporary graph parsing error. | Transaction is rolled back before commit so inventory is preserved. |

---

## 6. Implementation Steps & Verification Plan

1. **Schemas:** Create `DispatchCreateRequest`, `DispatchResponse`, `DispatchStatusUpdateRequest` in `app/schemas/dispatch.py`.
2. **Transactional Route Handler:** Implement `POST /api/dispatch` in `app/api/routes/dispatch.py` ensuring atomic multi-table transaction with rollback handlers.
3. **Status State Machine Handler:** Implement `PATCH /api/dispatch/{id}/status` with strict FSM progression and cascading `site.status` synchronization.
4. **Integration & Concurrency Tests:**
   - Test full successful dispatch lifecycle (`planned` $\to$ `en_route` $\to$ `delivered`).
   - Test stock depletion rollback on insufficient inventory (assert 0 rows written).
   - Test invalid backward status rejection (422).
