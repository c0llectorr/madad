# Feature Plan: Road Damage Tracking & Dynamic Graph Routing
**File:** `features-backend/ROAD_DAMAGE_AND_ROUTING_PLAN.md`
**Module:** `app.api.routes.roads`, `app.services.routing`, `app.schemas.road`
**Primary Endpoints:** `POST /api/roads/damage`, `GET /api/roads/damaged`, `GET /api/routes`

---

## 1. Feature Overview & Functional Objective
Maintains the live operational status of the road and bridge network across the disaster district. Loads OpenStreetMap routable graphs (`OSMnx` / `NetworkX`), dynamically prunes impassable road segments (e.g. submerged bridges, washed-out causeways), and computes damage-aware shortest routes using travel-time edge weights. Computes the explicit `delta_minutes_vs_direct` delta to provide command post coordinators with complete routing visibility.

---

## 2. SOLID Architectural Mapping

- **Single Responsibility Principle (SRP):**
  - `services/routing.py`: Exclusively encapsulates graph loading, edge weighting (`travel_time`), damage node/edge snapping, shortest-path calculation (`NetworkX`), and GeoJSON conversion.
  - `routes/roads.py`: Handles HTTP endpoints for damage reporting and route inspection.
  - `schemas/road.py`: Defines request/response models for damage points and route geometries.
- **Open/Closed Principle (OCP):**
  - Graph loaders and routing algorithms are decoupled; Dijkstra or A* or alternative routing engines (e.g. OSRM / Valhalla) can be swapped without touching API route signatures.
- **Liskov Substitution Principle (LSP):**
  - Graph providers fulfill a standard `RouteProvider` interface returning distance, ETA, GeoJSON geometries, and obstruction deltas.
- **Interface Segregation Principle (ISP):**
  - Routes accept straightforward depot and site IDs; callers do not need to understand OSM node IDs or NetworkX edge tuples.
- **Dependency Inversion Principle (DIP):**
  - Routing services load pre-seeded graph models via path configurations without hardcoding filesystem locations in business routes.

---

## 3. Core Graph Routing Specification

```python
import osmnx as ox
import networkx as nx

GRAPH_PATH = "../database/geodata/demo_region.graphml"

def load_graph(graph_path: str = GRAPH_PATH):
    G = ox.load_graphml(graph_path)
    G = ox.add_edge_speeds(G)
    G = ox.add_edge_travel_times(G)  # Adds 'travel_time' attribute to every edge
    return G

def apply_damage(G, damaged_points: list[tuple[float, float]]):
    G_damaged = G.copy()
    for lat, lng in damaged_points:
        # CRITICAL: OSMnx takes (X=lng, Y=lat) coordinate order
        u, v, key = ox.nearest_edges(G_damaged, lng, lat)
        if G_damaged.has_edge(u, v, key):
            G_damaged.remove_edge(u, v, key)
    return G_damaged

def compute_route(G, origin: tuple[float, float], dest: tuple[float, float]):
    # Note coordinate order: X=lng, Y=lat
    orig_node = ox.nearest_nodes(G, origin[1], origin[0])
    dest_node = ox.nearest_nodes(G, dest[1], dest[0])
    
    path = nx.shortest_path(G, orig_node, dest_node, weight="travel_time")
    return path
```

---

## 4. API Contract Specifications

### `POST /api/roads/damage`
- **Request (`RoadDamageCreateRequest`):**
  ```json
  {
    "center_id": 3,
    "lat": 29.12,
    "lng": 70.35,
    "reason": "Bridge 7 submerged under 4ft floodwater"
  }
  ```
- **Success `201 Created` (`RoadDamageResponse`):**
  ```json
  {
    "id": 5,
    "active": true
  }
  ```

### `GET /api/roads/damaged?center_id=3`
- **Success `200 OK` (`List[RoadDamageItem]`):**
  ```json
  [
    {
      "id": 5,
      "lat": 29.12,
      "lng": 70.35,
      "reason": "Bridge 7 submerged under 4ft floodwater",
      "reported_at": "2026-08-22T11:00:00Z"
    }
  ]
  ```

### `GET /api/routes?from_depot_id=1&to_site_id=17`
- **Success `200 OK` (`RouteResponse`):**
  ```json
  {
    "distance_km": 14.2,
    "eta_minutes": 38,
    "geojson": {
      "type": "LineString",
      "coordinates": [
        [70.30, 29.08],
        [70.32, 29.11],
        [70.38, 29.15]
      ]
    },
    "avoided_damage": true,
    "delta_minutes_vs_direct": 40
  }
  ```
- **Errors:**
  - `404 Not Found`: `{"detail": "No route found — depot and site may be disconnected in the road graph"}` when flood damage completely cuts off access.

---

## 5. Edge Cases & Exception Handling

| Edge Case / Failure Mode | Root Cause | Handling Strategy & Mitigation |
| :--- | :--- | :--- |
| **OSMnx Coordinate Inversion Bug** | Passing `(lat, lng)` instead of `(lng, lat)` to `ox.nearest_edges` / `ox.nearest_nodes`. | Explicit type aliases and named arguments `(X=lng, Y=lat)` in `routing.py`. Add comprehensive unit test asserting valid edge retrieval. |
| **Graph Disconnection (`nx.NetworkXNoPath`)** | Flood damage removes critical bridge with no alternate road connection. | Catch `nx.NetworkXNoPath` and raise `HTTPException(status_code=404, detail="No route found — depot and site may be disconnected in the road graph")`. Frontend renders alert card prompting amphibious / helicopter dispatch. |
| **Direct Route is the Only Route** | Alternate route does not exist or direct route was not obstructed. | When `avoided_damage is False`, `delta_minutes_vs_direct` returns `0`. |
| **Missing GraphML File on Startup** | Staging environment or local run missing seeded `.graphml`. | Service checks file existence on startup. If missing, automatically generates synthetic connected grid graph for demo region or logs clear fatal startup warning. |
| **Damaged point far from any road** | GPS typo placing damage marker in open riverbed. | `ox.nearest_edges` finds nearest edge within distance threshold. If distance > 1.5km, log warning or flag nearest accessible bridge. |

---

## 6. Implementation Steps & Verification Plan

1. **Graph Routing Service:** Implement `app/services/routing.py` loading `demo_region.graphml`, caching graph in memory, applying damage edge filters, and computing dual routes (direct vs damaged).
2. **Roads & Routing Routes:** Implement `app/api/routes/roads.py` for damage reporting and route inspection.
3. **Unit & Graph Tests:** Create `tests/test_routing.py` testing:
   - Direct route travel time computation.
   - Dynamic edge removal when damage point is applied.
   - Reroute calculation asserting `avoided_damage == True` and `delta_minutes_vs_direct > 0`.
   - `404` exception when destination node is completely partitioned.
