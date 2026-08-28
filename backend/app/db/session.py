import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.db.models import Base, Center, User, Depot, Inventory, Site, DamagedRoad
from app.core.security import get_password_hash

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)
    seed_initial_data()


def seed_initial_data():
    db: Session = SessionLocal()
    try:
        # Check if already seeded
        center = db.query(Center).filter(Center.code == "RJP-01").first()
        if not center:
            center = Center(
                code="RJP-01",
                name="Rajanpur Support Center",
                region="Punjab",
                lat=29.1044,
                lng=70.3301
            )
            db.add(center)
            db.commit()
            db.refresh(center)
            
            # Coordinator User
            user = User(
                username="bilal",
                hashed_password=get_password_hash("bilal123"),
                role="coordinator",
                center_id=center.id
            )
            db.add(user)
            
            # Depots
            depot_a = Depot(
                name="Depot A (HQ / Central)",
                lat=29.0820,
                lng=70.3015,
                center_id=center.id
            )
            depot_b = Depot(
                name="Depot B (North River Bank)",
                lat=29.2010,
                lng=70.4520,
                center_id=center.id
            )
            db.add(depot_a)
            db.add(depot_b)
            db.commit()
            db.refresh(depot_a)
            db.refresh(depot_b)
            
            # Inventory
            db.add_all([
                Inventory(depot_id=depot_a.id, resource_type="food_packet", quantity=400),
                Inventory(depot_id=depot_a.id, resource_type="water_container", quantity=300),
                Inventory(depot_id=depot_a.id, resource_type="boat", quantity=2),
                Inventory(depot_id=depot_a.id, resource_type="ambulance", quantity=1),
                Inventory(depot_id=depot_a.id, resource_type="medicine_kit", quantity=100),
                
                Inventory(depot_id=depot_b.id, resource_type="food_packet", quantity=600),
                Inventory(depot_id=depot_b.id, resource_type="water_container", quantity=500),
                Inventory(depot_id=depot_b.id, resource_type="tent", quantity=150),
                Inventory(depot_id=depot_b.id, resource_type="boat", quantity=1),
            ])
            
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Database init notice: {e}")
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
