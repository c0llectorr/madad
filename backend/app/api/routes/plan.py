from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.plan import PlanGenerateRequest, PlanGenerateResponse, ReplanRequest, ReplanResponse
from app.services.replanning import ReplanningService

router = APIRouter(prefix="/plan", tags=["plan"])


@router.post("/generate", response_model=PlanGenerateResponse)
def generate_plan(req: PlanGenerateRequest, db: Session = Depends(get_db)):
    allocations = ReplanningService.generate_plan(db, req.center_id)
    if not allocations:
        return PlanGenerateResponse(allocations=[], message="No unserved sites")
    return PlanGenerateResponse(allocations=allocations)


@router.post("/replan", response_model=ReplanResponse)
def replan_plan(req: ReplanRequest, db: Session = Depends(get_db)):
    result = ReplanningService.replan(db, req.center_id, req.trigger)
    return result
