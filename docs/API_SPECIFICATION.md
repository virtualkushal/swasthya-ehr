# REST API Specification
## Project: SwasthyaEHR — FHIR-Enabled Hospital EHR & Pharmacy Safety System

---

## 1. Global Rules

**Base URL (local dev):** `http://localhost:8000`

**Two endpoint families:**
- `/api/v1/...` — flat JSON, used by the React app for all reads/writes.
- `/api/fhir/v1/...` — read-only FHIR R4 export (see FHIR_MAPPING.md).

**Standard headers:**
```http
Content-Type: application/json
Authorization: Bearer <json_web_token>
```

**Standard error envelope** (all non-2xx except the special safety alert):
```json
{
  "error": true,
  "status_code": 403,
  "message": "Human-readable explanation."
}
```

**Common status codes:** `200 OK`, `201 Created`, `400 Bad Request`,
`401 Unauthorized` (missing/expired token), `403 Forbidden` (wrong role),
`404 Not Found`.

---

## 2. Authentication (JWT)

### 2.1 Login — obtain tokens
- **POST** `/api/v1/auth/login/`
- **Access:** public
- **Request:**
```json
{ "username": "dr_sita", "password": "••••••••" }
```
- **Success (200):**
```json
{
  "access": "<jwt_access_token>",
  "refresh": "<jwt_refresh_token>",
  "user": {
    "id": "uuid",
    "full_name": "Dr. Sita Sharma",
    "role": "DOCTOR"
  }
}
```
- **Failure (401):** invalid credentials.

### 2.2 Refresh access token
- **POST** `/api/v1/auth/refresh/`
- **Access:** any holder of a valid refresh token
- **Request:** `{ "refresh": "<jwt_refresh_token>" }`
- **Success (200):** `{ "access": "<new_jwt_access_token>" }`

### 2.3 Current user profile
- **GET** `/api/v1/auth/me/`
- **Access:** any authenticated user
- **Success (200):** the `user` object shown in 2.1.

---

## 3. Staff Management (Admin)

### 3.1 List / create staff
- **GET** `/api/v1/auth/staff/` — list all staff (ADMIN only)
- **POST** `/api/v1/auth/staff/` — create staff (ADMIN only)
- **Request:**
```json
{
  "username": "lab_ram",
  "password": "••••••••",
  "full_name": "Ram Thapa",
  "email": "ram@hospital.org.np",
  "role": "LAB_TECH"
}
```
- **Success (201):** `{ "id": "uuid", "username": "lab_ram", "role": "LAB_TECH", "is_active": true }`

### 3.2 Deactivate / update staff
- **PATCH** `/api/v1/auth/staff/<id>/` — ADMIN only
- **Request:** `{ "is_active": false }`
- **Success (200):** updated staff object.

---

## 4. Patients

### 4.1 Register patient (dual-channel)
- **POST** `/api/v1/patients/`
- **Access:** `ADMIN`, `RECEPTIONIST`, `PATIENT` (public self-registration)
- **Request:**
```json
{
  "first_name": "Sita",
  "last_name": "Kumari",
  "phone_number": "+977-9803XXXXXX",
  "date_of_birth": "1988-11-23",
  "gender": "female",
  "allergies": ["Penicillin", "NSAIDs"]
}
```
- **Success (201):**
```json
{
  "id": "3a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
  "hospital_identifier": "HOSP-2026-00142",
  "status": "persisted_successfully"
}
```
> `allergies` may only contain values from the fixed vocabulary (DATABASE_SCHEMA.md §8).
> `registered_by` is set by the backend from the caller's role (`SELF` vs `RECEPTIONIST`).

### 4.2 List / search patients
- **GET** `/api/v1/patients/?search=<name_or_hospital_id>`
- **Access:** `DOCTOR`, `RECEPTIONIST`, `PHARMACIST` (read)
- **Success (200):** array of patient summary objects.

### 4.3 Get single patient
- **GET** `/api/v1/patients/<id>/`
- **Access:** `DOCTOR`, `PHARMACIST` (read); `PATIENT` (own record only, token-scoped)
- **Success (200):** full patient object including `allergies`.

---

## 5. Lab Orders (Doctor → Lab queue)

### 5.1 Create lab order
- **POST** `/api/v1/lab-orders/`
- **Access:** `DOCTOR`
- **Request:**
```json
{
  "patient_id": "3a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
  "test_name": "HEMOGLOBIN",
  "priority": "ROUTINE"
}
```
- **Success (201):**
```json
{ "id": "uuid", "loinc_code": "718-7", "status": "PENDING" }
```
> Backend auto-fills `loinc_code` from `test_name` and sets `ordered_by` from the JWT.

### 5.2 List pending lab orders (lab queue)
- **GET** `/api/v1/lab-orders/?status=PENDING`
- **Access:** `LAB_TECH` (read)
- **Success (200):** array sorted by `priority` (URGENT first) then `created_at`.

---

## 6. Lab Observations (Lab Tech results)

