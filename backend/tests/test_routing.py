from app.services.routing import routing_service


def test_compute_route_direct():
    depot = (29.0820, 70.3015)
    site = (29.1520, 70.3810)

    route_info = routing_service.compute_route(depot, site, damaged_points=[])
    
    assert route_info["distance_km"] > 0
    assert route_info["eta_minutes"] > 0
    assert route_info["avoided_damage"] is False
    assert route_info["delta_minutes_vs_direct"] == 0
    assert route_info["geojson"]["type"] == "LineString"
    assert len(route_info["geojson"]["coordinates"]) > 0


def test_compute_route_with_damage_avoidance():
    depot = (29.0820, 70.3015)
    site = (29.1520, 70.3810)
    # Damaged bridge placed near path midpoint
    damaged_bridge = (29.1170, 70.3412)

    route_info = routing_service.compute_route(depot, site, damaged_points=[damaged_bridge])
    
    assert route_info["avoided_damage"] is True
    assert route_info["delta_minutes_vs_direct"] == 40
    assert route_info["eta_minutes"] > 40
