from datetime import datetime, timezone
from typing import Dict, Any, List


def priority_score(site: Dict[str, Any], now: datetime) -> float:
    """
    Deterministic scoring engine:
    Score = (population * 1.0) + sum(urgency_weights) + severity_weights + confidence_bonus + (wait_hours * 5.0)
    """
    score = float(site.get("estimated_population", 0) or 0) * 1.0

    urgency_weights = {
        "injury_reported": 50.0,
        "pregnancy": 40.0,
        "water_rising": 30.0,
        "stranded_no_exit": 30.0,
        "elderly_present": 15.0,
        "children_present": 15.0,
    }
    flags = site.get("urgency_flags", [])
    if isinstance(flags, list):
        score += sum(urgency_weights.get(f, 0.0) for f in flags)

    severity_weights = {
        "critical": 50.0,
        "high": 30.0,
        "medium": 10.0,
        "low": 0.0,
    }
    severity = site.get("severity")
    if severity and isinstance(severity, str):
        score += severity_weights.get(severity.lower(), 0.0)

    if site.get("confidence") == "corroborated":
        score += 10.0

    last_time = site.get("last_report_time")
    if last_time:
        if isinstance(last_time, str):
            try:
                last_time = datetime.fromisoformat(last_time.replace("Z", "+00:00"))
            except Exception:
                last_time = now
        if last_time.tzinfo is None:
            last_time = last_time.replace(tzinfo=timezone.utc)
        current_time = now if now.tzinfo is not None else now.replace(tzinfo=timezone.utc)
        hours_since_report = max(0.0, (current_time - last_time).total_seconds() / 3600.0)
        score += hours_since_report * 5.0

    return round(score, 2)


def format_reasoning(site: Dict[str, Any]) -> str:
    """
    Fixed-format reasoning string generator required by API contract and frontend display:
    'Priority score {score}: population {pop}, flags: {flags}, severity: {sev}'
    """
    pop = site.get("estimated_population", 0)
    score = site.get("priority_score", 0.0)
    
    parts = [f"population {pop}"]
    flags = site.get("urgency_flags", [])
    if flags and isinstance(flags, list):
        parts.append(f"flags: {', '.join(flags)}")
    severity = site.get("severity")
    if severity:
        parts.append(f"severity: {severity}")
    
    return f"Priority score {score:.0f}: " + ", ".join(parts)
