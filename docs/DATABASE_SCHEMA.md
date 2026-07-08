# Database Schema Specification
## Project: SwasthyaEHR — FHIR-Enabled Hospital EHR & Pharmacy Safety System

> **This is the single source of truth for the database.** Every Django model,
> serializer, API payload, and FHIR mapping must match the tables below. If any
> other document contradicts this file, **this file wins** — raise an issue instead
> of guessing.

**Engine:** PostgreSQL 16.x · **ORM:** Django 5.x

---

## 1. Table Overview

| Table (Django model) | Purpose |
| :-- | :-- |
| `core_staff` (`Staff`) | Hospital employees who log in (admin, doctor, lab tech, pharmacist, receptionist). |
| `core_patient` (`Patient`) | Patient demographics + allergies. |
| `core_laborder` (`LabOrder`) | A doctor's request for a lab test (the "to-do" for the lab). |
| `core_labobservation` (`LabObservation`) | The completed lab result entered by a lab tech. |
| `core_prescription` (`Prescription`) | A medication order written by a doctor. |

**Relationships (plain English):**
- A `Patient` can have many `LabOrder`s, many `LabObservation`s, and many `Prescription`s.
- A `LabOrder` (from a Doctor) can be fulfilled by one `LabObservation` (from a Lab Tech).
- A `Prescription` is written by a `Staff` (doctor) and fulfilled by a `Staff` (pharmacist).

```
Staff (doctor) ──writes──► Prescription ──for──► Patient
Staff (doctor) ──creates─► LabOrder ──────for──► Patient
LabOrder ──fulfilled by──► LabObservation ──for► Patient
Staff (pharmacist) ─fulfills─► Prescription
```

---

## 2. Conventions (apply to every table)

- **Primary key:** every table uses a `UUIDv4` field named `id` (never expose sequential
  integer IDs on public routes). In Django:
  `id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`
- **Timestamps:** every table has:
  - `created_at = models.DateTimeField(auto_now_add=True)`
  - `updated_at = models.DateTimeField(auto_now=True)`
- **Enums:** stored as `CharField(choices=...)` with UPPER_SNAKE_CASE values.

---

## 3. `core_staff` (model `Staff`)

Staff extend Django's authentication. Recommended approach: a **custom User model**
(`AbstractUser`) so `role` lives on the user and JWT can read it directly.

| Column | Type | Constraints | Notes |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | |
| `username` | varchar(150) | unique, required | login handle |
| `password` | varchar | required | Django-hashed, never stored plain |
| `full_name` | varchar(255) | required | display name |
| `email` | varchar(254) | optional, unique-if-present | |
| `role` | varchar(20) | required, choices | see Role enum below |
| `is_active` | boolean | default `true` | deactivate = soft delete of a key |
| `created_at` | timestamptz | auto | |
| `updated_at` | timestamptz | auto | |

**Role enum (`role`):**
```
ADMIN | RECEPTIONIST | DOCTOR | LAB_TECH | PHARMACIST | PATIENT
```
> `PATIENT` accounts are optional in v1 — patients can self-register a *profile*
> (a `core_patient` row) without necessarily having a login. If you implement the
> patient portal login, a `Staff`-like auth row with `role=PATIENT` links to their
> `core_patient` record via `patient_id`. Keep this simple: for v1 the portal can be
> a stretch goal; receptionist/doctor flows are the priority.

---

## 4. `core_patient` (model `Patient`)

| Column | Type | Constraints | Notes |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | internal key |
| `hospital_identifier` | varchar(20) | unique, auto-generated | format `HOSP-YYYY-NNNNN` |
| `first_name` | varchar(100) | required | |
| `last_name` | varchar(100) | required | |
| `phone_number` | varchar(20) | required | e.g. `+977-98XXXXXXXX` |
| `date_of_birth` | date | required | `YYYY-MM-DD` |
| `gender` | varchar(10) | required, choices | `male` / `female` / `other` / `unknown` (lowercase — FHIR requirement) |
| `allergies` | JSONB | default `[]` | **array of fixed allergen strings** — see §7 |
| `registered_by` | varchar(20) | required | `SELF` (public form) or `RECEPTIONIST` |
| `created_at` | timestamptz | auto | |
| `updated_at` | timestamptz | auto | |

**Indexing:** attach a **GIN index** to `allergies` so the safety engine searches the
array quickly:
```python
class Meta:
    indexes = [GinIndex(fields=["allergies"])]
```

**`hospital_identifier` generation:** `HOSP-` + current year + `-` + zero-padded
sequence (e.g. `HOSP-2026-00142`). Generate inside the model `save()` or a service
function; keep it unique.

---

## 5. `core_laborder` (model `LabOrder`)

The doctor's request. This is the "pending order" the lab tech sees in their queue.

| Column | Type | Constraints | Notes |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | |
| `patient_id` | UUID | FK → `core_patient.id`, required | |
| `ordered_by_id` | UUID | FK → `core_staff.id`, required | the doctor |
| `test_name` | varchar(50) | required, choices | `HEMOGLOBIN` / `WBC` / `PLATELETS` |
| `loinc_code` | varchar(20) | required | auto-set from test (see §6) |
| `status` | varchar(20) | default `PENDING` | `PENDING` → `COMPLETED` |
| `priority` | varchar(10) | default `ROUTINE` | `ROUTINE` / `URGENT` (drives queue sort) |
| `created_at` | timestamptz | auto | |
| `updated_at` | timestamptz | auto | |

