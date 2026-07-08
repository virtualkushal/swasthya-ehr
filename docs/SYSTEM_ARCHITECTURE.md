# System Architecture Specification
## Project: SwasthyaEHR — FHIR-Enabled Hospital EHR & Pharmacy Safety System

---

## 1. Architectural Pattern

SwasthyaEHR is a **decoupled, API-first, 3-tier web application**:

- **Presentation Tier** — a single React (Vite) SPA. After login it reads the user's role
  and renders the matching dashboard. It is oblivious to database design and talks only
  via stateless HTTPS/JSON.
- **Application Logic Tier** — Django 5.x + DRF. Handles auth, RBAC, the safety
  interceptor, and both flat + FHIR serialization.
- **Data Persistence Tier** — PostgreSQL 16, with a `JSONB` column + GIN index for
  allergies.

> **Design decision:** ONE React application (not two). All six roles share one codebase;
> routing and RBAC decide what each user sees. The public patient-registration page and
> the internal staff dashboards are simply different routes within the same SPA.

### Component Blueprint

```
+---------------------------------------------------------------+
|                       PRESENTATION TIER                        |
|   Single React + Vite SPA  (dev server on port 3000)           |
|                                                                |
|   Public routes:  /  /register  /login                         |
|   Role routes:    /admin /reception /doctor /lab /pharmacy     |
|                   /portal (patient, stretch)                    |
+---------------------------------------------------------------+
                          |
                          |  HTTPS / REST (JSON)
                          v
+---------------------------------------------------------------+
|                    APPLICATION LOGIC TIER                      |
|   Django 5.x + DRF  (dev server on port 8000)                  |
|                                                                |
|     1. Middleware / CORS / XSS sanitation                      |
|     2. JWT Authentication  -> 401 if missing/expired           |
|     3. RBAC (EnforceStrictRole) -> 403 if wrong role           |
|     4. Clinical Safety Interceptor (atomic prescription check) |
|     5. Serialization:                                          |
|          - Flat serializers  (/api/v1/*)                       |
|          - FHIR serializers  (/api/fhir/v1/*)                  |
+---------------------------------------------------------------+
                          |
                          |  Django ORM
                          v
+---------------------------------------------------------------+
|                     DATA PERSISTENCE TIER                      |
|   PostgreSQL 16  (port 5432)                                   |
|                                                                |
|     - Relational tables: Staff, Patient, LabOrder,             |
|       LabObservation, Prescription                            |
|     - JSONB allergies column + GIN index                       |
+---------------------------------------------------------------+
```

---

## 2. Tier Details

### 2.1 Presentation Tier (React SPA)
- **Framework:** React 18 via Vite (fast dev reload, optimized production bundle).
- **Styling:** Tailwind CSS (see FRONTEND_SPEC.md §5 for the anti-"AI-look" design rules).
- **State/session:**
  - `AuthContext` — holds the JWT and current user identity/role, and injects the bearer
    token into every outgoing request via an axios interceptor.
  - Local component state for view-specific data, to avoid full-screen re-renders.
- **Networking boundary:** components collect/render data; **all** axios calls live in
  `src/services/api.js`.
- **Dev proxy:** `vite.config.js` proxies `/api` → `http://localhost:8000` to avoid CORS
  friction during development.

### 2.2 Application Logic Tier (Django + DRF)
Request pipeline, in order:
1. **Middleware / CORS** — allows the React origin, strips unsafe input.
2. **JWT Authentication** — reads `Authorization: Bearer <token>`; rejects with `401` if
   missing/expired.
3. **RBAC (`EnforceStrictRole`)** — compares the user's role to the view's `allowed_roles`;
   rejects with `403` on mismatch.
4. **Safety Interceptor** — for prescription creation, runs the atomic allergy check.
5. **Serialization** — flat serializers for `/api/v1/`, FHIR serializers for
   `/api/fhir/v1/`.

Code layout:
```
backend/core/
├── models.py
├── permissions.py            # EnforceStrictRole
├── services/
│   └── safety.py             # allergy cross-match logic
├── serializers/
│   ├── flat_serializers.py
│   └── fhir_serializers.py   # to_representation() overrides
└── views/
    ├── auth_views.py
    ├── patient_views.py
    ├── lab_views.py
    ├── prescription_views.py
    └── fhir_views.py
```

### 2.3 Data Persistence Tier (PostgreSQL)
- Relational tables with UUID PKs and FKs (see DATABASE_SCHEMA.md).
- Allergies stored as a `JSONB` array (no separate lookup table needed).
- **GIN index** on the allergies column speeds up the safety engine's membership checks.

---

## 3. Core Data Flows

### 3.1 Intercepted Prescription Flow (Safety Engine)
Must run inside a single `@transaction.atomic` block.

```
Doctor picks patient + types medication
        |
        v
React POST /api/v1/prescriptions/
        |
        v
JWT auth  ->  RBAC (DOCTOR)  ->  open transaction
        |
        v
Fetch patient.allergies (JSONB)
        |
        v
Does medication match any allergen? (case-insensitive substring)
   |                                   |
  YES                                  NO
   |                                   |
   v                                   v
ROLLBACK, save nothing            COMMIT prescription
Return HTTP 400 safety payload    Return HTTP 201
   |                                   |
   v                                   v
React shows red AllergyBanner     Push to pharmacist queue
```

### 3.2 Lab → FHIR Flow
1. Doctor creates a `LabOrder` (`POST /api/v1/lab-orders/`) → appears in lab queue.
2. Lab tech enters a numeric result (`POST /api/v1/lab-observations/`); backend validates
   range, stores the row, marks the order `COMPLETED`.
3. An interoperability client hits `GET /api/fhir/v1/Observation/<id>/`.
4. The FHIR serializer builds a standards-compliant `Observation` (LOINC coding,
   `valueQuantity`, category) and responds with `Content-Type: application/fhir+json`.
5. `GET /api/fhir/v1/Patient/<id>/$everything/` returns a `Bundle` of the patient plus all
   their observations.

---

## 4. Port & Networking Matrix (local dev)

| Component | Port |
| :-- | :-- |
| React SPA (Vite dev server) | `3000` |
| Django API gateway | `8000` |
| PostgreSQL engine | `5432` |

---

## 5. Security Notes
- The frontend hiding a button is **never** the security boundary — every rule is
  re-checked server-side by `EnforceStrictRole`.
- Patient-facing reads are additionally object-scoped so a patient can only read their own
  rows (see RBAC_AND_ROLES.md §3).
- Secrets (`SECRET_KEY`, DB password) live in a git-ignored `.env` file.
