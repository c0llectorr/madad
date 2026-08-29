from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean,
    CheckConstraint, UniqueConstraint, Index
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Center(Base):
    __tablename__ = "support_centers"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    region = Column(String(100), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    users = relationship("User", back_populates="center")
    reports = relationship("Report", back_populates="center")
    sites = relationship("Site", back_populates="center")
    depots = relationship("Depot", back_populates="center")
    damaged_roads = relationship("DamagedRoad", back_populates="center")
    dispatches = relationship("Dispatch", back_populates="center")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('coordinator', 'admin')", name="check_user_role"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="coordinator", nullable=False)
    center_id = Column(Integer, ForeignKey("support_centers.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    center = relationship("Center", back_populates="users")


class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (
        CheckConstraint("source IN ('manual', 'sms_stub')", name="check_report_source"),
        CheckConstraint("status IN ('pending_extraction', 'extracted', 'confirmed', 'rejected')", name="check_report_status"),
        Index("idx_reports_center_status", "center_id", "status"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    center_id = Column(Integer, ForeignKey("support_centers.id", ondelete="CASCADE"), nullable=False, index=True)
    source = Column(String(50), default="manual", nullable=False)
    raw_text = Column(Text, nullable=True)
    status = Column(String(50), default="pending_extraction", nullable=False)
    extracted_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    center = relationship("Center", back_populates="reports")
    sites = relationship("Site", back_populates="report")

    @property
    def extracted_data(self):
        return self.extracted_json

    @extracted_data.setter
    def extracted_data(self, val):
        self.extracted_json = val


class Site(Base):
    __tablename__ = "sites"
    __table_args__ = (
        CheckConstraint("confidence IN ('single_unverified', 'corroborated')", name="check_site_confidence"),
        CheckConstraint("status IN ('unserved', 'planned', 'dispatched', 'delivered')", name="check_site_status"),
        Index("idx_sites_center_status", "center_id", "status"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    center_id = Column(Integer, ForeignKey("support_centers.id", ondelete="CASCADE"), nullable=False, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="SET NULL"), nullable=True)
    location_name = Column(String(200), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    estimated_population = Column(Integer, default=0, nullable=False)
    severity = Column(String(50), nullable=True)
    needs_json = Column(Text, default="[]", nullable=False)
    urgency_flags_json = Column(Text, default="[]", nullable=False)
    confidence = Column(String(50), default="single_unverified", nullable=False)
    priority_score = Column(Float, default=0.0, nullable=False)
    status = Column(String(50), default="unserved", nullable=False)
    last_report_time = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    center = relationship("Center", back_populates="sites")
    report = relationship("Report", back_populates="sites")
    dispatches = relationship("Dispatch", back_populates="site")

    @property
    def needs(self):
        try:
            return json.loads(self.needs_json) if self.needs_json else []
        except Exception:
            return []

    @needs.setter
    def needs(self, val):
        self.needs_json = json.dumps(val)

    @property
    def urgency_flags(self):
        try:
            return json.loads(self.urgency_flags_json) if self.urgency_flags_json else []
        except Exception:
            return []

    @urgency_flags.setter
    def urgency_flags(self, val):
        self.urgency_flags_json = json.dumps(val)


class Depot(Base):
    __tablename__ = "depots"
    
    id = Column(Integer, primary_key=True, index=True)
    center_id = Column(Integer, ForeignKey("support_centers.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    center = relationship("Center", back_populates="depots")
    inventory_items = relationship("Inventory", back_populates="depot", cascade="all, delete-orphan")
    dispatches = relationship("Dispatch", back_populates="depot")


class Inventory(Base):
    __tablename__ = "inventory"
    __table_args__ = (
        CheckConstraint("quantity >= 0", name="check_inventory_quantity_non_negative"),
        UniqueConstraint("depot_id", "resource_type", name="uq_depot_resource_type"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    depot_id = Column(Integer, ForeignKey("depots.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False)
    quantity = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    depot = relationship("Depot", back_populates="inventory_items")


class DamagedRoad(Base):
    __tablename__ = "damaged_roads"
    
    id = Column(Integer, primary_key=True, index=True)
    center_id = Column(Integer, ForeignKey("support_centers.id", ondelete="CASCADE"), nullable=False, index=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    reason = Column(String(255), nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    reported_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    center = relationship("Center", back_populates="damaged_roads")


class Dispatch(Base):
    __tablename__ = "dispatches"
    __table_args__ = (
        CheckConstraint("status IN ('planned', 'en_route', 'delivered')", name="check_dispatch_status"),
        Index("idx_dispatches_center_status", "center_id", "status"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    center_id = Column(Integer, ForeignKey("support_centers.id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True)
    depot_id = Column(Integer, ForeignKey("depots.id", ondelete="CASCADE"), nullable=False, index=True)
    resources_loaded_json = Column(Text, default="[]", nullable=False)
    route_geojson = Column(Text, nullable=True)
    distance_km = Column(Float, default=0.0, nullable=False)
    eta_minutes = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="planned", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    center = relationship("Center", back_populates="dispatches")
    site = relationship("Site", back_populates="dispatches")
    depot = relationship("Depot", back_populates="dispatches")

    @property
    def resources_loaded(self):
        try:
            return json.loads(self.resources_loaded_json) if self.resources_loaded_json else []
        except Exception:
            return []

    @resources_loaded.setter
    def resources_loaded(self, val):
        self.resources_loaded_json = json.dumps(val)

