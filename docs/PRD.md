# Product Requirement Document (PRD) — v2
## Project Title: SwasthyaEHR — Multi-Department Hospital OPD EHR & FHIR Sharing

---

## 1. Executive Summary & Vision
SwasthyaEHR is an Electronic Health Record system for a multi-department hospital
**outpatient department (OPD)**. It digitises the real clinical workflow — patient
registration, check-in, nurse vitals, doctor consultation, ICD-10 diagnosis, lab
ordering and results, and pharmacy dispensing — across **7 clinical departments** served
by **7 laboratory categories**. Its headline capability is **standards-based
interoperability**: any patient record can be shared with another hospital using the
**HL7 FHIR R4** standard, released only after the **patient approves the request** in
their portal. A separate "Hospital B Viewer" app demonstrates a receiving system reading
that FHIR data and rendering it as a normal, human-readable patient chart.

**Scope:** OPD only. IPD (admissions/beds), billing, and insurance are out of scope.

---

## 2. Clinical Domain

**Departments (7):** Diabetes & Endocrinology · Internal Medicine · Nephrology ·
Cardiology · Gastroenterology / Hepatobiliary · Infectious Diseases · Hematology.

**Lab categories (7):** Biochemistry · Hematology · Urinalysis · Microbiology ·
Serology/Immunology · Coagulation · Blood Bank.

**Diagnoses:** ~39 ICD-10 coded conditions (≈5–6 per department). See `core/constants.py`.

**Lab tests:** a unified catalog (~48 tests) tagged with category, ordering department(s),
LOINC code, unit, and adult reference range. Two result types:
- **Quantitative** — numeric value + reference range + auto HIGH/LOW/NORMAL flag + trend chart.
- **Report/Qualitative** — narrative conclusion (Microbiology culture, Blood Bank grouping,
  serology positive/negative). Original PDF may be stored (future PDF pipeline).

---

## 3. Roles (7) & Responsibilities

| Role | Does |
| :-- | :-- |
| **Admin** | Approves self-registered staff; manages/deactivates accounts; sees overview stats. |
| **Receptionist** | Registers walk-in patients; checks patients in → creates an Encounter and assigns department + doctor. |
| **Nurse** | Records vitals (BP, pulse, temp, SpO₂, height, weight → auto BMI) for the encounter. |
| **Doctor** | Reads vitals; records ICD-10 diagnosis; orders labs; writes prescriptions; reviews results; closes encounter. Tied to one department. |
| **Lab Technician** | Enters lab results (all categories); (future) uploads report PDFs. |
| **Pharmacist** | Views the dispensing queue; marks prescriptions dispensed. |
| **Patient** | Pre-registers from home; views own records/trends; approves cross-hospital share requests. |

---

## 4. The OPD Flow

```
Patient pre-registers from home (optional)
   ↓
Receptionist: find/create patient → create Encounter → assign department (+ doctor)
   ↓
Nurse: records vitals (auto-BMI)
   ↓
Doctor: reads vitals → ICD-10 diagnosis → orders labs / writes prescription
   ↓
Lab Tech: enters results (quantitative or report)
   ↓
Doctor: reviews results → adjusts → closes encounter
   ↓
Pharmacist: dispenses medication
```

**Encounter status queue:** `REGISTERED → VITALS_DONE → WITH_DOCTOR → LAB_PENDING →
LAB_DONE → CLOSED`. Each role's queue filters on status (and department for doctors).

---

## 5. Functional Requirements

### 5.1 Accounts & Auth
- **REQ-A1:** Login is by **email + password** for everyone (no usernames).
- **REQ-A2:** Staff **self-register → PENDING → admin approves**; on approval a password is
  auto-generated and emailed; account becomes ACTIVE.
- **REQ-A3:** Every account **must change password on first login** (`must_change_password`).
- **REQ-A4:** Patients register a profile (SELF from home, or RECEPTIONIST walk-in); a login
  account is created and credentials emailed.
- **REQ-A5:** Email uses Django console backend in development; a single config switch enables
  real SMTP (Gmail) for the demo.

