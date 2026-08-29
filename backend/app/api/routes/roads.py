from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db.models import DamagedRoad, Depot, Site
from app.schemas.road import (
    RoadDamageCreateRequest,
    RoadDamageResponse,
    RoadDamageItem,
    RouteResponse
)
from app.services.routing import routing_service

router = APIRouter(tags=["roads"])


@router.post("/roads/damage", response_model=RoadDamageResponse, status_code=status.HTTP_201_CREATED)
def report_road_damage(req: RoadDamageCreateRequest, db: Session = Depends(get_db)):
    damage = DamagedRoad(
        center_id=req.center_id,
        lat=req.lat,
        lng=req.lng,
        reason=req.reason,
        active=True
    )
    db.add(damage)
    db.commit()
    db.refresh(damage)

    return RoadDamageResponse(id=damage.id, active=True)


@router.get("/roads/damaged", response_model=List[RoadDamageItem])
def get_damaged_roads(
    center_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(DamagedRoad).filter(DamagedRoad.active == True)
    if center_id:
        query = query.filter(DamagedRoad.center_id == center_id)

    damaged = query.order_by(DamagedRoad.reported_at.desc()).all()
    return damaged


@router.get("/routes", response_model=RouteResponse)
def get_route(
    from_depot_id: int = Query(...),
    to_site_id: int = Query(...),
    db: Session = Depends(get_db)
):
    depot = db.query(Depot).filter(Depot.id == from_depot_id).first()
    site = db.query(Site).filter(Site.id == to_site_id).first()

    if not depot or not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Depot or Site not found"
        )

    # Check damaged roads in this center
    damaged = db.query(DamagedRoad).filter(
        DamagedRoad.center_id == depot.center_id,
        DamagedRoad.active == True
    ).all()
    damaged_points = [(d.lat, d.lng) for d in damaged]

    route_info = routing_service.compute_route(
        (depot.lat, depot.lng),
        (site.lat, site.lng),
        damaged_points=damaged_points
    )

    return RouteResponse(
        distance_km=route_info["distance_km"],
        eta_minutes=route_info["eta_minutes"],
        geojson=route_info["geojson"],
        avoided_damage=route_info["avoided_damage"],
        delta_minutes_vs_direct=route_info["delta_minutes_vs_direct"]
    )
