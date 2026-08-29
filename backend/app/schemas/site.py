from typing import List, Optional
from pydantic import BaseModel


class SiteResponse(BaseModel):
    id: int
    location_name: str
    lat: float
    lng: float
    estimated_population: int
    needs: List[str]
    urgency_flags: List[str]
    confidence: str
    priority_score: float
    status: str

    class Config:
        from_attributes = True
