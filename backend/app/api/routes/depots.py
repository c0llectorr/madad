from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db.models import Depot, Inventory
from app.schemas.depot import DepotResponse, InventoryUpdateRequest, InventoryItemResponse, ResourceItem

router = APIRouter(prefix="/depots", tags=["depots"])


@router.get("", response_model=List[DepotResponse])
def get_depots(
    center_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Depot)
    if center_id:
        query = query.filter(Depot.center_id == center_id)

    depots = query.all()
    
    results = []
    for d in depots:
        inventory_list = [
            ResourceItem(resource_type=item.resource_type, quantity=item.quantity)
            for item in d.inventory_items
        ]
        results.append(
            DepotResponse(
                id=d.id,
                name=d.name,
                lat=d.lat,
                lng=d.lng,
                inventory=inventory_list
            )
        )
    return results


@router.patch("/{depot_id}/inventory", response_model=InventoryItemResponse)
def update_inventory(
    depot_id: int,
    req: InventoryUpdateRequest,
    db: Session = Depends(get_db)
):
    depot = db.query(Depot).filter(Depot.id == depot_id).first()
    if not depot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Depot not found")

    item = db.query(Inventory).filter(
        Inventory.depot_id == depot_id,
        Inventory.resource_type == req.resource_type
    ).first()

    if not item:
        if req.quantity_delta < 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Insufficient inventory, cannot go below zero"
            )
        item = Inventory(
            depot_id=depot_id,
            resource_type=req.resource_type,
            quantity=req.quantity_delta
        )
        db.add(item)
    else:
        new_quantity = item.quantity + req.quantity_delta
        if new_quantity < 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Insufficient inventory, cannot go below zero"
            )
        item.quantity = new_quantity

    db.commit()
    db.refresh(item)

    return InventoryItemResponse(
        resource_type=item.resource_type,
        quantity=item.quantity
    )
