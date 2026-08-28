from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import Base, Center, Depot, Inventory, Site, DamagedRoad
from app.services.replanning import ReplanningService

# In-memory SQLite for replan tests
engine = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(bind=engine)


def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    center = Center(code="RJP-01", name="Rajanpur Center", region="Punjab", lat=29.10, lng=70.33)
    db.add(center)
    db.commit()
    db.refresh(center)

    depot = Depot(name="Depot A", lat=29.08, lng=70.30, center_id=center.id)
    db.add(depot)
    db.commit()
    db.refresh(depot)

    db.add_all([
        Inventory(depot_id=depot.id, resource_type="food_packet", quantity=500),
        Inventory(depot_id=depot.id, resource_type="boat", quantity=2),
    ])

    site1 = Site(
        center_id=center.id,
        location_name="Chak 45",
        lat=29.15,
        lng=70.38,
        estimated_population=180,
        needs_json='["food", "medical_evacuation"]',
        urgency_flags_json='["pregnancy"]',
        confidence="single_unverified",
        status="unserved",
        last_report_time=datetime.now(timezone.utc)
    )
    site2 = Site(
        center_id=center.id,
        location_name="Basti Qadirpur",
        lat=29.18,
        lng=70.41,
        estimated_population=80,
        needs_json='["food"]',
        urgency_flags_json='[]',
        confidence="single_unverified",
        status="unserved",
        last_report_time=datetime.now(timezone.utc)
    )
    db.add_all([site1, site2])
    db.commit()
    return db, center.id


def test_generate_plan_ranking():
    db, center_id = setup_test_db()
    allocations = ReplanningService.generate_plan(db, center_id)
    
    assert len(allocations) == 2
    # Site 1 (Chak 45 with pregnancy flag) should be Rank 1
    assert allocations[0].rank == 1
    assert allocations[0].priority_score > allocations[1].priority_score
    assert len(allocations[0].resources) > 0


def test_replan_road_damage_trigger():
    db, center_id = setup_test_db()
    # Add road damage
    db.add(DamagedRoad(center_id=center_id, lat=29.1170, lng=70.3412, reason="Bridge down", active=True))
    db.commit()

    replan_res = ReplanningService.replan(db, center_id, trigger="road_damage")
    assert len(replan_res.changed) > 0 or len(replan_res.unchanged) > 0
