"""
geodata/fetch_osm.py
Owner: Yasir Iftikhar (database/)

PURPOSE
-------
Download the road network for the Rajanpur, Punjab, Pakistan demo region from
OpenStreetMap via the Overpass API and save it as a GraphML file.

RUN THIS ONCE on Day 1 and commit demo_region.graphml to the repo.
Do NOT run it during the live demo — it depends on Overpass API availability,
which can be slow or rate-limited. The committed .graphml is what the demo runs on.

USAGE
-----
    cd database
    python -m venv venv && venv\\Scripts\\activate     # Windows
    pip install -r requirements.txt
    python geodata/fetch_osm.py

OUTPUT
------
    geodata/demo_region.graphml   ← committed to repo; backend routing reads this file

BACKEND DEPENDENCY
------------------
backend/services/routing.py loads this file at:
    GRAPH_PATH = "../database/geodata/demo_region.graphml"
relative to the backend/ root. Do not move or rename this file.
"""

import os
import osmnx as ox

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
PLACE_NAME = "Rajanpur, Punjab, Pakistan"
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "demo_region.graphml")
NETWORK_TYPE = "drive"      # drive network — only roads vehicles can use


def fetch_region_graph(place_name: str, save_path: str) -> None:
    """
    Download the drivable road network for `place_name` from OSM and save
    as a GraphML file at `save_path`.

    The graph is augmented with edge speeds and travel times before saving
    so the backend's routing.py (which calls ox.add_edge_travel_times()) gets
    the same result whether it re-adds them or not — redundant but harmless.
    """
    print(f"[fetch_osm] Fetching road network for: {place_name}")
    print("[fetch_osm] This may take 30–120 seconds depending on Overpass API load...")

    graph = ox.graph_from_place(place_name, network_type=NETWORK_TYPE)

    print(f"[fetch_osm] Graph fetched: {len(graph.nodes)} nodes, {len(graph.edges)} edges")

    # Add speed and travel time attributes so routing.py can use 'travel_time' weight.
    graph = ox.add_edge_speeds(graph)
    graph = ox.add_edge_travel_times(graph)

    print(f"[fetch_osm] Saving to: {save_path}")
    ox.save_graphml(graph, save_path)
    print("[fetch_osm] Done. Commit demo_region.graphml to the repo now.")


if __name__ == "__main__":
    if os.path.exists(OUTPUT_PATH):
        print(f"[fetch_osm] demo_region.graphml already exists at {OUTPUT_PATH}")
        answer = input("[fetch_osm] Re-fetch and overwrite? [y/N] ").strip().lower()
        if answer != "y":
            print("[fetch_osm] Skipped. Existing file kept.")
            raise SystemExit(0)

    fetch_region_graph(PLACE_NAME, OUTPUT_PATH)
