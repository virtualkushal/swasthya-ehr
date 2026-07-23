# Two-Hospital FHIR EHR — SwasthyaEHR ↔ AarogyaEHR

Two independent hospital EHR systems that exchange patient records with each
other over the HL7 FHIR R4 standard, with patient/admin consent. Built for a
minor project to demonstrate healthcare interoperability.

```
minor project working/
├── hospital-1/        SwasthyaEHR   (blue)    — API :8000 · Web :3000 · DB swasthya1
│   ├── backend/       Django + DRF + PostgreSQL
│   └── frontend/      React (Vite) + Tailwind
├── hospital-2/        AarogyaEHR    (emerald) — API :8001 · Web :3001 · DB aarogya2
│   ├── backend/
│   └── frontend/
├── docs/              Shared specs (PRD, API, FHIR mapping, RBAC, architecture)
├── setup.ps1          One-time setup for BOTH hospitals
├── start-hospital-1.ps1
└── start-hospital-2.ps1
```

Each hospital is a **completely separate system**: its own database, its own
logins, its own port. They only ever talk to each other through the public FHIR
sharing endpoints — exactly like two real hospitals would.

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ running locally (user `postgres`, password `minorproject` — or
  edit `DB_PASSWORD` in each `backend/.env`)

## One-time setup

From the project root, in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

This creates both databases (`swasthya1`, `aarogya2`), installs backend and
frontend dependencies, runs migrations, and seeds demo data into **both**
hospitals. The seed creates the same demo patient National IDs in both systems
so the cross-hospital lookup works.

## Running

Open two terminals:

```powershell
# Terminal 1
powershell -ExecutionPolicy Bypass -File start-hospital-1.ps1
# Terminal 2
powershell -ExecutionPolicy Bypass -File start-hospital-2.ps1
```

- Hospital 1 (SwasthyaEHR): http://localhost:3000
- Hospital 2 (AarogyaEHR):  http://localhost:3001

## Demo logins (both hospitals, password `demo12345`)

| Role    | Email            |
| ------- | ---------------- |
| Admin   | admin@demo.np    |
| Doctor  | doctor@demo.np   |
| Nurse   | nurse@demo.np    |
| Lab     | lab@demo.np      |
| Pharmacy| pharmacy@demo.np |

Demo patient National IDs: `1234500001` … `1234500004`.

---

## The cross-hospital exchange (what to demo)

Scenario: a doctor at **Aarogya Hospital (H2)** wants the records of a patient
who was treated at **Swasthya Hospital (H1)**.

1. **Log in to Hospital 2** (http://localhost:3001) as `doctor@demo.np`.
2. Click **Cross-Hospital** in the top bar.
3. Choose **Swasthya Hospital (H1)**, enter National ID `1234500001`, pick a
   scope (Diagnoses / Labs / Medications / Everything), and click **Send request**.
   - Behind the scenes H2's server calls H1's public FHIR share endpoint.
4. **Approve at Hospital 1.** Either:
   - Log in to Hospital 1 (http://localhost:3000) as `admin@demo.np` →
     **Incoming Requests** → **Approve**, **or**
   - Log in to Hospital 1 as that patient and approve in the portal.
5. Back on Hospital 2's Cross-Hospital page, click **Check for approval**. Once
   approved you'll see a summary of the received FHIR bundle.
6. Click **Import into our records** to save the peer's bundle into Hospital 2's
   database as an `ExternalRecord`.

If you request a scope of only **Labs**, the returned bundle contains just the
patient + lab observations — proving scope filtering works.

---

## How it works (for the report)

- **Request → consent → transfer.** H2 creates an `OutboundShareRequest` and
  calls `POST /api/v1/share/request/` on H1. H1 stores an `AccessRequest`
  (PENDING). H1's patient or admin approves. H2 polls
  `GET /api/v1/share/request/<id>/`; on approval H1 returns a FHIR `Bundle`
  scoped to what was requested. H2 stores it as an `ExternalRecord`.
- **Consent is enforced on the source side.** No records leave a hospital until
  its own patient or admin approves. Approvals expire.
- **Scope filtering.** `scoped_bundle()` includes only the requested resource
  types (diagnoses / labs / medications), always plus the Patient resource.
- **Same code, two identities.** Each hospital's identity and peer list come from
  its `backend/.env` (`HOSPITAL_CODE`, `HOSPITAL_NAME`, `HOSPITAL_PEERS`).

## Key endpoints (per hospital)

| Method | Path | Who | Purpose |
| ------ | ---- | --- | ------- |
| GET  | `/api/v1/hospitals/` | staff | This hospital + its peers |
| POST | `/api/v1/share/outbound/` | Doctor | Ask a peer for a patient's records |
| POST | `/api/v1/share/outbound/<id>/poll/` | Doctor | Fetch peer status/bundle |
| POST | `/api/v1/share/outbound/<id>/import/` | Doctor | Save received bundle locally |
| GET  | `/api/v1/admin/share-requests/` | Admin | Inbound requests from peers |
| POST | `/api/v1/admin/share-requests/<id>/decision/` | Admin | Approve / deny |
| POST | `/api/v1/share/request/` | peer server | Inbound request (public) |
| GET  | `/api/v1/share/request/<id>/` | peer server | Poll → FHIR Bundle on approval |

See `docs/` for the full PRD, FHIR mapping, RBAC matrix, and architecture.

---

## Git workflow

Feature branches are merged to `main` only after the changed part is tested.
The cross-hospital feature lives on `feat/two-hospital-interop`.

## Security note (development build)

This is a student/demo build. Secrets and DB passwords live in `.env` files for
convenience, JWTs are stored in `localStorage`, and the inbound share endpoint is
intentionally public so peer servers can reach it. For any real deployment you'd
move secrets to a vault, use httpOnly cookies, authenticate peer hospitals
(mutual TLS or signed tokens), and serve everything over HTTPS.
