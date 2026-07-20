# Database Schema Specification (v2)
## Project: SwasthyaEHR — Multi-Department Hospital OPD EHR & FHIR Sharing

> **This is the single source of truth for the database.** Every Django model,
> serializer, API payload, and FHIR mapping must match the tables below. If any
> other document contradicts this file, **this file wins** — raise an issue
> instead of guessing.

**Engine:** PostgreSQL 16.x · **ORM:** Django 5.x
**Scope:** OPD only (IPD = future work). 7 clinical departments, 7 lab categories.

---

## 1. Table Overview

| Table (Django model) | Purpose |
| :-- | :-- |
| `core_staff` (`Staff`) | All login accounts (admin, receptionist, nurse, doctor, lab tech, pharmacist, patient). Custom user model. |
| `core_patient` (`Patient`) | Patient demographics, NID, blood group, free-text allergies. |
| `core_encounter` (`Encounter`) | One OPD visit. The backbone that ties vitals, diagnoses, orders, prescriptions together. |
| `core_vitals` (`Vitals`) | Vitals recorded by a nurse for an encounter (BP, pulse, temp, SpO₂, height, weight, BMI). |
| `core_laborder` (`LabOrder`) | A doctor's request for a test from the catalog (the lab's to-do). |
| `core_labreport` (`LabReport`) | A lab submission for an order: optional uploaded PDF + status. |
| `core_labresult` (`LabResult`) | One test's result (quantitative value+range+flag, OR report text). |
| `core_prescription` (`Prescription`) | A medication order written by a doctor, fulfilled by a pharmacist. |
| `core_diagnosis` (`Diagnosis`) | An ICD-10 coded condition recorded by a doctor. |
| `core_accessrequest` (`AccessRequest`) | Cross-hospital FHIR share request awaiting patient approval. |

**Relationships (plain English):**
- A `Patient` has many `Encounter`s.
- An `Encounter` belongs to one department, one attending doctor; has one `Vitals`,
  and many `Diagnosis` / `LabOrder` / `Prescription` rows.
- A `LabOrder` is fulfilled by one `LabReport`, which holds many `LabResult`s.
- A `Prescription` is written by a doctor (`Staff`) and fulfilled by a pharmacist (`Staff`).
- An `AccessRequest` targets a `Patient` (by NID) and is approved/denied by that patient.

```
Patient ──has──► Encounter ──in──► Department
Encounter ──has one──► Vitals (by Nurse)
Encounter ──has many──► Diagnosis (ICD-10, by Doctor)
Encounter ──has many──► LabOrder (by Doctor) ──fulfilled by──► LabReport ──has──► LabResult(s)
Encounter ──has many──► Prescription (by Doctor) ──fulfilled by──► Pharmacist
Patient ◄──approves── AccessRequest (from external hospital)
```

---

## 2. Conventions (every table)

