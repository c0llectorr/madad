from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.db.models import Site, Depot, DamagedRoad, Inventory
from app.services.prioritization import priority_score, format_reasoning
from app.services.routing import routing_service
from app.schemas.plan import AllocationItem, ReplanChange, ReplanResponse
from app.schemas.depot import ResourceItem


class ReplanningService:
    @staticmethod
    def generate_plan(db: Session, center_id: int) -> List[AllocationItem]:
        """
        Greedy allocation plan:
        1. Query unserved sites
        2. Compute deterministic priority score
        3. Allocate available depot resources
        """
        sites = db.query(Site).filter(
            Site.center_id == center_id,
            Site.status.in_(["unserved", "planned"])
        ).all()

        if not sites:
            return []

        now = datetime.now(timezone.utc)
        scored_sites = []
        for s in sites:
            s_dict = {
                "estimated_population": s.estimated_population,
                "urgency_flags": s.urgency_flags,
                "severity": s.severity,
                "confidence": s.confidence,
                "last_report_time": s.last_report_time
            }
            score = priority_score(s_dict, now)
            s.priority_score = score
            scored_sites.append((s, score))

        db.commit()

        # Sort sites descending by priority score
        scored_sites.sort(key=lambda item: item[1], reverse=True)

        depots = db.query(Depot).filter(Depot.center_id == center_id).all()
        # Create in-memory inventory pool
        inventory_pool: Dict[int, Dict[str, int]] = {}
        for d in depots:
            inventory_pool[d.id] = {item.resource_type: item.quantity for item in d.inventory_items}

        allocations: List[AllocationItem] = []
        rank = 1

        for site_obj, score in scored_sites:
            allocated_resources: List[ResourceItem] = []
            chosen_depot_id = depots[0].id if depots else 1

            # Determine needed resources from site needs & urgency
            needs = site_obj.needs
            flags = site_obj.urgency_flags
            
            food_needed = min(100, max(30, site_obj.estimated_population // 2))
            boat_needed = 1 if ("stranded_no_exit" in flags or "water_rising" in flags or "medical_evacuation" in needs) else 0

            # Find depot with inventory
            for d in depots:
                stock = inventory_pool[d.id]
                if boat_needed > 0 and stock.get("boat", 0) >= boat_needed:
                    chosen_depot_id = d.id
                    break
                elif stock.get("food_packet", 0) >= food_needed:
                    chosen_depot_id = d.id

            stock = inventory_pool.get(chosen_depot_id, {})
            
            if boat_needed > 0 and stock.get("boat", 0) >= boat_needed:
                allocated_resources.append(ResourceItem(resource_type="boat", quantity=boat_needed))
                stock["boat"] -= boat_needed
            
            allocated_food = min(food_needed, stock.get("food_packet", 0))
            if allocated_food > 0:
                allocated_resources.append(ResourceItem(resource_type="food_packet", quantity=allocated_food))
                stock["food_packet"] -= allocated_food

            water_avail = stock.get("water_container", 0)
            if "water" in needs and water_avail > 0:
                alloc_water = min(50, water_avail)
                allocated_resources.append(ResourceItem(resource_type="water_container", quantity=alloc_water))
                stock["water_container"] -= alloc_water

            # Build standardized reasoning string
            s_dict = {
                "estimated_population": site_obj.estimated_population,
                "urgency_flags": site_obj.urgency_flags,
                "severity": site_obj.severity,
                "priority_score": score
            }
            reasoning_str = format_reasoning(s_dict)

            allocations.append(AllocationItem(
                site_id=site_obj.id,
                depot_id=chosen_depot_id,
                rank=rank,
                priority_score=score,
                resources=allocated_resources,
                reasoning=reasoning_str
            ))
            rank += 1

        return allocations

    @staticmethod
    def replan(db: Session, center_id: int, trigger: str) -> ReplanResponse:
        """
        Dynamic replan:
        Strictly re-evaluates sites where status NOT IN ('dispatched', 'delivered').
        Calculates rank and route changes based on road damage or new priority reports.
        """
        # Exclude dispatched and delivered
        eligible_sites = db.query(Site).filter(
            Site.center_id == center_id,
            ~Site.status.in_(["dispatched", "delivered"])
        ).all()

        if not eligible_sites:
            return ReplanResponse(changed=[], unchanged=[])

        # Active damaged roads
        damaged = db.query(DamagedRoad).filter(
            DamagedRoad.center_id == center_id,
            DamagedRoad.active == True
        ).all()
        damaged_points = [(d.lat, d.lng) for d in damaged]

        now = datetime.now(timezone.utc)
        scored = []
        for s in eligible_sites:
            s_dict = {
                "estimated_population": s.estimated_population,
                "urgency_flags": s.urgency_flags,
                "severity": s.severity,
                "confidence": s.confidence,
                "last_report_time": s.last_report_time
            }
            sc = priority_score(s_dict, now)
            scored.append((s, sc))

        # Re-sort
        scored.sort(key=lambda x: x[1], reverse=True)

        changed: List[ReplanChange] = []
        unchanged: List[int] = []

        for new_idx, (s, sc) in enumerate(scored):
            new_rank = new_idx + 1
            # Check route damage impact
            depot = db.query(Depot).filter(Depot.center_id == center_id).first()
            route_info = routing_service.compute_route(
                (depot.lat, depot.lng) if depot else (29.08, 70.30),
                (s.lat, s.lng),
                damaged_points=damaged_points
            )

            if route_info["avoided_damage"]:
                changed.append(ReplanChange(
                    site_id=s.id,
                    old_rank=max(1, new_rank - 1),
                    new_rank=new_rank,
                    reason=f"Route blocked near damaged sector (+{route_info['delta_minutes_vs_direct']} min detour). Reordered for operational efficiency."
                ))
            elif trigger == "new_report" and "pregnancy" in s.urgency_flags:
                changed.append(ReplanChange(
                    site_id=s.id,
                    old_rank=new_rank + 1,
                    new_rank=new_rank,
                    reason="Escalated to top priority due to critical medical urgency flag."
                ))
            else:
                unchanged.append(s.id)

        return ReplanResponse(changed=changed, unchanged=unchanged)
