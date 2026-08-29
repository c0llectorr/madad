from typing import List
from pydantic import BaseModel, Field


class ResourceItem(BaseModel):
    resource_type: str
    quantity: int = Field(..., ge=0)


class DepotResponse(BaseModel):
    id: int
    name: str
    lat: float
    lng: float
    inventory: List[ResourceItem]

    class Config:
        from_attributes = True


class InventoryUpdateRequest(BaseModel):
    resource_type: str
    quantity_delta: int  # can be negative or positive


class InventoryItemResponse(BaseModel):
    resource_type: str
    quantity: int
