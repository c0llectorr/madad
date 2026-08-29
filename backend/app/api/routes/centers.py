from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.center import CenterResponse
from app.db.models import Center

router = APIRouter(prefix="/centers", tags=["centers"])


@router.get("", response_model=List[CenterResponse])
def get_centers(db: Session = Depends(get_db)):
    centers = db.query(Center).all()
    return centers
