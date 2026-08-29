from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, model_validator

NeedsType = Literal[
    "food",
    "water",
    "medical_evacuation",
    "shelter",
    "medicine",
    "general_evacuation"
]

UrgencyFlagsType = Literal[
    "elderly_present",
    "children_present",
    "pregnancy",
    "injury_reported",
    "water_rising",
    "stranded_no_exit"
]

SeverityType = Literal["low", "medium", "high", "critical"]


class StructuredFields(BaseModel):
    location_name: Optional[str] = None
    headcount: Optional[int] = None
    severity: Optional[SeverityType] = None
    needs: Optional[List[str]] = Field(default_factory=list)


class ReportCreateRequest(BaseModel):
    center_id: int
    source: Literal["manual", "sms_stub"] = "manual"
    raw_text: Optional[str] = None
    structured_fields: Optional[StructuredFields] = None

    @model_validator(mode="after")
    def validate_content_presence(self):
        if not self.raw_text and not self.structured_fields:
            raise ValueError("A report must contain either raw_text or structured_fields")
        return self


class ReportCreateResponse(BaseModel):
    report_id: int
    status: str  # "pending_extraction" | "confirmed"


class ExtractedReportData(BaseModel):
    location_name: str
    estimated_population: int
    needs: List[str]
    urgency_flags: List[str]
    confidence: Literal["single_unverified", "corroborated"] = "single_unverified"


class ExtractReportResponse(BaseModel):
    report_id: int
    extracted: ExtractedReportData
    geocode_status: Literal["matched", "unmatched"]
    lat: Optional[float] = None
    lng: Optional[float] = None


class ReportConfirmRequest(BaseModel):
    location_name: str
    lat: float
    lng: float
    estimated_population: int
    needs: List[str] = Field(default_factory=list)
    urgency_flags: List[str] = Field(default_factory=list)
    status: Literal["confirmed", "rejected"]


class ReportConfirmResponse(BaseModel):
    site_id: Optional[int] = None
    status: str


class ReportItemResponse(BaseModel):
    report_id: int
    raw_text: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
