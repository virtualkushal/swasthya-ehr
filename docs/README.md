# SwasthyaEHR

**A FHIR-Enabled Hospital EHR & Pharmacy Safety System**

> *Swasthya (स्वास्थ्य) — "health" in Nepali/Sanskrit.*

SwasthyaEHR is a role-based Electronic Health Record (EHR) system that connects a
hospital's front desk, doctor's consultation room, laboratory, and pharmacy into one
secure platform. It has two standout features:

1. **Clinical Safety Interceptor** — the backend blocks any prescription that matches a
   patient's recorded drug allergy, *before* it is ever saved.
2. **HL7 FHIR R4 Interoperability** — patient and lab data can be exported as
   internationally standardized, validator-passing FHIR JSON.

---

## 1. Tech Stack

| Layer | Technology |
| :-- | :-- |
| Frontend | React 18 (Vite) · Tailwind CSS · axios · lucide-react · chart.js |
| Backend | Python 3.11+ · Django 5.x · Django REST Framework (DRF) |
| Auth | JWT (`djangorestframework-simplejwt`) |
| Database | PostgreSQL 16 (with `JSONB` + GIN index for allergies) |
| Standard | HL7 FHIR R4 (read-only export layer) |
| Deployment | Local development only (v1) |

---

## 2. The Six User Roles

| Role | Does what |
| :-- | :-- |
| `ADMIN` | Creates & deactivates staff accounts. No clinical data access. |
| `RECEPTIONIST` | Registers walk-in patients, searches records. |
| `DOCTOR` | Views patient timeline, orders labs, writes prescriptions. |
| `LAB_TECH` | Enters lab results (Hemoglobin, WBC, Platelets). |
| `PHARMACIST` | Dispenses approved prescriptions. |
| `PATIENT` | Self-registers, views own labs & medications (read-only). |

Full permission matrix: see **[RBAC_AND_ROLES.md](./RBAC_AND_ROLES.md)**.

---

## 3. Repository Layout (target)

```
swasthya-ehr/
├── backend/                 # Django + DRF project
│   ├── config/              # settings, urls, wsgi
│   ├── core/                # main app: models, views, serializers
│   │   ├── models.py
│   │   ├── permissions.py   # EnforceStrictRole
│   │   ├── serializers/
│   │   │   ├── flat_serializers.py
│   │   │   └── fhir_serializers.py
│   │   └── views/
│   ├── manage.py
│   └── requirements.txt
├── frontend/                # React + Vite SPA
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── context/AuthContext.jsx
│   │   └── services/api.js
│   └── package.json
└── docs/                    # all the .md specs in this folder
```

---

## 4. Documentation Index

Read the docs in this order before building:

| # | File | Purpose |
| :-- | :-- | :-- |
| 1 | [PRD.md](./PRD.md) | What we're building and why (product requirements). |
| 2 | [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | The 3-tier technical architecture. |
| 3 | [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | **Exact tables, columns, types.** Build models from this. |
| 4 | [RBAC_AND_ROLES.md](./RBAC_AND_ROLES.md) | Roles, permissions, and per-role UI. |
| 5 | [API_SPECIFICATION.md](./API_SPECIFICATION.md) | Every REST endpoint, payloads, errors. |
| 6 | [FHIR_MAPPING.md](./FHIR_MAPPING.md) | Flat DB → FHIR R4 JSON mapping. |
| 7 | [FRONTEND_SPEC.md](./FRONTEND_SPEC.md) | Pages, routes, components, UI design. |
| 8 | [ROADMAP.md](./ROADMAP.md) | Sprint-by-sprint build order (mapped to Git branches). |
| 9 | [CONTRIBUTING.md](./CONTRIBUTING.md) | Git branch → test → merge workflow. |

---

## 5. Quickstart (once code exists)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
# create a PostgreSQL database named "swasthya" first
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver       # http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                       # http://localhost:3000
```

---

## 6. Scope Boundaries (v1)

**In scope:** registration, RBAC, lab results, prescriptions, allergy safety engine, FHIR export.

**Out of scope:** billing/insurance, biometrics/QR, multi-hospital cloud sync, appointment
scheduling, insurance claims. (See PRD §4.)

---

## 7. Status

🚧 **Pre-development.** Documentation phase complete; implementation begins per
[ROADMAP.md](./ROADMAP.md), one Git branch per sprint.
