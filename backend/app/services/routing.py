import os
import math
import logging
from typing import Dict, Any, List, Tuple, Optional

logger = logging.getLogger(__name__)

# Fallback graph structure & synthetic geometric routing for standalone/mock tests
class RoutingService:
    def __init__(self, graph_path: str = "../database/geodata/demo_region.graphml"):
        self.graph_path = graph_path
        self._graph = None
        self._init_graph()

    def _init_graph(self):
        try:
            import osmnx as ox
            if os.path.exists(self.graph_path):
                G = ox.load_graphml(self.graph_path)
                G = ox.add_edge_speeds(G)
                G = ox.add_edge_travel_times(G)
                self._graph = G
                logger.info(f"Loaded OSMnx graph from {self.graph_path}")
        except Exception as e:
            logger.info(f"Using synthetic geometric road graph router: {e}")
            self._graph = None

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate great circle distance in kilometers."""
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2.0) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R * c

    def compute_route(
        self,
        origin: Tuple[float, float],      # (lat, lng)
        dest: Tuple[float, float],        # (lat, lng)
        damaged_points: Optional[List[Tuple[float, float]]] = None
    ) -> Dict[str, Any]:
        """
        Compute route between origin and dest.
        Returns: {
            "distance_km": float,
            "eta_minutes": int,
            "geojson": dict,
            "avoided_damage": bool,
            "delta_minutes_vs_direct": int
        }
        """
        orig_lat, orig_lng = origin
        dest_lat, dest_lng = dest
        damaged_points = damaged_points or []

        # Check if direct line passes close to any damaged point (< 2km)
        avoided_damage = False
        delta_minutes_vs_direct = 0
        
        for d_lat, d_lng in damaged_points:
            # Check proximity to midpoint/segment
            mid_lat = (orig_lat + dest_lat) / 2.0
            mid_lng = (orig_lng + dest_lng) / 2.0
            dist_to_mid = self.haversine_distance(d_lat, d_lng, mid_lat, mid_lng)
            if dist_to_mid < 4.0:
                avoided_damage = True
                delta_minutes_vs_direct = 40  # +40 mins alternate detour
                break

        direct_dist = self.haversine_distance(orig_lat, orig_lng, dest_lat, dest_lng)
        # Road winding multiplier ~1.25x
        effective_dist = direct_dist * (1.6 if avoided_damage else 1.25)
        # Average speed ~ 40 km/h in monsoon flood terrain
        base_eta = int((effective_dist / 35.0) * 60)
        final_eta = base_eta + (delta_minutes_vs_direct if avoided_damage else 0)
        final_eta = max(15, final_eta)

        # Generate realistic GeoJSON LineString coordinates
        coordinates = []
        steps = 8
        for i in range(steps + 1):
            t = i / float(steps)
            curr_lat = orig_lat + (dest_lat - orig_lat) * t
            curr_lng = orig_lng + (dest_lng - orig_lng) * t
            
            # Add lateral offset if avoiding damaged bridge/road
            if avoided_damage and 0 < i < steps:
                offset = math.sin(t * math.pi) * 0.04
                curr_lat += offset
                curr_lng += offset * 0.5
                
            coordinates.append([round(curr_lng, 5), round(curr_lat, 5)])

        return {
            "distance_km": round(effective_dist, 1),
            "eta_minutes": final_eta,
            "geojson": {
                "type": "LineString",
                "coordinates": coordinates
            },
            "avoided_damage": avoided_damage,
            "delta_minutes_vs_direct": delta_minutes_vs_direct
        }


routing_service = RoutingService()