---

## 6. `core_labobservation` (model `LabObservation`)

The completed result. Feeds the FHIR `Observation` resource.

| Column | Type | Constraints | Notes |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | |
| `patient_id` | UUID | FK → `core_patient.id`, required | |
| `lab_order_id` | UUID | FK → `core_laborder.id`, optional | links back to the request |
| `entered_by_id` | UUID | FK → `core_staff.id`, required | the lab tech |
| `test_name` | varchar(50) | required, choices | `HEMOGLOBIN` / `WBC` / `PLATELETS` |
| `loinc_code` | varchar(20) | required | see reference table below |
| `result_value` | decimal(7,2) | required, numeric only | validated against valid range |
| `result_unit` | varchar(20) | required | see reference table below |
| `created_at` | timestamptz | auto | becomes FHIR `effectiveDateTime` |
| `updated_at` | timestamptz | auto | |

**Lab Test Reference (hardcode this as constants):**

| Test (`test_name`) | LOINC (`loinc_code`) | Valid range | Unit (`result_unit`) |
| :-- | :-: | :-: | :-- |
| `HEMOGLOBIN` | `718-7` | 0.00 – 25.00 | `g/dL` |
| `WBC` | `6690-2` | 0.00 – 50.00 | `10^3/uL` |
| `PLATELETS` | `777-3` | 0.00 – 1000.00 | `10^3/uL` |

**Validation rule:** reject non-numeric input and any value outside the valid range
with `HTTP 400`.

---

## 7. `core_prescription` (model `Prescription`)

| Column | Type | Constraints | Notes |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | |
| `patient_id` | UUID | FK → `core_patient.id`, required | |
| `prescribed_by_id` | UUID | FK → `core_staff.id`, required | the doctor |
| `fulfilled_by_id` | UUID | FK → `core_staff.id`, optional | the pharmacist |
| `medication_name` | varchar(200) | required | free text (the drug ordered) |
| `dosage_instruction` | varchar(500) | required | e.g. "1 tablet every 8h for 7 days" |
| `status` | varchar(20) | default `ACTIVE` | `ACTIVE` → `COMPLETED` |
| `fulfilled_at` | timestamptz | optional | set when pharmacist dispenses |
| `created_at` | timestamptz | auto | |
| `updated_at` | timestamptz | auto | |

---

## 8. The Allergy Vocabulary (fixed list)

Free-text allergies are **prohibited** (prevents typos that would defeat the safety
engine). The `allergies` JSONB array may only contain these exact strings:

```
Penicillin | Sulfa Drugs | Aspirin | NSAIDs | Anticonvulsants | None
```

- `None` is the default safe state and means "no known allergies."
- Store as an array, e.g. `["Penicillin", "NSAIDs"]`.

---

## 9. The Clinical Safety Interceptor (how it reads the data)

When a doctor submits a `Prescription`, inside a single `@transaction.atomic` block:

1. Fetch `core_patient.allergies` for the target patient.
2. Compare `medication_name` against each allergen using a **case-insensitive substring
   match** (e.g. `"Penicillin G"` matched against `"Penicillin"` → **BLOCK**).
3. If any allergen matches → **roll back**, save nothing, return `HTTP 400` with the
   safety-alert payload (see API_SPECIFICATION.md §2.3).
4. If no match → commit the prescription and push it to the pharmacist queue.

> **Honest limitation (write this in your report):** substring matching is simple and
> can produce false positives (a drug name that merely contains an allergen word) or
> miss brand-name synonyms. A production system would use a coded drug database
> (RxNorm) and a curated cross-reactivity table. For this project, the fixed allergen
> vocabulary keeps the match reliable enough to demonstrate the concept.

---

## 10. Column → API → FHIR Traceability

This table proves the docs are consistent. Any change here must be reflected in
`API_SPECIFICATION.md` and `FHIR_MAPPING.md`.

| DB column | Flat API field | FHIR path |
| :-- | :-- | :-- |
| `patient.first_name` | `first_name` | `Patient.name[0].given[0]` |
| `patient.last_name` | `last_name` | `Patient.name[0].family` |
| `patient.phone_number` | `phone_number` | `Patient.telecom[0].value` |
| `patient.gender` | `gender` | `Patient.gender` |
| `patient.date_of_birth` | `date_of_birth` | `Patient.birthDate` |
| `patient.hospital_identifier` | `hospital_identifier` | `Patient.identifier[0].value` |
| `labobservation.loinc_code` | `loinc_code` | `Observation.code.coding[0].code` |
| `labobservation.result_value` | `result_value` | `Observation.valueQuantity.value` |
| `labobservation.result_unit` | `result_unit` | `Observation.valueQuantity.unit` |
| `labobservation.created_at` | `created_at` | `Observation.effectiveDateTime` |
