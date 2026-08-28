# Feature Plan: Report Ingestion, AI Extraction & Gazetteer Geocoding
**File:** `features-backend/REPORT_INGESTION_AND_EXTRACTION_PLAN.md`
**Module:** `app.api.routes.reports`, `app.services.extraction.*`, `app.schemas.report`
**Primary Endpoints:** `POST /api/reports`, `POST /api/reports/{id}/extract`, `PATCH /api/reports/{id}`, `GET /api/reports`

---

## 1. Feature Overview & Functional Objective
Enables field report intake from unstructured SMS/WhatsApp messages or direct structured coordinator inputs. Implements the "AI as Extractor, Never Decision-Maker" principle:
1. Accepts raw text or structured form submissions.
2. Fast-path: When `structured_fields` is provided, skips LLM extraction and creates/confirms a Site immediately.
3. Slow-path: Runs structured LLM tool-calling (via Qwen on Alibaba Cloud) to extract `location_name`, `estimated_population`, `needs`, and `urgency_flags`.
4. Gazetteer Geocoding: Fuzzy-matches extracted village/settlement names against the district gazetteer dataset using `rapidfuzz`. Unmatched locations require manual pin-drop fallback.
5. Human Confirmation: The coordinator verifies, corrects, and confirms extracted data via `PATCH /api/reports/{id}` before it ever touches the planning engine.

---

## 2. SOLID Architectural Mapping

- **Single Responsibility Principle (SRP):**
  - `services/extraction/base.py`: Declares abstract extraction interface.
  - `services/extraction/qwen_provider.py`: Handles Alibaba Cloud Qwen API requests with tool/function-calling schemas.
  - `services/extraction/gemma_provider.py`: Stubbed local Ollama Gemma interface for stretch goal.
  - `services/geocoding.py`: Handles gazetteer lookup, fuzzy matching (`rapidfuzz`), and normalization.
  - `routes/reports.py`: Handles HTTP transport, validation, and database state transitions.
- **Open/Closed Principle (OCP):**
  - Adding new extraction backends (e.g., Gemini, DeepSeek, local Ollama) only requires subclassing `ExtractionProvider` without touching existing route handlers.
- **Liskov Substitution Principle (LSP):**
  - Any `ExtractionProvider` implementation can be substituted interchangeably and satisfies `extract(raw_text: str) -> ExtractedReport`.
- **Interface Segregation Principle (ISP):**
  - Extraction service contract receives only `raw_text: str` and returns structured `ExtractedReport`, keeping it decoupled from database models.
- **Dependency Inversion Principle (DIP):**
  - Report routes receive `ExtractionProvider` via FastAPI dependency injection (`Depends(get_extraction_provider)`), configured centrally in `core/config.py`.

---

## 3. API Contract Specifications

### `POST /api/reports`
- **Request (`ReportCreateRequest`):**
  ```json
  {
    "center_id": 3,
    "source": "manual",
    "raw_text": "Chak 45 near Rajanpur, water entered 3 hours ago, 150 families on rooftops...",
    "structured_fields": {
      "location_name": "Chak 45",
      "headcount": 175,
      "severity": "high",
      "needs": ["food", "medical_evacuation"]
    }
  }
  ```
- **Success `201 Created` (`ReportCreateResponse`):**
  ```json
  {
    "report_id": 42,
    "status": "pending_extraction"
  }
  ```
- **Fast-Path Behavior:** If `structured_fields` is provided, directly insert confirmed `Site` (`estimated_population = headcount`, `severity = severity`) and return `{"report_id": 42, "status": "confirmed"}`.
- **Errors:** `422 Unprocessable Entity` if both `raw_text` and `structured_fields` are missing.

### `POST /api/reports/{id}/extract`
- **Success `200 OK` (`ExtractReportResponse`):**
  ```json
  {
    "report_id": 42,
    "extracted": {
      "location_name": "Chak 45",
      "estimated_population": 175,
      "needs": ["food", "medical_evacuation"],
      "urgency_flags": ["elderly_present", "pregnancy"],
      "confidence": "single_unverified"
    },
    "geocode_status": "matched"
  }
  ```
- **Errors:**
  - `404 Not Found`: Report ID does not exist.
  - `409 Conflict`: `{"detail": "Report already extracted"}`.
  - `503 Service Unavailable`: `{"detail": "Extraction provider unavailable"}`.

