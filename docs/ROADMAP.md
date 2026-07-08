# Development Roadmap
## Project: SwasthyaEHR — FHIR-Enabled Hospital EHR & Pharmacy Safety System

---

## 1. How to read this roadmap

Six progressive sprints. Each sprint = **one Git branch** → build → manually test →
open a PR → merge to `main` only if it works (see CONTRIBUTING.md). Backend usually leads;
the matching frontend piece follows in the same sprint.

> **Golden rule:** never start a sprint before the previous one is merged and `main` runs.

| Sprint | Branch | Theme |
| :-- | :-- | :-- |
| 1 | `sprint-1-scaffold` | Project skeleton (both stacks) |
| 2 | `sprint-2-database` | Models, auth, admin staff |
| 3 | `sprint-3-pharmacy-safety` | Registration + the safety interceptor |
| 4 | `sprint-4-lab-fhir` | Lab module + FHIR serialization |
| 5 | `sprint-5-timeline-charts` | Doctor timeline + charts + validation |
| 6 | `sprint-6-portal` | Patient portal (stretch, optional) |

---

## 🚀 Sprint 1 — Core Scaffolding  (`sprint-1-scaffold`)
**Objective:** clean project skeleton for both stacks; they run and talk to each other.

**Backend:**
- Initialize Django 5.x project (`config/`) + a `core` app.
- Install: `djangorestframework`, `django-cors-headers`,
  `djangorestframework-simplejwt`, `psycopg2-binary`, `python-dotenv`.
- Configure `settings.py` for PostgreSQL + CORS + `.env` secrets.
- Add a `/api/v1/health/` endpoint returning `{"status": "ok"}`.

**Frontend:**
- Scaffold React 18 via Vite (JavaScript template).
- Install: `tailwindcss`, `postcss`, `autoprefixer`, `axios`, `lucide-react`,
  `react-router-dom`.
- Configure `vite.config.js` proxy (`/api` → `:8000`) and Tailwind with the design tokens
  from FRONTEND_SPEC.md §5.1.

**Done when:** both servers start; the React app can call `/api/v1/health/` and show "ok".

---

## ⚙️ Sprint 2 — Database & Identity  (`sprint-2-database`)
**Objective:** all tables exist; staff can log in; admin can manage staff.

**Backend:**
- Implement all models from **DATABASE_SCHEMA.md** (`Staff` as a custom user model,
  `Patient`, `LabOrder`, `LabObservation`, `Prescription`), including the JSONB allergies
  field + GIN index and `hospital_identifier` generation.
- `makemigrations` + `migrate`.
- Implement JWT auth endpoints (API_SPECIFICATION.md §2) and the `EnforceStrictRole`
  permission class (RBAC_AND_ROLES.md §3).
- Implement staff CRUD (`/api/v1/auth/staff/`, ADMIN only).

**Frontend:**
- `AuthContext.jsx` (login state, JWT, role) + axios interceptors.
- `Login.jsx`, `ProtectedRoute.jsx`, `Navbar.jsx`.
- Admin `StaffDashboard.jsx` (list + add + deactivate staff).

**Done when:** admin logs in, creates a doctor/lab/pharmacist account, and a wrong-role
token is rejected with `403`.

---

## 🛡️ Sprint 3 — Registration & Safety Interceptor  (`sprint-3-pharmacy-safety`)
**Objective:** patients get registered; the drug-allergy safety engine works. **This is
the project's signature feature — test it hard.**

**Backend:**
- Patient registration endpoint (API_SPECIFICATION.md §4.1) for `PATIENT`, `RECEPTIONIST`,
  `ADMIN`; auto-set `registered_by` and generate `hospital_identifier`.
- Prescription creation with the `@transaction.atomic` safety check
  (`core/services/safety.py`): case-insensitive substring match; on match, roll back and
  return the `DRUG_ALLERGY_MATCH` 400 payload.

**Frontend:**
- Public `PatientRegister.jsx` + receptionist `PatientIntake.jsx`, using
  `AllergyMultiSelect.jsx` (fixed vocabulary only).
- `AllergyBanner.jsx` — red alert shown when the backend blocks a prescription.

**Done when:** a matching drug is blocked (400, nothing saved) AND a safe drug is saved
(201). Prove both in the PR.

---

## 🧪 Sprint 4 — Lab Module & FHIR  (`sprint-4-lab-fhir`)
**Objective:** the lab workflow works end-to-end and data exports as valid FHIR.

**Backend:**
- Lab order + observation endpoints (API_SPECIFICATION.md §5–6); range validation;
  auto-fill LOINC/unit; mark order `COMPLETED`.
- FHIR serializers (`core/serializers/fhir_serializers.py`) for `Patient` and
  `Observation`, plus the `$everything` `Bundle` — all per **FHIR_MAPPING.md**. Set
  `Content-Type: application/fhir+json`.

**Frontend:**
- Lab tech `LabQueue.jsx` (pending orders, urgency sort) + `ResultEntry.jsx`
  (numeric-only, range-validated inputs).
- Pharmacist `DispenseQueue.jsx` with "Confirm Dispensation" → fulfill endpoint.

**Done when:** doctor orders a lab → lab tech enters result → pharmacist dispenses, and the
FHIR JSON passes validator.fhir.org with zero errors.

---

## 📊 Sprint 5 — Doctor Timeline, Charts & Verification  (`sprint-5-timeline-charts`)
**Objective:** the doctor's cockpit and visualization; final quality pass.

**Backend:**
- View scoping so doctors read patient cards while lab techs stay blocked from pharmacy
  data (verify the whole RBAC matrix end-to-end).

**Frontend:**
- Doctor `PatientList.jsx` → `PatientTimeline.jsx` (labs + prescriptions in one view).
- Add `chart.js` + `react-chartjs-2` trend lines for historical lab values.

**Quality check:**
- Run every FHIR payload through the official HL7 validator / Inferno; screenshot the
  zero-error results for the report.
- Walk the full DATABASE_SCHEMA → API → FHIR traceability table and confirm no drift.

**Done when:** the five success criteria in PRD.md §5 all pass in a live demo.

---

## 🌱 Sprint 6 — Patient Portal  (`sprint-6-portal`) — stretch
**Objective (optional, only if time allows):**
- Patient login (role `PATIENT`) + read-only `PatientPortal.jsx` showing own lab charts
  and active medications, object-scoped so no cross-patient access is possible.

---

## 2. Suggested Timeline (adjust to your deadline)

| Sprint | Rough effort |
| :-- | :-- |
| 1 Scaffold | 2–3 days |
| 2 Database & auth | 4–5 days |
| 3 Registration & safety | 5–6 days |
| 4 Lab & FHIR | 5–7 days |
| 5 Timeline, charts, verify | 4–5 days |
| 6 Portal (stretch) | 3–4 days |

Sprints 1–5 are the core deliverable. Treat Sprint 6 as bonus if the schedule is tight.
