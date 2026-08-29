# Feature Plan: Sites Management & Deterministic Prioritization Engine
**File:** `features-backend/SITES_AND_PRIORITIZATION_PLAN.md`
**Module:** `app.api.routes.sites`, `app.services.prioritization`, `app.schemas.site`
**Primary Endpoints:** `GET /api/sites`

---

## 1. Feature Overview & Functional Objective
Manages all verified disaster affected sites and implements the transparent, deterministic priority scoring algorithm. The prioritization engine computes a numeric priority score for every unserved site based on headcount, life-safety urgency flags, manual severity classifications, corroboration confidence, and wait-time decay. It generates standardized, human-readable reasoning strings for command post transparency.

---

## 2. SOLID Architectural Mapping

- **Single Responsibility Principle (SRP):**
  - `services/prioritization.py`: Pure, side-effect-free scoring calculations and reasoning string formatting. Contains zero database queries or HTTP dependencies.
  - `routes/sites.py`: HTTP transport, query filtering by `center_id` and `status`, and serialization.
  - `schemas/site.py`: Pydantic data schemas representing Site entities and filters.
- **Open/Closed Principle (OCP):**
  - Scoring weights (urgency flags, severity levels, time decay factors) are defined in configurable dictionary mappings or environment settings, allowing parameter tuning without altering core evaluation code.
- **Liskov Substitution Principle (LSP):**
  - Scoring function accepts standard dictionaries or Pydantic models matching a common site interface and returns consistent floating-point rankings.
- **Interface Segregation Principle (ISP):**
  - Prioritization function requires only attributes relevant to scoring (`estimated_population`, `urgency_flags`, `severity`, `confidence`, `last_report_time`), isolating it from unrelated site fields (e.g., geohashes, routing metadata).
- **Dependency Inversion Principle (DIP):**
  - Route handlers inject the scoring service and use system clock providers for testability and deterministic time replay.

---

## 3. API Contract Specifications

### `GET /api/sites?center_id=3&status=unserved`
- **Query Parameters:**
  - `center_id`: `integer, optional` (defaults to coordinator's assigned center)
  - `status`: `string, optional` (`unserved`, `planned`, `dispatched`, `delivered`)
- **Success `200 OK` (`List[SiteResponse]`):**
  ```json
  [
    {
      "id": 17,
      "location_name": "Chak 45",
      "lat": 29.15,
      "lng": 70.38,
      "estimated_population": 180,
      "needs": ["food", "medical_evacuation"],
      "urgency_flags": ["elderly_present", "pregnancy"],
      "confidence": "corroborated",
      "priority_score": 245.0,
      "status": "unserved"
    }
  ]
  ```

---

## 4. Deterministic Scoring Algorithm & Reasoning Specification

### The Mathematical Formula:
$$\text{Priority Score} = (\text{population} \times 1.0) + \sum W_{\text{urgency}} + W_{\text{severity}} + W_{\text{confidence}} + (\Delta t_{\text{hours}} \times 5.0)$$

```python
def priority_score(site: dict, now: datetime) -> float:
    # 1. Base population scaling
    score = float(site.get("estimated_population", 0)) * 1.0
    
    # 2. Life-safety urgency weights
    urgency_weights = {
        "injury_reported": 50.0,
        "pregnancy": 40.0,
        "water_rising": 30.0,
        "stranded_no_exit": 30.0,
        "elderly_present": 15.0,
        "children_present": 15.0,
    }
    for flag in site.get("urgency_flags", []):
        score += urgency_weights.get(flag, 0.0)
        
    # 3. Coordinator manual severity weight (nullable for AI-only extractions)
    severity_weights = {
        "critical": 50.0,
        "high": 30.0,
        "medium": 10.0,
        "low": 0.0,
    }
    score += severity_weights.get(site.get("severity"), 0.0)
    
    # 4. Corroboration confidence bonus
    if site.get("confidence") == "corroborated":
        score += 10.0
        
    # 5. Time decay escalation (+5 points per hour unserved)
    last_time = site.get("last_report_time") or now
    if last_time.tzinfo is None:
        last_time = last_time.replace(tzinfo=timezone.utc)
    current_time = now if now.tzinfo is not None else now.replace(tzinfo=timezone.utc)
    
    hours_since_report = max(0.0, (current_time - last_time).total_seconds() / 3600.0)
    score += hours_since_report * 5.0
    
    return round(score, 2)
```

### Canonical Reasoning String Formatter (Fixed Template):
```python
def format_reasoning(site: dict) -> str:
    parts = [f"population {site.get('estimated_population', 0)}"]
    flags = site.get("urgency_flags", [])
    if flags:
        parts.append(f"flags: {', '.join(flags)}")
    if site.get("severity"):
        parts.append(f"severity: {site['severity']}")
    return f"Priority score {site.get('priority_score', 0):.0f}: " + ", ".join(parts)
```

---

## 5. Edge Cases & Exception Handling

| Edge Case / Failure Mode | Root Cause | Handling Strategy & Mitigation |
| :--- | :--- | :--- |
| **Site with 0 or negative population** | Erroneous extraction or manual typo. | Enforce `estimated_population >= 1` in validation; fallback to default score floor in calculation. |
| **Future `last_report_time` timestamp** | Clock skew between client/server or time zone offset discrepancy. | Clamp `hours_since_report = max(0.0, delta)` so negative time decay never subtracts points. Ensure UTC normalization. |
| **Unknown urgency flag in database** | Database migrated with experimental flags. | `urgency_weights.get(flag, 0.0)` safely defaults to 0 without throwing `KeyError`. |
| **Null severity column** | AI extracted reports do not have manual severity. | Use `.get("severity")` safely defaulting to 0 without breaking. |
| **Large number of unserved sites (10,000+)** | Extensive regional disaster. | Vectorize calculations or compute score dynamically with indexed database fields, caching score computations on active sites. |

---

## 6. Implementation Steps & Verification Plan

1. **Prioritization Service:** Create `app/services/prioritization.py` with pure `priority_score()` and `format_reasoning()` functions.
2. **Unit Tests:** Create `tests/test_prioritization.py` verifying:
   - Population baseline weights.
   - Additive urgency flags (`pregnancy` + `water_rising` = +70).
   - Time decay progression over 1h, 4h, 12h.
   - Exact string output from `format_reasoning()`.
3. **Sites Route Handler:** Create `app/api/routes/sites.py` with dynamic score calculation and sorting.
