# Product Requirement Document (PRD)
## Project: SwasthyaEHR — FHIR-Enabled Hospital EHR & Pharmacy Safety System

---

## 1. Executive Summary & Vision
SwasthyaEHR is a specialized Electronic Health Record (EHR) system designed to optimize
internal workflows across a hospital front desk, a physician consultation room, an on-site
laboratory, and an on-site pharmacy. By utilizing the global HL7 FHIR R4 data standard,
the system ensures clinical data maps directly to international frameworks, while native
backend validation eliminates medication administration errors before prescriptions reach
the dispensing counter.

**Two signature features:**
1. **Clinical Safety Interceptor** — blocks prescriptions that conflict with a patient's
   recorded drug allergies, inside an atomic transaction.
2. **FHIR R4 Interoperability Layer** — exports patient and lab data as validator-passing,
   internationally standardized JSON.

---

## 2. User Personas & Workflows

### 2.1 The Patient (`PATIENT`)
- **Access:** external public web portal (home) or front-desk kiosk.
- **Workflow:** navigates to the app, enters demographics, and selects known allergies
  from a fixed list before their first appointment. Can later view their own results
  (read-only portal — stretch goal).

### 2.2 The Receptionist (`RECEPTIONIST`)
- **Access:** internal desktop web interface.
- **Workflow:** registers walk-in patients who did not pre-register, and searches existing
  records by name or hospital ID. Sees demographic data only — no clinical data.

### 2.3 The Attending Physician / Doctor (`DOCTOR`)
- **Access:** clinical consultation room dashboard.
- **Workflow:** selects a patient, reviews their clinical timeline (labs + prescriptions),
  creates lab orders, and drafts prescriptions — relying on the safety interceptor to
  block unsafe drugs before authorization.

### 2.4 The Laboratory Technician (`LAB_TECH`)
- **Access:** on-site diagnostic lab station.
- **Workflow:** views pending lab orders created by doctors, enters numeric results into
  structured forms, which are stored with LOINC codes for interoperability.

### 2.5 The Pharmacist (`PHARMACIST`)
- **Access:** on-site dispensing window.
- **Workflow:** views approved prescriptions grouped by patient and confirms dispensation.

### 2.6 The System Administrator (`ADMIN`)
- **Access:** internal admin dashboard.
- **Workflow:** creates and deactivates staff accounts. Has **no** access to clinical data.

---

## 3. Detailed Functional Requirements

### 3.1 Dual-Channel Registration & Identifier Architecture
- **REQ-001:** Two independent paths create a patient profile: Patient Self-Registration
  (public web form) and Receptionist Data Intake (internal secured screen).
- **REQ-002:** The backend assigns a UUIDv4 as the internal primary key.
- **REQ-003:** The system also generates a human-readable identifier (format
  `HOSP-YYYY-NNNNN`, e.g. `HOSP-2026-00142`) to avoid exposing sequential IDs publicly.

### 3.2 Enforced Structural Allergy Selection
- **REQ-004:** Free-text allergy input is prohibited (prevents typos that defeat the
  safety engine). Allergies use a fixed multi-select list.
- **REQ-005:** The baseline allergen vocabulary is hardcoded:
  `Penicillin`, `Sulfa Drugs`, `Aspirin`, `NSAIDs`, `Anticonvulsants`, `None` (default).

### 3.3 Clinical Safety Interceptor (Pharmacy Pipeline Check)
- **REQ-006:** When a doctor confirms a prescription, the backend runs a blocking check
  inside a single `@transaction.atomic` block.
- **REQ-007:** Cross-match rule:
  ```
  IF (medication_name contains any allergen in patient.allergies, case-insensitive) {
      ABORT commit; RETURN HTTP 400 with safety payload; TRIGGER frontend alert.
  } ELSE {
      COMMIT prescription; PUSH to pharmacist queue.
  }
  ```
- **REQ-007a (honesty note):** substring matching is a simplification; see
  DATABASE_SCHEMA.md §9 for its documented limitations.

### 3.4 Structured Diagnostic Laboratory Module
- **REQ-008:** The lab module supports exactly three tests with bound formatting:

  | Test | LOINC | Valid Range | Unit |
  | :-- | :-: | :-: | :-: |
  | Hemoglobin | `718-7` | 0.00 – 25.00 | `g/dL` |
  | WBC | `6690-2` | 0.00 – 50.00 | `10^3/uL` |
  | Platelets | `777-3` | 0.00 – 1000.00 | `10^3/uL` |

- **REQ-009:** The result form enforces numeric parsing and range validation; alphabetical
  input is rejected.
- **REQ-009a:** Doctors create a `LabOrder` (a pending request); lab techs fulfill it with
  a `LabObservation`. This gives the lab a real "queue" to work from.

### 3.5 Interoperable FHIR R4 Serialization Engine
- **REQ-010:** The backend exposes read-only endpoints mapping relational records to
  compliant HL7 FHIR R4 resources.
- **REQ-011:** `/api/fhir/v1/Patient/<id>/` wraps DB fields into standard arrays
  (`name`, `telecom`, `gender`, `birthDate`, `identifier`).
- **REQ-012:** `/api/fhir/v1/Observation/<id>/` outputs a standard lab Observation with
  LOINC coding, `valueQuantity`, and category.
- **REQ-013:** `/api/fhir/v1/Patient/<id>/$everything/` returns a FHIR `Bundle`
  (patient + all their observations).

### 3.6 Role-Based Access Control
- **REQ-014:** Six roles — `ADMIN`, `RECEPTIONIST`, `DOCTOR`, `LAB_TECH`, `PHARMACIST`,
  `PATIENT` — enforced at the backend per RBAC_AND_ROLES.md. Frontend visibility is never
  the security boundary.

---

## 4. System Boundaries & Explicit Exclusions
- **Exclusion 1:** Financial accounting, billing, and insurance are out of scope.
- **Exclusion 2:** Hardware biometrics (fingerprint/iris) and QR-code generation excluded.
- **Exclusion 3:** Multi-institutional cloud sync excluded; single centralized database.
- **Exclusion 4:** Appointment scheduling and inpatient/ward management excluded.
- **Deployment:** v1 targets **local development only** (no cloud hosting).

---

## 5. Success Criteria (for the minor project demo)
1. A patient can self-register and receive a hospital ID.
2. A doctor can order a lab and write a prescription.
3. The safety interceptor **blocks** an allergy-matching drug and **allows** a safe one.
4. A lab tech enters a result; a pharmacist dispenses a prescription.
5. The FHIR endpoints produce JSON that passes the official HL7 R4 validator with zero
   errors.
