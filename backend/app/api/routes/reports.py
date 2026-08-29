from datetime import datetime, timezone
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_extraction_provider
from app.services.extraction.base import ExtractionProvider
from app.services.geocoding import GeocodingService
from app.db.models import Report, Site
from app.schemas.report import (
    ReportCreateRequest,
    ReportCreateResponse,
    ExtractReportResponse,
    ReportConfirmRequest,
    ReportConfirmResponse,
    ReportItemResponse
)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportCreateResponse, status_code=status.HTTP_201_CREATED)
def create_report(req: ReportCreateRequest, db: Session = Depends(get_db)):
    # FAST PATH: structured manual entry → site created immediately, no extraction
    if req.structured_fields and req.structured_fields.location_name:
        fields = req.structured_fields
        estimated_population = fields.headcount if fields.headcount is not None else 0
        severity = fields.severity

        matched_geo = GeocodingService.match_location(db, fields.location_name)
        lat = matched_geo[0] if matched_geo else 29.1044
        lng = matched_geo[1] if matched_geo else 70.3301

        report = Report(
            center_id=req.center_id,
            source=req.source,
            raw_text=req.raw_text or f"Structured input: {fields.location_name}",
            status="confirmed"
        )
        db.add(report)
        db.flush()

        site = Site(
            center_id=req.center_id,
            report_id=report.id,
            location_name=fields.location_name,
            lat=lat,
            lng=lng,
            estimated_population=estimated_population,
            severity=severity,
            needs_json=json.dumps(fields.needs or []),
            urgency_flags_json="[]",
            confidence="single_unverified",
            status="unserved",
            last_report_time=datetime.now(timezone.utc)
        )
        db.add(site)
        db.commit()
        db.refresh(report)

        return ReportCreateResponse(report_id=report.id, status="confirmed")

    # SLOW PATH: raw text pending AI extraction
    report = Report(
        center_id=req.center_id,
        source=req.source,
        raw_text=req.raw_text,
        status="pending_extraction"
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return ReportCreateResponse(report_id=report.id, status="pending_extraction")


@router.post("/{report_id}/extract", response_model=ExtractReportResponse)
async def extract_report(
    report_id: int,
    db: Session = Depends(get_db),
    extractor: ExtractionProvider = Depends(get_extraction_provider)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    if report.status in ("confirmed", "rejected", "extracted"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Report already extracted")

    if not report.raw_text:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Report has no text content")

    try:
        extracted = await extractor.extract(report.raw_text)
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Extraction provider unavailable")

    report.extracted_data = json.dumps(extracted.model_dump())
    report.status = "extracted"
    db.commit()

    matched_geo = GeocodingService.match_location(db, extracted.location_name)
    geocode_status = "matched" if matched_geo else "unmatched"
    lat = matched_geo[0] if matched_geo else None
    lng = matched_geo[1] if matched_geo else None

    return ExtractReportResponse(
        report_id=report.id,
        extracted=extracted,
        geocode_status=geocode_status,
        lat=lat,
        lng=lng,
    )


@router.patch("/{report_id}", response_model=ReportConfirmResponse)
def confirm_report(
    report_id: int,
    req: ReportConfirmRequest,
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    if req.status == "rejected":
        report.status = "rejected"
        db.commit()
        return ReportConfirmResponse(site_id=None, status="rejected")

    if req.lat is None or req.lng is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Coordinates (lat/lng) are required to confirm a site"
        )

    existing_site = db.query(Site).filter(
        Site.center_id == report.center_id,
        Site.location_name.ilike(f"%{req.location_name}%")
    ).first()

    if existing_site:
        existing_site.confidence = "corroborated"
        existing_site.estimated_population = max(existing_site.estimated_population, req.estimated_population)
        merged_needs = list(set(existing_site.needs + req.needs))
        merged_flags = list(set(existing_site.urgency_flags + req.urgency_flags))
        existing_site.needs = merged_needs
        existing_site.urgency_flags = merged_flags
        existing_site.last_report_time = datetime.now(timezone.utc)
        existing_site.report_id = report.id
        site_id = existing_site.id
    else:
        site = Site(
            center_id=report.center_id,
            report_id=report.id,
            location_name=req.location_name,
            lat=req.lat,
            lng=req.lng,
            estimated_population=req.estimated_population,
            needs_json=json.dumps(req.needs),
            urgency_flags_json=json.dumps(req.urgency_flags),
            confidence="single_unverified",
            status="unserved",
            last_report_time=datetime.now(timezone.utc)
        )
        db.add(site)
        db.flush()
        site_id = site.id

    report.status = "confirmed"
    db.commit()

    return ReportConfirmResponse(site_id=site_id, status="confirmed")


@router.get("", response_model=List[ReportItemResponse])
def list_reports(
    center_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db)
):
    query = db.query(Report)
    if center_id:
        query = query.filter(Report.center_id == center_id)
    if status_filter:
        query = query.filter(Report.status == status_filter)

    reports = query.order_by(Report.created_at.desc()).all()

    return [
        ReportItemResponse(
            report_id=r.id,
            raw_text=r.raw_text,
            status=r.status,
            created_at=r.created_at
        )
        for r in reports
    ]
