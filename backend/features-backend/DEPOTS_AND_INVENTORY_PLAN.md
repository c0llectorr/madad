# Feature Plan: Depots & Resource Inventory Management
**File:** `features-backend/DEPOTS_AND_INVENTORY_PLAN.md`
**Module:** `app.api.routes.depots`, `app.schemas.depot`
**Primary Endpoints:** `GET /api/depots`, `PATCH /api/depots/{id}/inventory`

---

## 1. Feature Overview & Functional Objective
Manages relief supply depots (depot locations, storage facilities, warehouses) and their inventory of relief assets (e.g., `food_packet`, `water_container`, `boat`, `ambulance`, `tent`, `medicine_kit`). Enforces inventory integrity by preventing negative stock balances and strictly exposing the canonical `[{"resource_type": str, "quantity": int}]` resource array format across all wire protocols.

---

## 2. SOLID Architectural Mapping

- **Single Responsibility Principle (SRP):**
  - `routes/depots.py`: Manages depot querying and atomic inventory modifications.
  - `schemas/depot.py`: Encapsulates canonical resource models and quantity delta validations.
- **Open/Closed Principle (OCP):**
  - Resource types are modeled dynamically or via extensible enums so new resource categories (e.g., `solar_generator`, `water_purifier`) can be added without table refactoring.
- **Liskov Substitution Principle (LSP):**
  - All inventory updates inherit standard inventory transactional constraints.
- **Interface Segregation Principle (ISP):**
  - Read endpoints provide full depot summaries (`id`, `name`, `lat`, `lng`, `inventory`); mutation endpoints receive only targeted delta adjustments (`resource_type`, `quantity_delta`).
- **Dependency Inversion Principle (DIP):**
  - Depots routes rely on injected database transaction sessions ensuring ACID compliance during stock modifications.

---

## 3. Canonical Resource Contract Rule
> **MANDATORY WIRE FORMAT:** Any list of resources/inventory in any request or response is ALWAYS an array of objects:
> `[{"resource_type": "string", "quantity": "integer"}]`
> Never expose a `{resource_type: quantity}` dictionary in request/response payloads.

---

## 4. API Contract Specifications

### `GET /api/depots?center_id=3`
- **Query Parameters:**
  - `center_id`: `integer, optional`
- **Success `200 OK` (`List[DepotResponse]`):**
  ```json
  [
    {
      "id": 1,
      "name": "Depot A",
      "lat": 29.08,
      "lng": 70.30,
      "inventory": [
        { "resource_type": "food_packet", "quantity": 400 },
        { "resource_type": "water_container", "quantity": 300 },
        { "resource_type": "boat", "quantity": 2 },
        { "resource_type": "ambulance", "quantity": 1 }
      ]
    },
    {
      "id": 2,
      "name": "Depot B",
      "lat": 29.20,
      "lng": 70.45,
      "inventory": [
        { "resource_type": "food_packet", "quantity": 600 },
        { "resource_type": "tent", "quantity": 150 }
      ]
    }
  ]
  ```

### `PATCH /api/depots/{id}/inventory`
- **Request (`InventoryUpdateRequest`):**
  ```json
  {
    "resource_type": "food_packet",
    "quantity_delta": -50
  }
  ```
- **Success `200 OK` (`InventoryItemResponse`):**
  ```json
  {
    "resource_type": "food_packet",
    "quantity": 350
  }
  ```
- **Errors:**
  - `404 Not Found`: Depot or resource item does not exist.
  - `409 Conflict`: `{"detail": "Insufficient inventory, cannot go below zero"}` when `quantity + quantity_delta < 0`.
  - `422 Unprocessable Entity`: Validation failure on missing fields or zero delta.

---

## 5. Edge Cases & Exception Handling

| Edge Case / Failure Mode | Root Cause | Handling Strategy & Mitigation |
| :--- | :--- | :--- |
| **Negative Inventory Request** | Coordinator or automated loop requests more stock than currently available. | Calculate `new_quantity = current_quantity + quantity_delta`. If `new_quantity < 0`, immediately raise `HTTPException(status_code=409, detail="Insufficient inventory, cannot go below zero")`. |
| **Concurrent Inventory Decrements (Race Condition)** | Two coordinators dispatching from Depot A simultaneously. | Use PostgreSQL row-level locking: `SELECT ... FOR UPDATE` on the specific `inventory` row during the transaction. This guarantees serialization and prevents double-spending. |
| **Resource Type Not Present in Depot** | Requesting adjustment on a resource type not yet stocked at that depot. | For negative delta: return `409 Conflict`. For positive delta (adding new stock): initialize new `inventory` row with `quantity = quantity_delta`. |
| **Depot with No Inventory Items** | Newly provisioned relief depot. | `GET /api/depots` returns empty array for `inventory: []` rather than `null`. |

---

## 6. Implementation Steps & Verification Plan

1. **Schemas:** Create `app/schemas/depot.py` defining `ResourceItem`, `DepotResponse`, and `InventoryUpdateRequest`.
2. **Atomic Inventory Service:** Implement transactional balance check and update logic with `SELECT ... FOR UPDATE`.
3. **Route Handlers:** Implement `GET /api/depots` and `PATCH /api/depots/{id}/inventory` in `app/api/routes/depots.py`.
4. **Unit & Concurrency Tests:** Verify negative delta rejection (409), positive delta restocking, and row-locking under parallel decrement requests.