### `PATCH /api/reports/{id}`
- **Request (`ReportConfirmRequest`):**
  ```json
  {
    "location_name": "Chak 45",
    "lat": 29.15,
    "lng": 70.38,
    "estimated_population": 180,
    "needs": ["food", "medical_evacuation"],
    "urgency_flags": ["elderly_present"],
    "status": "confirmed"
  }
  ```
- **Success `200 OK` (`ReportConfirmResponse`):**
  ```json
  {
    "site_id": 17,
    "status": "confirmed"
  }
  ```
- **Errors:** `422 Unprocessable Entity` if `status=confirmed` but `lat` or `lng` is null.

### `GET /api/reports?center_id=3&status=pending`
- **Success `200 OK`:**
  ```json
  [
    {
      "report_id": 42,
      "raw_text": "Chak 45 near Rajanpur...",
      "status": "pending_extraction",
      "created_at": "2026-08-22T07:05:00Z"
    }
  ]
  ```

---

## 4. Edge Cases & Exception Handling

| Edge Case / Failure Mode | Root Cause | Handling Strategy & Mitigation |
| :--- | :--- | :--- |
| **Missing both `raw_text` and `structured_fields`** | Malformed client submission. | FastAPI Pydantic root validator raises `ValueError("A report must contain either raw_text or structured_fields")` resulting in clean `422`. |
| **Empty or Gibberish Free Text** | Short noise or typo SMS messages (*"test"*, *"urgent"*). | Qwen tool schema requires `location_name` and `needs`. If the model fails extraction or returns empty location, catch and return `geocode_status: unmatched` with empty flags, allowing human coordinator editing. |
| **Multilingual / Roman Urdu Text** | Reports submitted in Roman Urdu (*"pani charh raha hai bache phanse hain"*). | In Qwen tool system prompt, explicitly instruct normalization of Roman Urdu terms into standardized English enum values (`water_rising`, `children_present`). |
| **Gazetteer Name Misspelling / Alias** | Regional dialect spelling variations (*"Chak Forty-Five"*, *"Chuk 45"*). | `rapidfuzz.process.extractOne` with token sort ratio and a match threshold (e.g. 75%). If score ≥ 75, return matched coordinates. If score < 75, return `geocode_status: unmatched`. |
| **Extraction Provider Timeout or 5xx** | Network outage or Alibaba Cloud rate limits. | Wrap HTTP call with 8-second timeout. Catch `httpx.RequestError` and raise `HTTPException(status_code=503, detail="Extraction provider unavailable")`. |
| **Double Extraction Race Condition** | Coordinator taps "Process" twice rapidly. | Wrap in DB check: if `report.status != 'pending_extraction'`, raise `409 Conflict: {"detail": "Report already extracted"}`. |
| **Confirming report without coordinates** | User tries to confirm when geocoding returned unmatched. | Explicit validation check in `PATCH /api/reports/{id}`: if `status == 'confirmed'` and (`lat is None` or `lng is None`), raise `HTTPException(status_code=422, detail="Coordinates (lat/lng) are required to confirm a site")`. |

---

## 5. Explicit Field Mapping & Database Sync

1. **`structured_fields.headcount` → `sites.estimated_population`:**
   ```python
   # Explicit mapping rule in routes/reports.py
   estimated_population = report_in.structured_fields.headcount
   ```
2. **`structured_fields.severity` → `sites.severity`:**
   Stored as nullable column on `sites`. Only populated via manual entry; AI extraction leaves this `None`.
3. **Corroboration Trigger:**
   When a new report is confirmed for a site within 500m and identical normalized name, update existing site `confidence = 'corroborated'` and merge `urgency_flags`.

---

## 6. Implementation Steps & Verification Plan

1. **Provider Abstraction:** Implement `ExtractionProvider` in `app/services/extraction/base.py`.
2. **Qwen Implementation:** Implement `QwenProvider` with function calling schema in `app/services/extraction/qwen_provider.py`.
3. **Geocoding Service:** Implement `GeocodingService` using `rapidfuzz` against gazetteer data.
4. **Report Routes:** Implement `POST /api/reports`, `POST /api/reports/{id}/extract`, `PATCH /api/reports/{id}`, and `GET /api/reports`.
5. **Unit & Integration Tests:** Test fast-path structured insertion, Qwen extraction mock, gazetteer fuzzy matching, and unconfirmed coordinate validation.
