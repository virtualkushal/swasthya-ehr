# Role-Based Access Control (RBAC) & User Roles Specification
## Project: SwasthyaEHR — FHIR-Enabled Hospital EHR & Pharmacy Safety System

> This file replaces the old duplicated `database.md` and `user roles.md`.

---

## 1. Global Security Access Matrix

RBAC is enforced at the **backend API layer**. Even if a user edits the React code to
reveal a hidden button, the Django API drops the request when the authenticated role
token does not match the endpoint's rules.

| System Function / Endpoint | ADMIN | RECEPTIONIST | DOCTOR | LAB_TECH | PHARMACIST | PATIENT (self) |
| :-- | :-: | :-: | :-: | :-: | :-: | :-: |
| **Login / refresh / me** (`/api/v1/auth/login|refresh|me/`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Manage staff** (`/api/v1/auth/staff/`) | **WRITE** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Register patient** (`/api/v1/patients/`) | **WRITE** | **WRITE** | ❌ | ❌ | ❌ | **WRITE** |
| **Search patients** (`/api/v1/patients/?search=`) | ❌ | **READ** | **READ** | ❌ | **READ** | ❌ |
| **View patient profile** (`/api/v1/patients/<id>/`) | ❌ | **READ** | **READ** | ❌ | **READ** | **READ (own)** |
| **Create lab order** (`/api/v1/lab-orders/`) | ❌ | ❌ | **WRITE** | ❌ | ❌ | ❌ |
| **View lab queue** (`/api/v1/lab-orders/?status=PENDING`) | ❌ | ❌ | ❌ | **READ** | ❌ | ❌ |
| **Submit lab result** (`/api/v1/lab-observations/`) | ❌ | ❌ | ❌ | **WRITE** | ❌ | ❌ |
| **View observations** (`/api/v1/lab-observations/?patient_id=`) | ❌ | ❌ | **READ** | **READ** | ❌ | **READ (own)** |
| **Write prescription** (`/api/v1/prescriptions/`) | ❌ | ❌ | **WRITE** | ❌ | ❌ | ❌ |
| **View prescriptions** (`/api/v1/prescriptions/`) | ❌ | ❌ | **READ** | ❌ | **READ** | **READ (own)** |
| **Fulfill prescription** (`/api/v1/prescriptions/<id>/fulfill/`) | ❌ | ❌ | ❌ | ❌ | **WRITE** | ❌ |
| **ICD-10 catalog** (`/api/v1/icd10/`) | **READ** | **READ** | **READ** | **READ** | **READ** | **READ** |
| **Record diagnosis** (`/api/v1/diagnoses/`) | ❌ | ❌ | **WRITE** | ❌ | ❌ | ❌ |
| **View diagnoses** (`/api/v1/diagnoses/?patient=`) | ❌ | ❌ | **READ** | ❌ | ❌ | **READ (own)** |
| **Resolve diagnosis** (`/api/v1/diagnoses/<id>/resolve/`) | ❌ | ❌ | **WRITE** | ❌ | ❌ | ❌ |
| **FHIR API** (`/api/fhir/v1/*`) | **READ** | ❌ | **READ** | **READ** | **READ** | ❌ |


> "own" = the row is filtered by the authenticated patient's token — a patient can never
> read another patient's data.

---

## 2. Roles & Interface Boundaries

### 2.1 System Administrator (`ADMIN`)
- **Mandate:** platform maintenance, staff onboarding, access-control audit.
- **Backend:** full read/write on `core_staff`.
- **UI:** data-table dashboard listing personnel; forms to add staff or deactivate keys.
- **Hard constraint:** **zero** access to patient vitals, clinical notes, or lab data.

### 2.2 Receptionist (`RECEPTIONIST`)
- **Mandate:** front-desk patient intake and record lookup.
- **Backend:** write to `core_patient` (registration); read patient summaries for search.
- **UI:** a search bar + a "Register Walk-in Patient" form (same fields as the public
  form). Cannot see clinical notes, labs, or prescriptions.
- **Hard constraint:** demographic data only — no clinical read access.

### 2.3 Healthcare Practitioner (`DOCTOR`)
- **Mandate:** patient evaluation, history, lab ordering, prescribing.
- **Backend:** read `core_patient`; read `core_labobservation`; write `core_laborder`
  and `core_prescription`.
- **UI:** patient search → clinical timeline (labs + prescriptions), notes textarea,
  "Order Lab" dropdown, "Write Prescription" form with live allergy-alert banner.

### 2.4 Laboratory Technician (`LAB_TECH`)
- **Mandate:** process samples, enter results, align LOINC codes.
- **Backend:** read pending `core_laborder`; write `core_labobservation`.
- **UI:** lab queue sorted by urgency; clicking a row opens a numeric-only form for
  Hemoglobin / WBC / Platelets.
- **Hard constraint:** cannot read patient prescriptions or medication history.

### 2.5 Pharmacist (`PHARMACIST`)
- **Mandate:** verify and dispense medications.
- **Backend:** read active `core_prescription`; update status `ACTIVE → COMPLETED`.
- **UI:** dispensing queue grouped by patient; "Confirm Dispensation" button per row.

### 2.6 Patient (`PATIENT`)
- **Mandate:** self-registration and read-only review of own record.
- **Backend:** write own `core_patient` row at registration; read own labs &
  prescriptions (token-scoped).
- **UI:** public onboarding form + read-only portal (lab trend charts, active meds).
- **Note:** patient login/portal is a **v1 stretch goal**; the self-registration form is
  the priority (see DATABASE_SCHEMA.md §3).

---

## 3. Implementation Blueprint (Django REST Framework)

Enforce roles with one reusable permission class. Each view declares an `allowed_roles`
attribute; the class checks the authenticated user's role against it.

```python
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied


class EnforceStrictRole(BasePermission):
    """
    Checks the authenticated user's role against the view's `allowed_roles`.
    """

    def has_permission(self, request, view):
        # 1. Must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # 2. Roles allowed on this view
        allowed_roles = getattr(view, "allowed_roles", [])

        # 3. Match user's role to the whitelist
        user_role = getattr(request.user, "role", None)
        if user_role in allowed_roles:
            return True

        # 4. Explicit denial
        raise PermissionDenied(
            f"Access Denied: role '{user_role}' is not authorized for this action."
        )
```

Example usage on a view:

```python
class PrescriptionCreateView(generics.CreateAPIView):
    permission_classes = [EnforceStrictRole]
    allowed_roles = ["DOCTOR"]
    # ...
```

**Object-level scoping (patient "own data"):** for patient-facing reads, additionally
filter the queryset by the authenticated patient so one patient can never fetch another's
rows:

```python
def get_queryset(self):
    qs = super().get_queryset()
    if self.request.user.role == "PATIENT":
        return qs.filter(patient__id=self.request.user.patient_id)
    return qs
```
