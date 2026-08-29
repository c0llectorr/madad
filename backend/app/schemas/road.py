from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel, Field


class RoadDamageCreateRequest(BaseModel):
    center_id: int
    lat: float
    lng: float
    reason: Optional[str] = None


class RoadDamageResponse(BaseModel):
    id: int
    active: bool = True


class RoadDamageItem(BaseModel):
    id: int
    lat: float
    lng: float
    reason: Optional[str] = None
    reported_at: datetime

    class Config:
        from_attributes = True


class RouteResponse(BaseModel):
    distance_km: float
    eta_minutes: int
    geojson: Dict[str, Any]
    avoided_damage: bool
    delta_minutes_vs_direct: int
