# Feature Plan: Authentication & Support Center Management
**File:** `features-backend/AUTH_AND_CENTERS_PLAN.md`
**Module:** `app.api.routes.auth`, `app.api.routes.centers`, `app.core.security`, `app.api.deps`
**Primary Endpoints:** `POST /api/auth/login`, `GET /api/centers`

---

## 1. Feature Overview & Functional Objective
Provides secure, token-based authentication for district relief coordinators and administrators, binding every active session to a specific Support Center (e.g., Rajanpur Support Center `RJP-01`). Ensures multi-tenant isolation across districts so coordinators only operate on their center's reports, sites, depots, dispatches, and damaged roads.

---

## 2. SOLID Architectural Mapping

- **Single Responsibility Principle (SRP):**
  - `core/security.py`: Exclusively handles cryptographic operations (password verification/hashing via bcrypt, JWT token generation/decoding).
  - `routes/auth.py`: Exclusively handles the login request cycle, credential verification, and token issuance.
  - `routes/centers.py`: Exclusively handles center listing and metadata retrieval.
  - `api/deps.py`: Exclusively handles dependency injection for database sessions, JWT validation, and current user/center context.
- **Open/Closed Principle (OCP):**
  - Authentication schemes and token validators are extensible to support OAuth / SSO / API-key access without modifying endpoint route handlers.
- **Liskov Substitution Principle (LSP):**
  - Standardized user identity models adhere to a common principal contract, allowing role-based access control (RBAC: `coordinator`, `admin`) to be uniformly evaluated.
- **Interface Segregation Principle (ISP):**
  - Clean separation between minimal token payloads and full user entity profiles. Route dependencies request only what they need (e.g., `get_current_center_id` vs `get_current_active_user`).
- **Dependency Inversion Principle (DIP):**
  - Routes depend on abstract FastAPI `Depends` providers rather than instantiating database connections or authentication handlers directly.

---

## 3. API Contract Specifications

### `POST /api/auth/login`
- **Request Body (`LoginRequest`):**
  ```json
  {
    "center_code": "RJP-01",
    "username": "bilal",
    "password": "strongpassword123"
  }
  ```
- **Success Response `200 OK` (`LoginResponse`):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "role": "coordinator",
    "center_id": 3,
    "center_name": "Rajanpur Support Center"
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: `{"detail": "Incorrect username or password"}`
  - `404 Not Found`: `{"detail": "Center code not found"}`
  - `422 Unprocessable Entity`: Validation error for missing required fields.

### `GET /api/centers`
- **Request:** Header `Authorization: Bearer <token>`
- **Success Response `200 OK` (`List[CenterResponse]`):**
  ```json
  [
    {
      "id": 3,
      "code": "RJP-01",
      "name": "Rajanpur Support Center",
      "region": "Punjab",
      "lat": 29.10,
      "lng": 70.33
    }
  ]
  ```

---

## 4. Edge Cases & Exception Handling

| Edge Case / Failure Mode | Root Cause | Handling Strategy & Mitigation |
| :--- | :--- | :--- |
| **Invalid Center Code vs Invalid Username** | Attackers attempting user enumeration or center probing. | Look up Center first. If center does not exist, return `404: Center code not found`. If center exists but username/password does not match, return standard `401: Incorrect username or password`. |
| **User belongs to a different center than supplied `center_code`** | Cross-center credential misuse. | In the query, verify `user.center_id == center.id`. If mismatched, return `401: Incorrect username or password` without leaking cross-center existence. |
| **Expired or Malformed JWT Token** | Expired session, token truncation, invalid signature. | `deps.get_current_user` catches `JWTError` / `ExpiredSignatureError` and returns `401: Could not validate credentials` with header `WWW-Authenticate: Bearer`. |
| **Center with missing coordinates** | Incomplete seeding or admin misconfiguration. | Center schema enforces non-nullable `lat`, `lng`, `code`, `name`. Fallback defaults provided in seed migrations. |
| **Concurrent coordinator logins for same center** | Multiple field operators logging into same command center. | System is stateless; JWT allows concurrent valid sessions without clobbering each other. |

---

## 5. Implementation Steps & Verification Plan

1. **Pydantic Schemas:** Define `LoginRequest`, `LoginResponse`, `CenterResponse`, `TokenData` in `app/schemas/auth.py` and `app/schemas/center.py`.
2. **Core Security:** Implement `verify_password()`, `get_password_hash()`, and `create_access_token()` in `app/core/security.py` using `passlib[bcrypt]` and `python-jose`.
3. **Dependency Injection:** Implement `get_db`, `get_current_user`, and `get_current_center` in `app/api/deps.py`.
4. **Route Handlers:** Implement `routes/auth.py` and `routes/centers.py`.
5. **Testing:** Unit test token generation and verification; integration test valid login, invalid center, invalid credentials, and protected center listing.
