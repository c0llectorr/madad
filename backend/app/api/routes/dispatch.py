import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db.models import Site, Depot, Inventory, Dispatch, DamagedRoad
from app.schemas.dispatch import (
    DispatchCreateRequest,
    DispatchResponse,
    DispatchRouteInfo,
    DispatchStatusUpdateRequest,
    DispatchStatusResponse
)
from app.services.routing import routing_service

router = APIRouter(prefix="/dispatch", tags=["dispatch"])


@router.post("", response_model=DispatchResponse, status_code=status.HTTP_201_CREATED)
def create_dispatch(req: DispatchCreateRequest, db: Session = Depends(get_db)):
    """
    Transactional dispatch execution:
    1. Lock & check inventory balances
    2. Decrement inventory
    3. Update site status to 'planned'
    4. Compute damage-aware route and ETA
    5. Create dispatch record
    """
    site = db.query(Site).filter(Site.id == req.site_id).first()
    depot = db.query(Depot).filter(Depot.id == req.depot_id).first()

    if not site or not depot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site or Depot not found"
        )

    # 1. Check all requested resource inventories
    for res in req.resources:
        inv_item = db.query(Inventory).filter(
            Inventory.depot_id == req.depot_id,
            Inventory.resource_type == res.resource_type
        ).first()

        if not inv_item or inv_item.quantity < res.quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Insufficient inventory for one or more resources"
            )

    # 2. Deduct inventory
    for res in req.resources:
        inv_item = db.query(Inventory).filter(
            Inventory.depot_id == req.depot_id,
            Inventory.resource_type == res.resource_type
        ).first()
        inv_item.quantity -= res.quantity

    # 3. Update Site status
    site.status = "planned"

    # 4. Compute route
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

    # 5. Insert Dispatch record
    dispatch = Dispatch(
        site_id=site.id,
        depot_id=depot.id,
        resources_loaded_json=json.dumps([r.model_dump() for r in req.resources]),
        route_geojson=json.dumps(route_info["geojson"]),
        distance_km=route_info["distance_km"],
        eta_minutes=route_info["eta_minutes"],
        status="planned"
    )
    db.add(dispatch)
    db.commit()
    db.refresh(dispatch)

    return DispatchResponse(
        dispatch_id=dispatch.id,
        status="planned",
        route=DispatchRouteInfo(
            geojson=route_info["geojson"],
            distance_km=route_info["distance_km"]
        ),
        eta_minutes=route_info["eta_minutes"]
    )


@router.patch("/{dispatch_id}/status", response_model=DispatchStatusResponse)
def update_dispatch_status(
    dispatch_id: int,
    req: DispatchStatusUpdateRequest,
    db: Session = Depends(get_db)
):
    dispatch = db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()
    if not dispatch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispatch not found"
        )

    # Enforce forward-only status state machine
    allowed_transitions = {
        "planned": ["en_route"],
        "en_route": ["delivered"],
        "delivered": []
    }

    if req.status not in allowed_transitions.get(dispatch.status, []):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot transition status from '{dispatch.status}' to '{req.status}'"
        )

    dispatch.status = req.status
    
    # Synchronize site status
    site = db.query(Site).filter(Site.id == dispatch.site_id).first()
    if site:
        if req.status == "en_route":
            site.status = "dispatched"
        elif req.status == "delivered":
            site.status = "delivered"

    db.commit()
    return DispatchStatusResponse(dispatch_id=dispatch.id, status=dispatch.status)
