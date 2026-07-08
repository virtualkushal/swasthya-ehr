# Project Progress Log
## Project: SwasthyaEHR — FHIR-Enabled Hospital EHR & Pharmacy Safety System

> This is a **living document**. We update it after every part is completed, so anyone
> (you, a teammate, or an AI assistant) can see exactly what is done, how it was done, and
> what comes next. Newest work is added under "Completed Work" with full detail.

**Repository:** https://github.com/virtualkushal/swasthya-ehr
**Last updated:** 2026-07-09

---

## 1. Status at a Glance

| # | Part | Branch | Status |
| :-- | :-- | :-- | :-- |
| 0 | Documentation baseline | `main` | ✅ Done |
| 1 | Backend setup (Django + PostgreSQL + health) | `feature/backend-setup` | ✅ Done & merged |
| 2 | Frontend setup (React + Vite + Tailwind) | `feature/frontend-setup` | ⬜ Not started |
| 3 | Database models & identity (Sprint 2) | `feature/database-models` | ⬜ Not started |
| 4 | Registration + pharmacy safety (Sprint 3) | `feature/pharmacy-safety` | ⬜ Not started |
| 5 | Lab module + FHIR (Sprint 4) | `feature/lab-fhir` | ⬜ Not started |
| 6 | Doctor timeline + charts (Sprint 5) | `feature/timeline-charts` | ⬜ Not started |
| 7 | Patient portal (Sprint 6, stretch) | `feature/patient-portal` | ⬜ Optional |

Legend: ✅ done · 🟡 in progress · ⬜ not started

---

## 2. Environment Setup (one-time, done)

These were completed on the development machine before coding started:

- **PostgreSQL 18.4** installed natively on Windows. The `bin` folder
  (`C:\Program Files\PostgreSQL\18\bin`) was added to the User PATH so `psql` works from
  any terminal.
- **Project database created:** a database named `swasthya` owned by the `postgres`
  superuser (`createdb -U postgres swasthya`).
- **Tooling confirmed:** Python 3.13.1, Node.js 24.13.0, npm 11.6.2, Git 2.47.1,
  GitHub CLI 2.87.3.
- **GitHub CLI authenticated** as `virtualkushal`.

---

## 3. Completed Work (detailed)

### ✅ Part 0 — Documentation baseline
**Branch:** committed directly to `main` (first commit) · **Commit:** `455abb0`

Created the full specification set the project is built from, all living in `docs/`
(with `README.md` also copied to the repo root for GitHub):

- `PRD.md` — product requirements, 6 user roles, success criteria.
- `SYSTEM_ARCHITECTURE.md` — 3-tier design (React SPA → Django API → PostgreSQL).
- `DATABASE_SCHEMA.md` — all tables, columns, keys, and the JSONB allergies design.
- `API_SPECIFICATION.md` — every REST + FHIR endpoint with request/response examples.
- `RBAC_AND_ROLES.md` — the permission matrix and the `EnforceStrictRole` blueprint.
- `FHIR_MAPPING.md` — relational→FHIR R4 mapping for Patient, Observation, Bundle.
- `FRONTEND_SPEC.md` — pages, routes, per-role wireframes, and the design system.
- `ROADMAP.md` — the sprint plan and branch-per-part workflow.
- `CONTRIBUTING.md` — the Git workflow (branch → test → PR → merge).
- `README.md` — entry point and quickstart.

Also added at repo root: `.gitignore` (ignores `.env`, `venv/`, `node_modules/`, etc.)
and `.env.example` (the template collaborators copy to `backend/.env`).

---

### ✅ Part 1 — Backend setup (Django + PostgreSQL + health check)
**Branch:** `feature/backend-setup` · **Commit:** `c1d3456` · **PR:** #1 (merged to `main`)

**Goal:** a running Django API connected to PostgreSQL, with one test endpoint, so the
backend foundation is proven before any features are built.

**In plain words (how we actually did it):**
We started completely empty, so the first job was to give the backend a home. We made a
`backend/` folder and set up an isolated Python "virtual environment" inside it — think of
this as a clean, private box where this project's tools live, so they never clash with
anything else on the computer. Into that box we installed Django (the web framework),
Django REST Framework (which turns Django into an API that speaks JSON), plus helpers for
logins (JWT), for letting the React app talk to us (CORS), and for talking to PostgreSQL.

Next we asked Django to generate its starting skeleton — a project called `config` (the
control room: settings and routing) and an app called `core` (where all our real features
will eventually live). Out of the box Django wanted to use a tiny throwaway database, so we
rewired its settings to point at our real PostgreSQL `swasthya` database instead. We were
careful here: instead of typing the database password directly into the code (which would
then get uploaded to GitHub for anyone to see), we put all secrets in a separate hidden
`.env` file that Git is told to ignore. The code just reads from that file at startup.

