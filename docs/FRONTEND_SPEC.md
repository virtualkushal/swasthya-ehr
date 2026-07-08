# Frontend Specification
## Project: SwasthyaEHR — FHIR-Enabled Hospital EHR & Pharmacy Safety System

> Single React (Vite) SPA. After login, the app reads the user's `role` and routes
> them to the matching dashboard. One codebase, six role experiences.

---

## 1. Stack & Conventions

| Concern | Choice |
| :-- | :-- |
| Framework | React 18 + Vite (JavaScript, not TS — keep it simple) |
| Styling | Tailwind CSS (utility-first) |
| Icons | `lucide-react` |
| HTTP | `axios` (one shared instance) |
| Charts | `chart.js` + `react-chartjs-2` (patient lab trends) |
| Routing | `react-router-dom` |
| State | React Context (`AuthContext`) — no Redux needed at this scale |

**Golden rule (from SYSTEM_ARCHITECTURE.md):** components collect data and render;
**all** network calls live in `src/services/api.js`. Components never call axios directly.

---

## 2. Folder Structure

```
frontend/src/
├── main.jsx                  # app entry
├── App.jsx                   # router + route guards
├── index.css                 # Tailwind directives + design tokens
├── context/
│   └── AuthContext.jsx        # login state, JWT, current user & role
├── services/
│   └── api.js                 # axios instance + all endpoint functions
├── components/
│   ├── Navbar.jsx             # top bar: logo, user name+role, logout
│   ├── ProtectedRoute.jsx     # redirects if not logged in / wrong role
│   ├── AllergyBanner.jsx      # red safety-alert banner
│   ├── Toast.jsx              # success/error notifications
│   ├── DataTable.jsx          # reusable sortable table
│   ├── Spinner.jsx            # loading state
│   └── AllergyMultiSelect.jsx # fixed-vocabulary allergy picker
└── pages/
    ├── Landing.jsx            # public home
    ├── PatientRegister.jsx    # public self-registration form
    ├── Login.jsx              # staff login
    ├── admin/StaffDashboard.jsx
    ├── reception/PatientIntake.jsx
    ├── doctor/PatientList.jsx
    ├── doctor/PatientTimeline.jsx
    ├── lab/LabQueue.jsx
    ├── lab/ResultEntry.jsx
    ├── pharmacy/DispenseQueue.jsx
    └── patient/PatientPortal.jsx   # stretch goal
```

---

## 3. Routing Map

| Path | Page | Access |
| :-- | :-- | :-- |
| `/` | Landing | public |
| `/register` | PatientRegister | public |
| `/login` | Login | public |
| `/admin` | StaffDashboard | ADMIN |
| `/reception` | PatientIntake | RECEPTIONIST |
| `/doctor` | PatientList | DOCTOR |
| `/doctor/patient/:id` | PatientTimeline | DOCTOR |
| `/lab` | LabQueue | LAB_TECH |
| `/lab/entry/:orderId` | ResultEntry | LAB_TECH |
| `/pharmacy` | DispenseQueue | PHARMACIST |
| `/portal` | PatientPortal | PATIENT (stretch) |

After login, redirect to the default route for the user's role.

---

## 4. Per-Role Screens (wireframes)

### 4.1 Landing (`/`)
```
┌───────────────────────────────────────────────┐
│  SwasthyaEHR            [ Staff Login ]          │
│                                                  │
│   Better care through connected records.         │
│   ──────────────────────────────────────         │
│   [ Register as a New Patient → ]                │
│                                                  │
└───────────────────────────────────────────────┘
```

### 4.2 Patient Self-Registration (`/register`)
Fields: first name, last name, phone, DOB, gender (radio), allergies (multi-select from
fixed list). Submit → `POST /api/v1/patients/` → success screen showing the
`hospital_identifier` ("Please note your ID: HOSP-2026-00142").

### 4.3 Admin — Staff Dashboard (`/admin`)
```
┌ Staff Accounts ───────────────────  [+ Add Staff] ┐
│ Name           Role         Status      Action     │
│ Dr. Sita       DOCTOR       Active     [Deactivate]│
│ Ram Thapa      LAB_TECH     Active     [Deactivate]│
└────────────────────────────────────────────────────┘
```
"Add Staff" opens a modal form → `POST /api/v1/auth/staff/`.

### 4.4 Receptionist — Patient Intake (`/reception`)
Search bar (by name / hospital ID) + "Register Walk-in" form (same fields as 4.2).