### 5.2 Patient Registration
- **REQ-P1:** Required: first/last name, email, phone, DOB, gender, **NID**, **blood group**.
- **REQ-P2:** Optional: address, emergency contact (name+phone), marital status, occupation.
- **REQ-P3:** Allergies are **free text** (array); shown to the doctor as a **red banner**.
- **REQ-P4:** NID is unique; validated as digits (10–12) — tighten to the official NIN spec
  once confirmed.
- **REQ-P5:** Only staff create Encounters; patients cannot self-inject into a queue.

### 5.3 Validation (backend-enforced in serializers)
- **REQ-V1:** Names letters/spaces 2–50; Nepali phone format; DOB not future, age 0–120;
  email valid + unique; NID unique + digit-checked; blood group in the fixed set.
- **REQ-V2:** Vitals range-bound (BP 50–300/30–200 with systolic>diastolic, pulse 20–250,
  temp 30–45 °C, SpO₂ 50–100). **BMI computed server-side**, never accepted from client.
- **REQ-V3:** Quantitative lab values numeric + plausible; auto-flag vs reference range.
  Report results require non-empty text.

### 5.4 Encounters, Vitals, Diagnosis, Labs, Pharmacy
- **REQ-C1:** Encounter ties vitals, diagnoses, lab orders, prescriptions to one visit.
- **REQ-C2:** Nurse records one Vitals per encounter; BMI auto-calculated.
- **REQ-C3:** Doctor records ICD-10 diagnoses (from the fixed coded list; system never
  auto-diagnoses) and orders tests from the catalog (filtered by department).
- **REQ-C4:** Lab tech enters results; quantitative results auto-flag; order flips COMPLETED.
- **REQ-C5:** Pharmacist sees ACTIVE prescriptions and marks them COMPLETED (dispensed).
- **REQ-C6:** The old **blocking** drug-allergy interceptor is **removed**; allergies are an
  informational red banner (matches real EHR behaviour).

### 5.5 FHIR & Interoperability
- **REQ-F1:** Expose read-only FHIR R4 resources: `Patient`, `Encounter`, `Observation`
  (labs), `Condition` (diagnoses), `MedicationRequest` (prescriptions), and a `Bundle`.
- **REQ-F2:** FHIR output must **pass the official HL7 validator** (correct structure,
  required fields, coding systems).
- **REQ-F3:** **No raw JSON is shown to any human user.** The doctor/patient UIs render
  readable views only.
- **REQ-F4:** **Share by NID with patient approval (no consent code):** an external hospital
  `POST`s an access request by NID → the patient sees it in their portal and Approves/Denies
  → the external hospital polls the request; on APPROVED it receives the FHIR Bundle
  (PENDING → 202, DENIED/EXPIRED → 403).
- **REQ-F5:** A separate **Hospital B Viewer** app fetches the Bundle and renders a readable
  chart (demographics, diagnoses, lab trends, medications) — proving interoperability.

### 5.6 Admin
- **REQ-AD1:** A **custom React admin dashboard** (not Django admin): Overview stats,
  pending staff Approvals (approve/reject), Staff management (deactivate/reactivate),
  Departments.

### 5.7 Public Landing Page
- **REQ-L1:** A public landing page describing what SwasthyaEHR offers: self-registration,
  personal health history & trends, cross-hospital record sharing with consent, and
  doctor-led diagnosis & lab tracking; with Register/Login entry points.

---

## 6. Explicit Exclusions (future work)
IPD/admissions, billing/insurance, LAN/cloud deployment, age/sex-specific reference ranges,
partner API keys for sharing, SMS/push consent notifications, and **lab PDF extraction**
(deferred until real sample PDFs are collected — the schema already reserves a `source`
field so it slots in without rework).

---

## 7. Build Phases
- **Phase 1 (clinical rebuild):** scope docs → db reset → auth rework → admin dashboard →
  patient profile + landing → nurse vitals → encounter → lab catalog → allergy banner →
  FHIR fix.
- **Phase 3 (FHIR sharing):** request→approve access model + Hospital B Viewer.
- **Phase 2 (LAST):** lab PDF upload → extract → confirm → store.