- **Primary key:** `id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.
- **Timestamps:** `created_at = DateTimeField(auto_now_add=True)`, `updated_at = DateTimeField(auto_now=True)`.
- **Enums:** `CharField(choices=...)` with UPPER_SNAKE_CASE values (see `core/constants.py`).
- **Validation:** enforced in DRF serializers (backend is the source of truth, not the UI).

---

## 3. `core_staff` (model `Staff`) — custom user

Extends `AbstractUser`. **Login is by email for everyone** (`USERNAME_FIELD = "email"`).

| Column | Type | Constraints | Notes |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | |
| `email` | varchar(254) | unique, required | the login identifier |
| `password` | varchar | required | Django-hashed |
| `full_name` | varchar(255) | required | display name |
| `role` | varchar(20) | required, choices | `ADMIN` / `RECEPTIONIST` / `NURSE` / `DOCTOR` / `LAB_TECH` / `PHARMACIST` / `PATIENT` |
| `department` | varchar(30) | optional, choices | required for DOCTOR; the department they work in |
| `status` | varchar(20) | default `PENDING` | `PENDING` → `ACTIVE` → (or `REJECTED`); staff self-register and admin approves |
| `must_change_password` | boolean | default `true` | forces password change on first login |
| `is_active` | boolean | default `true` | soft-disable |
| `created_at` / `updated_at` | timestamptz | auto | |

- `username` is kept (Django internal) but auto-derived from email; not used for login.
- **Onboarding:** staff self-register (`status=PENDING`, cannot log in) → admin approves
  (`status=ACTIVE`, password auto-generated + emailed) → forced change on first login.
- **First admin** is created by the `seed_admin` management command.

---

## 4. `core_patient` (model `Patient`)

| Column | Type | Constraints | Notes |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | |
| `user` | FK → `core_staff` | null, OneToOne | linked login account (role PATIENT) |
| `hospital_identifier` | varchar(20) | unique, auto | `HOSP-YYYY-NNNNN` |
| `national_id` | varchar(20) | unique, required | Nepal NIN; digits only, 10–12 digits (spec TBD) |
| `first_name` / `last_name` | varchar(100) | required | letters/spaces, 2–50 |
| `phone_number` | varchar(20) | required | Nepali format `+977-98XXXXXXXX` |
| `date_of_birth` | date | required | not future; age 0–120 |
| `gender` | varchar(10) | required, choices | `male`/`female`/`other`/`unknown` (lowercase — FHIR) |
| `blood_group` | varchar(10) | required, choices | 8 ABO/Rh groups + `UNKNOWN` (patient-declared) |
| `allergies` | JSONB | default `[]` | **free-text** array of strings (display as red banner; no blocking) |
| `address` | varchar(255) | optional | |
| `emergency_contact_name` | varchar(120) | optional | |
| `emergency_contact_phone` | varchar(20) | optional | |
| `marital_status` | varchar(20) | optional, choices | |
| `occupation` | varchar(120) | optional | |
| `registered_by` | varchar(20) | required | `SELF` or `RECEPTIONIST` |
| `created_at` / `updated_at` | timestamptz | auto | |

- `hospital_identifier`: `HOSP-` + year + `-` + zero-padded sequence.
- **Allergies are free text** in v2 (fixed vocabulary removed). Shown to the doctor as a
  prominent red banner. There is **no** blocking pharmacy interceptor.
- Height/weight live on `Vitals` (per visit), not here.

---

## 5. `core_encounter` (model `Encounter`)

The backbone: one OPD visit.

| Column | Type | Constraints | Notes |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | |
| `patient` | FK → `core_patient` | required | |
| `department` | varchar(30) | required, choices | one of the 7 departments |
| `attending_doctor` | FK → `core_staff` | null | the doctor (role DOCTOR, matching department) |
| `created_by` | FK → `core_staff` | required | the receptionist who checked the patient in |
| `visit_type` | varchar(10) | default `NEW` | `NEW` / `FOLLOWUP` |
| `chief_complaint` | varchar(500) | optional | reason for visit |
| `status` | varchar(20) | default `REGISTERED` | `REGISTERED`→`VITALS_DONE`→`WITH_DOCTOR`→`LAB_PENDING`→`LAB_DONE`→`CLOSED` |
| `visit_date` | date | auto (today) | |
| `created_at` / `updated_at` | timestamptz | auto | |

- Only staff create encounters (patients cannot self-inject into a queue).
- Each role's queue filters by `status` + (for doctors) `department`.

---

## 6. `core_vitals` (model `Vitals`)

Recorded by a **nurse** for an encounter (one-to-one).

| Column | Type | Constraints | Notes |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | |
| `encounter` | OneToOne → `core_encounter` | required | |
| `recorded_by` | FK → `core_staff` | required | the nurse |
| `height_cm` | decimal(5,1) | optional | 30–250 |
| `weight_kg` | decimal(5,1) | optional | 1–400 |
| `bmi` | decimal(4,1) | computed | server-side from height/weight; never client-set |
| `systolic_bp` | int | optional | 50–300 |
| `diastolic_bp` | int | optional | 30–200 (< systolic) |
| `pulse` | int | optional | 20–250 |
| `temperature_c` | decimal(3,1) | optional | 30–45 |
| `spo2` | int | optional | 50–100 |
| `created_at` / `updated_at` | timestamptz | auto | |

---

## 7. `core_laborder` (model `LabOrder`)

A doctor's request for a catalog test.

| Column | Type | Constraints | Notes |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | |
| `encounter` | FK → `core_encounter` | required | |
| `patient` | FK → `core_patient` | required | denormalised for easy filtering |
| `ordered_by` | FK → `core_staff` | required | the doctor |
| `test_code` | varchar(50) | required | a `LabTestCatalog` key |
| `test_name` | varchar(120) | auto | from catalog |
| `category` | varchar(20) | auto | from catalog |
| `loinc_code` | varchar(20) | auto | from catalog (quantitative) |
| `status` | varchar(20) | default `PENDING` | `PENDING` → `COMPLETED` |
| `priority` | varchar(10) | default `ROUTINE` | `ROUTINE` / `URGENT` |
| `created_at` / `updated_at` | timestamptz | auto | |

---

## 8. `core_labreport` (model `LabReport`)

A lab tech's submission for an order (holds the optional PDF + status).

| Column | Type | Constraints | Notes |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | |
| `lab_order` | FK → `core_laborder` | required | |
| `patient` | FK → `core_patient` | required | denormalised |
| `entered_by` | FK → `core_staff` | required | the lab tech |
| `pdf_file` | file | optional | original report (future PDF pipeline) |
| `source` | varchar(20) | default `MANUAL` | `MANUAL` / `PDF_EXTRACTED` (ready for future) |
| `status` | varchar(20) | default `CONFIRMED` | `UPLOADED`→`EXTRACTED`→`CONFIRMED` (manual entry = CONFIRMED) |
| `created_at` / `updated_at` | timestamptz | auto | |

---

## 9. `core_labresult` (model `LabResult`)

One test result. Feeds FHIR `Observation`.

| Column | Type | Constraints | Notes |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | |
| `lab_report` | FK → `core_labreport` | required | |
| `patient` | FK → `core_patient` | required | denormalised, for trend queries |
| `test_code` | varchar(50) | required | catalog key |
| `test_name` | varchar(120) | auto | |
| `category` | varchar(20) | auto | |
| `result_type` | varchar(20) | required | `QUANTITATIVE` / `REPORT` |
| `loinc_code` | varchar(20) | quantitative | |
| `result_value` | decimal(10,2) | quantitative | numeric, validated |
| `result_unit` | varchar(20) | quantitative | from catalog |
| `reference_low` / `reference_high` | decimal | quantitative | from catalog |
| `flag` | varchar(10) | quantitative | auto `LOW`/`NORMAL`/`HIGH` |
| `report_text` | varchar(1000) | report | narrative conclusion (culture, blood group, +/-) |
| `created_at` / `updated_at` | timestamptz | auto | `created_at` → FHIR `effectiveDateTime` |

- **Quantitative:** numeric value + auto flag vs reference range; chartable trend.
- **Report:** `report_text` only (Microbiology culture, Blood Bank grouping, serology +/-).

---

## 10. `core_prescription` (model `Prescription`)

| Column | Type | Constraints | Notes |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | |
| `encounter` | FK → `core_encounter` | required | |
| `patient` | FK → `core_patient` | required | |
| `prescribed_by` | FK → `core_staff` | required | doctor |
| `fulfilled_by` | FK → `core_staff` | null | pharmacist |
| `medication_name` | varchar(200) | required | free text |
| `dosage_instruction` | varchar(500) | required | |
| `status` | varchar(20) | default `ACTIVE` | `ACTIVE` → `COMPLETED` |
| `fulfilled_at` | timestamptz | null | |
| `created_at` / `updated_at` | timestamptz | auto | |

> **v2 change:** the blocking drug-allergy interceptor is **removed**. Allergies are shown
> to the doctor as a red banner (informational). Rationale: real EHRs warn, they do not
> silently block; and free-text allergies can't be reliably substring-matched.

---

## 11. `core_diagnosis` (model `Diagnosis`)

| Column | Type | Constraints | Notes |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | |
| `encounter` | FK → `core_encounter` | required | |
| `patient` | FK → `core_patient` | required | |
| `diagnosed_by` | FK → `core_staff` | required | doctor |
| `icd10_code` | varchar(10) | required, choices | from the ~39-entry ICD-10 list |
| `disease_name` | varchar(255) | auto | from ICD-10 table |
| `clinical_status` | varchar(20) | default `ACTIVE` | `ACTIVE` / `RESOLVED` |
| `onset_date` | date | null | |
| `notes` | varchar(1000) | optional | |
| `resolved_at` | timestamptz | null | |
| `created_at` / `updated_at` | timestamptz | auto | |

---

## 12. `core_accessrequest` (model `AccessRequest`)

Cross-hospital FHIR record sharing (patient approves in real time — no consent code).

| Column | Type | Constraints | Notes |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | request_id returned to the external hospital |
| `patient` | FK → `core_patient` | null until matched | matched by `national_id` |
| `national_id` | varchar(20) | required | the NID the external hospital requested |
| `requester_label` | varchar(120) | optional | free label e.g. "Hospital B" |
| `status` | varchar(20) | default `PENDING` | `PENDING`→`APPROVED`/`DENIED`/`EXPIRED` |
| `expires_at` | timestamptz | required | ~2 min window; then EXPIRED |
| `approved_at` | timestamptz | null | |
| `created_at` / `updated_at` | timestamptz | auto | |

**Flow:** external hospital `POST`s a request by NID → patient sees it in the portal and
Approves/Denies → external hospital polls the request id → on APPROVED, receives the FHIR
Bundle. On PENDING → 202; DENIED/EXPIRED → 403.

---

## 13. Lab Test Catalog

The orderable tests live in `LabTestCatalog` (see `core/constants.py`), each tagged with
category, department(s), result type, LOINC, unit, and adult reference range. Categories:
Biochemistry, Hematology, Urinalysis, Microbiology, Serology/Immunology, Coagulation,
Blood Bank.

> **Honest limitation (report):** reference ranges are simple adult ranges (one per test).
> Age/sex-specific ranges are future work. Verify ranges against a real Nepali lab report.

---

## 14. Column → API → FHIR Traceability (patient + lab result)

| DB column | Flat API field | FHIR path |
| :-- | :-- | :-- |
| `patient.first_name` | `first_name` | `Patient.name[0].given[0]` |
| `patient.last_name` | `last_name` | `Patient.name[0].family` |
| `patient.national_id` | `national_id` | `Patient.identifier` (system `http://mohp.gov.np/nid`) |
| `patient.phone_number` | `phone_number` | `Patient.telecom[0].value` |
| `patient.gender` | `gender` | `Patient.gender` |
| `patient.date_of_birth` | `date_of_birth` | `Patient.birthDate` |
| `encounter.department` | `department` | `Encounter.serviceType` |
| `labresult.loinc_code` | `loinc_code` | `Observation.code.coding[0].code` |
| `labresult.result_value` | `result_value` | `Observation.valueQuantity.value` |
| `labresult.result_unit` | `result_unit` | `Observation.valueQuantity.unit` |
| `labresult.created_at` | `created_at` | `Observation.effectiveDateTime` |
| `diagnosis.icd10_code` | `icd10_code` | `Condition.code.coding[0].code` |