### 6.1 Submit lab result
- **POST** `/api/v1/lab-observations/`
- **Access:** `LAB_TECH`
- **Request:**
```json
{
  "patient_id": "3a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
  "lab_order_id": "uuid-of-order",
  "test_name": "HEMOGLOBIN",
  "result_value": 14.20
}
```
- **Success (201):**
```json
{ "observation_id": "e3c1b0a4-d9ef-4123-a152-7b8c9d0e1f2a", "status": "recorded" }
```
> Backend fills `loinc_code` and `result_unit` from `test_name`, validates
> `result_value` is numeric and within the valid range, and marks the linked
> `lab_order` as `COMPLETED`.
- **Failure (400):** non-numeric value or value out of range.

### 6.2 List a patient's observations
- **GET** `/api/v1/lab-observations/?patient_id=<id>`
- **Access:** `DOCTOR`, `LAB_TECH`; `PATIENT` (own only)
- **Success (200):** array of observations (used to draw the patient's lab trend chart).

---

## 7. Prescriptions (with Safety Interceptor)

### 7.1 Create prescription
- **POST** `/api/v1/prescriptions/`
- **Access:** `DOCTOR`
- **Request:**
```json
{
  "patient_id": "3a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
  "medication_name": "Penicillin G",
  "dosage_instruction": "Take 1 tablet every 8 hours for 7 days"
}
```
- **Success (201):**
```json
{ "prescription_id": "c1b2a3f4-5e6d-7a8b-9c0d-1e2f3a4b5c6d", "status": "authorized_and_queued" }
```
- **Safety Violation (400)** — returned when `medication_name` matches a patient allergen
  (case-insensitive substring). The whole transaction is rolled back; nothing is saved:
```json
{
  "security_alert": true,
  "violation_type": "DRUG_ALLERGY_MATCH",
  "matched_allergen_token": "Penicillin",
  "message": "CRITICAL ALERT: Transaction Aborted. This medication matches a documented allergy entry on this patient profile!"
}
```

### 7.2 List prescriptions
- **GET** `/api/v1/prescriptions/?status=ACTIVE` — pharmacist dispensing queue
- **Access:** `PHARMACIST` (read active); `DOCTOR` (read own patients); `PATIENT` (own only)
- **Success (200):** array grouped/sortable by patient.

### 7.3 Fulfill (dispense) prescription
- **POST** `/api/v1/prescriptions/<id>/fulfill/`
- **Access:** `PHARMACIST`
- **Request:** `{}` (empty — the ID is in the URL)
- **Success (200):**
```json
{ "prescription_id": "uuid", "status": "COMPLETED", "fulfilled_at": "2026-07-08T18:45:00+05:45" }
```
> Backend sets `status=COMPLETED`, `fulfilled_by` from JWT, and `fulfilled_at=now()`.

---

## 7A. Diagnoses (Doctor's ICD-10 Problem List)

The system only **records** a doctor's chosen diagnosis from a curated ICD-10
list — it never auto-diagnoses. `disease_name` is derived server-side from the
code.

### 7A.1 Get the ICD-10 catalog
- **GET** `/api/v1/icd10/`
- **Access:** any authenticated user (used to populate the searchable dropdown)
- **Success (200):**
```json
{
  "count": 42,
  "results": [
    { "code": "J18.9", "name": "Pneumonia, unspecified" },
    { "code": "E11.9", "name": "Type 2 diabetes mellitus" }
  ]
}
```

### 7A.2 Record a diagnosis
- **POST** `/api/v1/diagnoses/`
- **Access:** `DOCTOR`
- **Request:** (`onset_date` and `notes` are optional)
```json
{
  "patient": "3a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
  "icd10_code": "J18.9",
  "onset_date": "2026-07-01",
  "notes": "Community-acquired; started antibiotics."
}
```
- **Success (201):**
```json
{
  "id": "uuid",
  "icd10_code": "J18.9",
  "disease_name": "Pneumonia, unspecified",
  "clinical_status": "ACTIVE",
  "diagnosed_by_name": "Dr Gurung"
}
```
- **Failure (400):** `icd10_code` not in the catalog.

### 7A.3 List diagnoses
- **GET** `/api/v1/diagnoses/?patient=<id>&status=ACTIVE`
- **Access:** `DOCTOR` (any patient, filterable); `PATIENT` (own only — scoped by
  the linked account, `patient`/`status` filters ignored for safety)
- **Success (200):** array newest-first.

### 7A.4 Resolve a diagnosis
- **POST** `/api/v1/diagnoses/<id>/resolve/`
- **Access:** `DOCTOR`
- **Request:** `{}` (the ID is in the URL)
- **Success (200):** the updated diagnosis with `clinical_status: "RESOLVED"` and
  a `resolved_at` timestamp.

---

## 8. FHIR Endpoints (read-only)


Documented fully in **FHIR_MAPPING.md**. Summary:

| Method | Route | Access | Response Content-Type |
| :-- | :-- | :-- | :-- |
| GET | `/api/fhir/v1/Patient/<id>/` | ADMIN, DOCTOR, PHARMACIST, LAB_TECH | `application/fhir+json` |
| GET | `/api/fhir/v1/Observation/<id>/` | DOCTOR, LAB_TECH | `application/fhir+json` |
| GET | `/api/fhir/v1/Patient/<id>/$everything/` | ADMIN, DOCTOR | `application/fhir+json` |

---

## 9. Endpoint ↔ Role Quick Reference

See **RBAC_AND_ROLES.md** for the authoritative permission matrix. The backend enforces
every rule via the `EnforceStrictRole` permission class — the frontend hiding a button is
never the security boundary.
