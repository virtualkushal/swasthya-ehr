# Two-System Interoperability Architecture

## Project: SwasthyaEHR — Hospital 1 ⇄ Hospital 2 (FHIR data sharing)

---

## 1. What we are building

Two **independent** hospital systems that each run their own EHR with their **own
separate database**, and can **request and share patient records with each other**
over the **HL7 FHIR R4** standard — with the patient (or the holding hospital's
admin) approving every share.

- **Hospital 1** — the full SwasthyaEHR (all roles, full clinical workflow).
- **Hospital 2** — the same EHR, rebranded (different name + accent colour),
  running on its own ports and its own database.

They are the **same codebase run as two configured instances**. At runtime they
are genuinely independent: separate databases, separate ports, separate logins.
This is exactly how real hospitals run identical vendor software on their own
infrastructure.

```
   HOSPITAL 1 (SwasthyaEHR)                        HOSPITAL 2 (rebranded)
   ┌──────────────────────────┐                    ┌──────────────────────────┐
   │ React  :3000             │                    │ React  :3001             │
   │ Django :8000  ───────────┼──── HTTP / FHIR ───┼──► Django :8001          │
   │ Postgres  db_hospital1   │  ◄──── HTTP / FHIR ─┤    Postgres  db_hospital2│
   └──────────────────────────┘                    └──────────────────────────┘
        (independent)                                    (independent)
```

---

## 2. How the two systems connect

They connect the same way the React frontend already talks to Django — over
**HTTP** — except here **one hospital's backend calls the other hospital's
backend** (server-to-server), speaking **FHIR JSON**.

Three ingredients make it work:

1. **A hospital registry** — each instance knows the other's base URL
   (`HOSPITAL_PEERS` env / `hospital_config.py`). This powers the
   "search / select a hospital" box.
2. **A server-side HTTP client** (`requests`) — Django calls the peer's API.
   We call server-to-server (not from the browser) to avoid CORS and to model
   real hospital-to-hospital exchange.
3. **A shared language — FHIR R4** — the receiver never needs to know the
   sender's database design; it just reads a standard FHIR `Bundle`.

Trust for the demo is provided by **explicit approval** (patient or admin).

---

## 3. The end-to-end flow (Hospital 2 doctor requests from Hospital 1)

```
[H2 Doctor] Request patient data
   │  select hospital = "Hospital 1", enter NID, pick scope (Dx / Labs / Meds / All)
   ▼
[H2 Backend]  POST http://hospital1:8000/api/v1/share/request/
              { national_id, scope, requester_hospital: "H2" }
   ▼
[H1 Backend]  creates AccessRequest (PENDING) → returns { request_id }
   ▼
[H1 Patient portal]  OR  [H1 Admin dashboard]   ── either can APPROVE ──►
   ▼
[H2 Backend]  GET http://hospital1:8000/api/v1/share/request/<id>/  (poll)
   ▼
[H1 Backend]  returns scope-filtered FHIR Bundle (Patient + chosen resources)
   ▼
[H2 Doctor]   reads the record, and can "Save / Import" it into H2's own DB
              (stored as an ExternalRecord, labelled "sourced from Hospital 1")
```

The reverse direction (H1 → H2) uses the **same code with swapped URLs**, so
sharing is **two-way**.

---

## 4. Data-sharing scope (requester chooses)

When requesting, the doctor selects which slices to pull:

| Scope option | FHIR resources returned |
| :--- | :--- |
| Diagnoses    | `Patient` + `Condition` |
| Lab results  | `Patient` + `Observation` |
| Medications  | `Patient` + `MedicationRequest` |
| Everything   | `Patient` + `Encounter` + `Condition` + `Observation` + `MedicationRequest` |

`Patient` is always included so the record is identifiable. The approver sees
which scope was requested before approving.

---

## 5. Approval (patient OR admin)

A pending inbound request appears in **two** places at the holding hospital:

- the **patient portal** (the patient approves their own data), **and**
- the **admin dashboard** (admin approves on the patient's behalf).

**Either** approval flips the request to `APPROVED` and unlocks the Bundle.
This keeps the strong privacy story while guaranteeing a smooth live demo.

---

## 6. Running both systems

### Local (two terminals)
```
# Hospital 1
cd backend ; set env from .env.hospital1 ; python manage.py runserver 8000
cd frontend ; set VITE_* from .env.hospital1 ; npm run dev -- --port 3000

# Hospital 2
cd backend ; set env from .env.hospital2 ; python manage.py runserver 8001
cd frontend ; set VITE_* from .env.hospital2 ; npm run dev -- --port 3001
```

### One command (recommended for the defense)
```
docker compose -f docker-compose.interop.yml up
```
Starts Hospital 1 (web+api+db), Hospital 2 (web+api+db) together. Change only the
`HOSPITAL_PEERS` base URLs if you later deploy to real hosts — the code is
unchanged.

---

## 7. New building blocks added for interoperability

**Backend**
- `core/hospital_config.py` — this hospital's identity + peer registry (env-driven).
- `AccessRequest.scope`, `.requester_hospital`, `.approved_by` — inbound requests carry scope + who approved.
- `OutboundShareRequest` — tracks a request WE sent to a peer (+ the received Bundle).
- `ExternalRecord` — an imported peer Bundle saved into our own DB.
- Endpoints: `/v1/hospitals/`, `/v1/share/outbound/…`, `/v1/admin/share-requests/…`,
  and scope-aware `/v1/share/request/…`.

**Frontend**
- Env-driven branding (`VITE_HOSPITAL_NAME`, `VITE_HOSPITAL_CODE`, `VITE_ACCENT`).
- Doctor dashboard **"Request patient data"** modal (hospital + NID + scope) and a
  received-records view with **Save / Import**.
- Admin dashboard **share-approvals** panel.
- Patient portal shows the **requested scope** on each approval.

---

## 8. Why this satisfies the scope

- **Two independent systems** ✔ separate DBs, ports, logins, branding.
- **Interconnected** ✔ real server-to-server HTTP + FHIR.
- **Searchable + mutual** ✔ hospital registry, both can request and grant.
- **Consented** ✔ patient or admin approval on every share.
- **Demoable** ✔ one `docker compose up` on a single laptop.
