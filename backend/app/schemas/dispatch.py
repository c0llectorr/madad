from typing import List, Any, Dict, Literal
from pydantic import BaseModel
from app.schemas.depot import ResourceItem


class DispatchRouteInfo(BaseModel):
    geojson: Dict[str, Any]
    distance_km: float


class DispatchCreateRequest(BaseModel):
    site_id: int
    depot_id: int
    resources: List[ResourceItem]


class DispatchResponse(BaseModel):
    dispatch_id: int
    status: str = "planned"
    route: DispatchRouteInfo
    eta_minutes: int


class DispatchStatusUpdateRequest(BaseModel):
    status: Literal["en_route", "delivered"]


class DispatchStatusResponse(BaseModel):
    dispatch_id: int
    status: str
