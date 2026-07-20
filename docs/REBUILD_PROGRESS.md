# v2 Rebuild — Progress & Handoff

_Last updated: end of the first autonomous build session._

This tracks the ground-up v2 rebuild (multi-department OPD EHR + FHIR sharing).
`main` is **always kept working/demoable** — unfinished work lives on branches.

---

## ✅ Done and merged to `main`

**PR #20 — `feat/scope-docs`** (the v2 blueprint):
- `backend/core/constants.py` rewritten: 7 roles (added **NURSE**), staff onboarding
  statuses, blood group, marital status, **7 departments**, **7 lab categories**,
  lab result types/flags/source, encounter statuses, visit type, access-request statuses.
- **`LabTestCatalog`** — unified ~48-test catalog (LOINC + unit + adult range + dept tags).
- **`ICD10`** — ~39 diseases mapped to the 7 departments.
- Backward-compat shims kept so the app still imports.
- `docs/DATABASE_SCHEMA.md` and `docs/PRD.md` rewritten to the v2 blueprint.
- ✔ `python manage.py check` passes on `main`.

---

## 🚧 In progress — branch `feat/models-rewrite` (pushed, NOT merged)

- `backend/core/models.py` fully rewritten to the v2 schema:
  Staff (email login, status, department), Patient (NID, blood group, free-text
  allergies), Encounter, Vitals (auto-BMI), LabOrder / LabReport / LabResult
  (2 result types + auto HIGH/LOW/NORMAL flag), Prescription, Diagnosis, AccessRequest.

⚠️ **This branch intentionally breaks the backend** until the dependent files are
rewritten (that's why it is NOT merged — `main` stays clean). Remaining work on this
branch before it can pass `check`/`migrate` and be merged:

1. `serializers.py` — rewrite for the new models + all field validation (REQ-V1..V3).
2. `views.py` + `urls.py` — new endpoints (encounter, vitals, lab catalog/order/report/
   result, staff approval, patient portal) and remove the old allergy-blocking interceptor.
3. `fhir_serializers.py` + `fhir_urls.py` — Patient/Encounter/Observation/Condition/
   MedicationRequest/Bundle; must pass the HL7 validator; no raw JSON in any human UI.
4. `admin.py` — register new models / fix the removed `LabObservation`.
5. `permissions.py` — add NURSE; keep `EnforceStrictRole`.
6. Delete old migrations + `makemigrations` fresh (Postgres reset), add `seed_admin`
   and demo-seed management commands.
7. `tests.py` — model + endpoint + FHIR-validity tests; run `python manage.py test`.

---

## ⏭️ Remaining branches (planned order)

- `feat/auth-rework` — email login, staff self-register→approve, password email + forced change.
- `feat/admin-dashboard` — custom React admin (Overview / Approvals / Staff / Departments).
- `feat/patient-profile` + **landing page** — demographics, registration, portal, validation.
- `feat/nurse-vitals` — Nurse role UI + per-visit vitals + BMI.
- `feat/encounter` — encounter/department/status queue/check-in/timeline.
- `feat/lab-catalog` — catalog ordering + 2 result types + trend charts.
- `feat/allergy-banner` — red banner (blocking removed).
- `feat/fhir-fix` — pass validator, remove JSON dump, add resources.
- `feat/sharing` (Phase 3) — request→approve by NID + FHIR Bundle.
- `feat/hospital-b-viewer` (Phase 3) — tiny reader app rendering a readable chart.
- `feat/lab-pdf-upload` (Phase 2, LAST) — after real sample PDFs are collected.

---

## Notes for the next session
- Use the venv Python: `backend\venv\Scripts\python.exe manage.py ...` (system Python lacks deps).
- PowerShell: chain commands with `;` (not `&&`); avoid `2>&1` (it flags git's stderr as errors).
- Email = Django **console backend** for dev; real Gmail App Password only needed for the
  live demo (fill `.env` yourself; never paste it into chat).
- This is a multi-day build. Each branch: build → test → PR → merge, keeping `main` working.
