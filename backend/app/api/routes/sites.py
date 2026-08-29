from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db.models import Site
from app.schemas.site import SiteResponse
from app.services.prioritization import priority_score

router = APIRouter(prefix="/sites", tags=["sites"])


@router.get("", response_model=List[SiteResponse])
def get_sites(
    center_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Site)
    if center_id:
        query = query.filter(Site.center_id == center_id)
    if status:
        query = query.filter(Site.status == status)

    sites = query.all()
    now = datetime.now(timezone.utc)
    
    results = []
    for s in sites:
        s_dict = {
            "estimated_population": s.estimated_population,
            "urgency_flags": s.urgency_flags,
            "severity": s.severity,
            "confidence": s.confidence,
            "last_report_time": s.last_report_time
        }
        score = priority_score(s_dict, now)
        s.priority_score = score
        results.append(s)

    # Return sorted by priority score descending
    results.sort(key=lambda x: x.priority_score, reverse=True)
    return results
