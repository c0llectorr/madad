from datetime import datetime, timezone
import json
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Center(Base):
    __tablename__ = "centers"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    region = Column(String(100), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    
    users = relationship("User", back_populates="center")
    reports = relationship("Report", back_populates="center")
    sites = relationship("Site", back_populates="center")
    depots = relationship("Depot", back_populates="center")
    damaged_roads = relationship("DamagedRoad", back_populates="center")


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="coordinator", nullable=False)
    center_id = Column(Integer, ForeignKey("centers.id"), nullable=True)
    
    center = relationship("Center", back_populates="users")


class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    center_id = Column(Integer, ForeignKey("centers.id"), nullable=False, index=True)
    source = Column(String(50), default="manual", nullable=False)  # "manual" | "sms_stub"
    raw_text = Column(Text, nullable=True)
    status = Column(String(50), default="pending_extraction", nullable=False)  # "pending_extraction", "confirmed", "rejected"
    extracted_data = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    center = relationship("Center", back_populates="reports")


class Site(Base):
    __tablename__ = "sites"
    
    id = Column(Integer, primary_key=True, index=True)
    center_id = Column(Integer, ForeignKey("centers.id"), nullable=False, index=True)
    location_name = Column(String(200), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    estimated_population = Column(Integer, default=0, nullable=False)
    severity = Column(String(50), nullable=True)  # "low", "medium", "high", "critical"
    needs_json = Column(Text, default="[]", nullable=False)  # JSON array of strings
    urgency_flags_json = Column(Text, default="[]", nullable=False)  # JSON array of strings
    confidence = Column(String(50), default="single_unverified", nullable=False)  # "single_unverified" | "corroborated"
    priority_score = Column(Float, default=0.0, nullable=False)
    status = Column(String(50), default="unserved", nullable=False)  # "unserved", "planned", "dispatched", "delivered"
    last_report_time = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    center = relationship("Center", back_populates="sites")
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
    center_id = Column(Integer, ForeignKey("centers.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    
    center = relationship("Center", back_populates="depots")
    inventory_items = relationship("Inventory", back_populates="depot", cascade="all, delete-orphan")
    dispatches = relationship("Dispatch", back_populates="depot")


class Inventory(Base):
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    depot_id = Column(Integer, ForeignKey("depots.id"), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False)
    quantity = Column(Integer, default=0, nullable=False)
    
    depot = relationship("Depot", back_populates="inventory_items")


class DamagedRoad(Base):
    __tablename__ = "damaged_roads"
    
    id = Column(Integer, primary_key=True, index=True)
    center_id = Column(Integer, ForeignKey("centers.id"), nullable=False, index=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    reason = Column(String(255), nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    reported_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    center = relationship("Center", back_populates="damaged_roads")


class Dispatch(Base):
    __tablename__ = "dispatches"
    
    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False, index=True)
    depot_id = Column(Integer, ForeignKey("depots.id"), nullable=False, index=True)
    resources_loaded_json = Column(Text, default="[]", nullable=False)  # JSON array of ResourceItem
    route_geojson = Column(Text, nullable=True)  # JSON string
    distance_km = Column(Float, default=0.0, nullable=False)
    eta_minutes = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="planned", nullable=False)  # "planned", "en_route", "delivered"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
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