### 4.5 Doctor — Patient List (`/doctor`) → Timeline (`/doctor/patient/:id`)
```
┌ Patient: Sita Kumari (HOSP-2026-00142) ───────────┐
│ ⚠ Allergies: Penicillin, NSAIDs                    │
├────────────────────────────────────────────────────┤
│ Lab Results (chart)      │  Prescriptions           │
│  Hgb ▁▂▃▅▇               │  • Amoxicillin  ACTIVE   │
│                          │  [ + Write Prescription ]│
│ [ + Order Lab Test ]     │                          │
└────────────────────────────────────────────────────┘
```
- "Order Lab Test" → dropdown (Hemoglobin/WBC/Platelets) → `POST /api/v1/lab-orders/`.
- "Write Prescription" → form (medication + dosage) → `POST /api/v1/prescriptions/`.
  - On **400 DRUG_ALLERGY_MATCH**, render `<AllergyBanner>` in red across the top and do
    NOT clear the form.

### 4.6 Lab Tech — Queue (`/lab`) → Result Entry (`/lab/entry/:orderId`)
```
┌ Pending Lab Orders ────────────────────────────────┐
│ Patient        Test         Priority    Created     │
│ Sita Kumari    Hemoglobin   URGENT     10:02        │
│ Ram Bahadur    WBC          ROUTINE    10:15        │
└────────────────────────────────────────────────────┘
```
Clicking a row → numeric-only input for that test (with unit shown), range-validated
client-side → `POST /api/v1/lab-observations/`.

### 4.7 Pharmacist — Dispense Queue (`/pharmacy`)
```
┌ Approved Prescriptions ────────────────────────────┐
│ Patient: Sita Kumari                                │
│  • Amoxicillin — 1 tab / 8h / 7d   [ Dispense ✓ ]  │
└────────────────────────────────────────────────────┘
```
"Dispense" → `POST /api/v1/prescriptions/<id>/fulfill/` → row moves to completed.

### 4.8 Patient Portal (`/portal`) — stretch goal
Read-only: lab trend chart + list of active medications. No edit actions.

---

## 5. Design System (so it does NOT look AI-generated)

The default "AI look" is: purple/indigo gradients, giant rounded cards, glassmorphism,
oversized hero text, emoji everywhere. **Avoid all of that.** This is a clinical tool —
it should feel like calm, dense, trustworthy software.

### 5.1 Colour tokens (Tailwind config)
```
primary   #0F4C81   (deep clinical blue — buttons, headers)
primaryHi #1E6FB8   (hover)
accent    #2E8B76   (success / dispensed — muted teal-green)
danger    #C0392B   (allergy alert — a serious red, not neon)
ink       #1A2332   (main text)
muted     #5B6472   (secondary text)
line      #E2E6EB   (borders)
bg        #F7F9FC   (app background — near-white, faint cool tint)
surface   #FFFFFF   (cards)
```

### 5.2 Rules that break the AI look
- **Real density.** Tables with modest row height, not huge padded cards. A hospital app
  shows a lot of data per screen.
- **Restrained corners.** `rounded-md` (6px) max — never `rounded-3xl`.
- **Flat, not glassy.** Subtle 1px borders (`line`) and a faint shadow; no gradients, no
  blur, no glow.
- **One accent, used sparingly.** Blue for primary actions only. Most of the UI is
  black text on white with grey lines.
- **System font stack**, not a trendy display font: `ui-sans-serif, system-ui, "Segoe UI", Roboto`.
- **No emoji in the UI.** Use `lucide-react` line icons at 16–18px.
- **Left-aligned, structured** forms — labels above inputs, consistent 8px spacing grid.
- **Buttons are rectangles with clear labels** ("Confirm Dispensation"), not pill-shaped
  gradient blobs.

### 5.3 Consistent components
Build these once and reuse everywhere so the app feels coherent: `Button` (primary /
secondary / danger), `Input`, `Select`, `Card`, `Table`, `Badge` (status pills),
`Modal`, `Toast`. Consistency is what makes UI look hand-crafted rather than generated.

---

## 6. Auth Flow (frontend side)

1. Login form → `POST /api/v1/auth/login/` → store `access` + `refresh` + `user` in
   `AuthContext` (and `localStorage`).
2. axios request interceptor attaches `Authorization: Bearer <access>` to every call.
3. axios response interceptor: on `401`, try `POST /api/v1/auth/refresh/` once; if that
   fails, log out and redirect to `/login`.
4. `ProtectedRoute` checks `user.role` against the route's allowed roles; mismatch →
   redirect to that role's home (or `/login` if unauthenticated).

---

## 7. What to build first (matches ROADMAP.md)

The frontend is built incrementally alongside the backend. Priority order:
Login/Auth → Admin staff → Patient registration → Doctor prescription (allergy banner) →
Lab entry → Pharmacy dispense → Charts → Patient portal (stretch).