With the plumbing in place, we built one tiny "is anyone home?" endpoint at
`/api/v1/health/`. It does nothing clever — it just answers "ok" — but that is exactly the
point: if we can call it and get "ok" back, it proves the whole chain works (browser →
Django → back again). Before trusting it, we ran Django's migrations, which is the step
that actually creates tables in PostgreSQL; the fact that it succeeded told us the database
connection and password were correct. Finally we started the server, called the health URL,
and saw the "ok" response come back — so the backend foundation is real and working, not
just written.

**What was done, step by step:**

1. **Virtual environment & dependencies.** Created `backend/venv/` and installed:
   Django 5.2.16, Django REST Framework 3.17.1, `django-cors-headers`,
   `djangorestframework-simplejwt`, `psycopg2-binary`, `python-dotenv`. These are pinned
   in `backend/requirements.txt` so anyone can reproduce the exact setup with
   `pip install -r requirements.txt`.

2. **Django project + app.** Generated the `config` project (settings/urls/wsgi/asgi) and
   a `core` app that will hold all our models, views, and serializers.

3. **Configuration via `.env` (`backend/config/settings.py`).** Rewrote the generated
   settings so that:
   - Secrets and DB credentials are read from a git-ignored `backend/.env` using
     `python-dotenv` (nothing sensitive is hard-coded or committed).
   - The database engine is **PostgreSQL**, pointing at the `swasthya` database.
   - **DRF** is enabled, defaulting to JWT authentication and "authenticated users only"
     unless a view explicitly opens itself up.
   - **JWT** access/refresh token lifetimes are configurable from `.env`.
   - **CORS** allows the React dev server at `http://localhost:3000`.
   - Timezone set to `Asia/Kathmandu`.

4. **Health-check endpoint.**
   - `core/views.py` — a `health` view (open to everyone) returning
     `{"status": "ok", "service": "swasthya-ehr-api"}`.
   - `core/urls.py` — maps `health/` to that view.
   - `config/urls.py` — includes the core routes under the `/api/v1/` prefix, giving the
     final URL `GET /api/v1/health/`.

5. **Database migration & verification.**
   - Ran `manage.py check` (0 issues) and `manage.py migrate` — the migrations applied
     cleanly to PostgreSQL, which **proves the database connection works**.
   - Started the dev server and called `http://127.0.0.1:8000/api/v1/health/`; it returned
     the expected JSON. Endpoint confirmed working.

**How it was delivered (Git workflow):**
- All work done on branch `feature/backend-setup` (never directly on `main`).
- Committed only source files — `.env` and `venv/` were verified as ignored before commit.
- Opened **PR #1**, merged it into `main`, and deleted the feature branch (local + remote).
- Local `main` synced to the merge commit `2a77e1f`.

**How to run the backend locally:**
```bash
cd backend
venv\Scripts\activate           # Windows
python manage.py runserver 8000
# then open http://127.0.0.1:8000/api/v1/health/
```

---

## 4. Pending Work (what's next)

### ⬜ Part 2 — Frontend setup (`feature/frontend-setup`)
Scaffold React 18 via Vite; install Tailwind CSS, axios, `react-router-dom`,
`lucide-react`; configure the Vite dev proxy (`/api` → `:8000`); build a small page that
calls `/api/v1/health/` and displays the result — proving the frontend and backend talk.
Then test, PR, and merge.

### ⬜ Part 3 — Database models & identity (Sprint 2)
Implement all models from `DATABASE_SCHEMA.md` (custom `Staff` user, `Patient`,
`LabOrder`, `LabObservation`, `Prescription`) incl. the JSONB allergies field + GIN index;
JWT login endpoints; the `EnforceStrictRole` permission class; and the admin staff
management screen on the frontend.

### ⬜ Part 4 — Registration + pharmacy safety interceptor (Sprint 3)
Patient self-registration + receptionist intake; the atomic drug-allergy safety check that
blocks unsafe prescriptions. **This is the project's signature feature.**

### ⬜ Part 5 — Lab module + FHIR serialization (Sprint 4)
Lab orders/results with range validation; FHIR R4 serializers for Patient, Observation,
and the `$everything` Bundle; validated against the official HL7 FHIR validator.

### ⬜ Part 6 — Doctor timeline + charts + verification (Sprint 5)
The doctor's patient timeline view, lab-trend charts, full RBAC verification, and the final
quality pass against the success criteria in `PRD.md`.

### ⬜ Part 7 — Patient portal (Sprint 6, stretch/optional)
Read-only patient portal for viewing own results and medications.

---

## 5. How we maintain this file
After each part is finished (built + tested + merged), we add a new "✅ Part N" section
under **Completed Work** with the same level of detail (goal, steps, Git workflow, how to
run), flip its row in the status table to ✅, and update **Last updated**.
