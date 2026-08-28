from datetime import datetime, timezone, timedelta
from app.services.prioritization import priority_score, format_reasoning


def test_priority_score_base_population():
    now = datetime(2026, 8, 22, 12, 0, 0, tzinfo=timezone.utc)
    site = {
        "estimated_population": 100,
        "urgency_flags": [],
        "severity": None,
        "confidence": "single_unverified",
        "last_report_time": now
    }
    score = priority_score(site, now)
    assert score == 100.0


def test_priority_score_urgency_weights():
    now = datetime(2026, 8, 22, 12, 0, 0, tzinfo=timezone.utc)
    site = {
        "estimated_population": 150,
        "urgency_flags": ["pregnancy", "water_rising"],  # 40 + 30 = 70
        "severity": "high",                              # 30
        "confidence": "corroborated",                    # 10
        "last_report_time": now
    }
    # 150 + 40 + 30 + 30 + 10 = 260.0
    score = priority_score(site, now)
    assert score == 260.0


def test_priority_score_time_decay():
    now = datetime(2026, 8, 22, 14, 0, 0, tzinfo=timezone.utc)
    two_hours_ago = now - timedelta(hours=2)
    site = {
        "estimated_population": 50,
        "urgency_flags": [],
        "severity": None,
        "confidence": "single_unverified",
        "last_report_time": two_hours_ago
    }
    # 50 + (2.0 * 5.0) = 60.0
    score = priority_score(site, now)
    assert score == 60.0


def test_format_reasoning_fixed_template():
    site = {
        "estimated_population": 180,
        "urgency_flags": ["elderly_present", "pregnancy"],
        "severity": "high",
        "priority_score": 275.0
    }
    reasoning = format_reasoning(site)
    assert reasoning == "Priority score 275: population 180, flags: elderly_present, pregnancy, severity: high"
