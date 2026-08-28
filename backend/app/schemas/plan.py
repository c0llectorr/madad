from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from app.schemas.depot import ResourceItem


class AllocationItem(BaseModel):
    site_id: int
    depot_id: int
    rank: int
    priority_score: float
    resources: List[ResourceItem]
    reasoning: str


class PlanGenerateRequest(BaseModel):
    center_id: int


class PlanGenerateResponse(BaseModel):
    allocations: List[AllocationItem] = Field(default_factory=list)


class ReplanChange(BaseModel):
    site_id: int
    old_rank: Optional[int] = None
    new_rank: int
    reason: str


class ReplanRequest(BaseModel):
    center_id: int
    trigger: Literal["new_report", "road_damage", "dispatch_complete"]


class ReplanResponse(BaseModel):
    changed: List[ReplanChange] = Field(default_factory=list)
    unchanged: List[int] = Field(default_factory=list)
