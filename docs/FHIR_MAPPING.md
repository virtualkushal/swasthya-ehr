# Relational Data → HL7 FHIR R4 JSON Mapping Specification
## Project: SwasthyaEHR — FHIR-Enabled Hospital EHR & Pharmacy Safety System

---

## 1. Design Decisions (read first)

| Decision | Choice | Why |
| :-- | :-- | :-- |
| FHIR version | **R4** | Best validator/tool support. |
| Direction | **Read-only (GET)** | We export FHIR; we do NOT ingest it. Writes use the flat `/api/v1/` endpoints. |
| Implementation | **Hand-built JSON via DRF serializers** | Full control, lightweight, easy to explain. No heavy `fhir.resources` dependency required. |
| Resources built | **Patient, Observation, Bundle** | Two core resources + one Bundle operation. |
| Content-Type header | `application/fhir+json; charset=UTF-8` | Required by the standard. |
| Validation | Official **HL7 FHIR Validator** (validator.fhir.org) / **Inferno** | Screenshot the zero-error result for the report. |

**How it works:** flat PostgreSQL rows are translated on-the-fly by dedicated serializer
classes in `backend/core/serializers/fhir_serializers.py`. Each class overrides
`to_representation()` to build the nested structure and inject fixed context tags. The
database is never reshaped to look like FHIR.

```
Flat DB row ──► FHIR serializer (to_representation) ──► nested FHIR JSON ──► /api/fhir/v1/...
```

---

## 2. FHIR Endpoints

| Method | Route | Returns |
| :-- | :-- | :-- |
| GET | `/api/fhir/v1/Patient/<id>/` | one `Patient` resource |
| GET | `/api/fhir/v1/Observation/<id>/` | one `Observation` resource |
| GET | `/api/fhir/v1/Patient/<id>/$everything/` | a `Bundle` (patient + all their observations) |

All require a valid JWT. Access roles: see RBAC_AND_ROLES.md (`ADMIN, DOCTOR, PHARMACIST, LAB_TECH` may read FHIR; `PATIENT` may not access the raw FHIR API).

---

## 3. Resource Mapping: `core_patient` → FHIR `Patient`

### 3.1 Mapping Table

| PostgreSQL column (`core_patient`) | FHIR R4 JSON path | Transformation rule |
| :-- | :-- | :-- |
| — | `resourceType` | fixed string `"Patient"` |
| `id` | `id` | UUID → plain string |
| — | `active` | fixed `true` |
| `hospital_identifier` | `identifier[0].value` | with `"system": "https://hospital.swasthya.org.np/ids"` |
| `first_name` | `name[0].given[0]` | wrap inside an array |
| `last_name` | `name[0].family` | plain string |
| — | `name[0].use` | fixed `"official"` |
| `phone_number` | `telecom[0].value` | with `"system": "phone"`, `"use": "mobile"` |
| `gender` | `gender` | lowercase (`male`/`female`/`other`/`unknown`) |
| `date_of_birth` | `birthDate` | stringify as `YYYY-MM-DD` |

### 3.2 Target JSON Specimen

```json
{
  "resourceType": "Patient",
  "id": "8fa3e5b1-12cd-4e89-b712-1f4a9b2c3d4e",
  "active": true,
  "identifier": [
    {
      "system": "https://hospital.swasthya.org.np/ids",
      "value": "HOSP-2026-00142"
    }
  ],
  "name": [
    {
      "use": "official",
      "family": "Shrestha",
      "given": ["Ram", "Bahadur"]
    }
  ],
  "telecom": [
    {
      "system": "phone",
      "value": "+977-9841XXXXXX",
      "use": "mobile"
    }
  ],
  "gender": "male",
  "birthDate": "1994-05-12"
}
```

---

## 4. Resource Mapping: `core_labobservation` → FHIR `Observation`

### 4.1 Mapping Table

| PostgreSQL column (`core_labobservation`) | FHIR R4 JSON path | Transformation rule |
| :-- | :-- | :-- |
| — | `resourceType` | fixed string `"Observation"` |
| `id` | `id` | UUID → plain string |
| — | `status` | fixed `"final"` |
| — | `category[0].coding[0]` | fixed: system `"http://terminology.hl7.org/CodeSystem/observation-category"`, code `"laboratory"`, display `"Laboratory"` |
| `loinc_code` | `code.coding[0].code` | e.g. `"718-7"` |
| `test_name` | `code.coding[0].display` | e.g. `"Hemoglobin"` |
| — | `code.coding[0].system` | fixed `"http://loinc.org"` |
| `patient_id` | `subject.reference` | format `"Patient/<uuid>"` |
| `created_at` | `effectiveDateTime` | ISO 8601 timestamp |
| `result_value` | `valueQuantity.value` | float |
| `result_unit` | `valueQuantity.unit` | e.g. `"g/dL"` |
| — | `valueQuantity.system` | fixed `"http://unitsofmeasure.org"` |
| `result_unit` | `valueQuantity.code` | UCUM code (same as unit for our 3 tests) |

### 4.2 Target JSON Specimen

```json
{
  "resourceType": "Observation",
  "id": "e3c1b0a4-d9ef-4123-a152-7b8c9d0e1f2a",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "laboratory",
          "display": "Laboratory"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "718-7",
        "display": "Hemoglobin"
      }
    ]
  },
  "subject": {
    "reference": "Patient/8fa3e5b1-12cd-4e89-b712-1f4a9b2c3d4e"
  },
  "effectiveDateTime": "2026-07-08T18:30:00+05:45",
  "valueQuantity": {
    "value": 14.20,
    "unit": "g/dL",
    "system": "http://unitsofmeasure.org",
    "code": "g/dL"
  }
}
```

---

## 5. Resource Mapping: FHIR `Bundle` (`$everything`)

`GET /api/fhir/v1/Patient/<id>/$everything/` returns one `Patient` plus every
`Observation` belonging to that patient, wrapped in a searchset `Bundle`.

### 5.1 Rules

| FHIR path | Rule |
| :-- | :-- |
| `resourceType` | fixed `"Bundle"` |
| `type` | fixed `"searchset"` |
| `total` | integer count of entries (patient + observations) |
| `entry[]` | one object per resource |
| `entry[n].resource` | the full Patient or Observation JSON (from §3 / §4) |
| `entry[n].fullUrl` | `"<base>/api/fhir/v1/<ResourceType>/<id>/"` |

### 5.2 Target JSON Specimen (abbreviated)

```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 2,
  "entry": [
    {
      "fullUrl": "http://localhost:8000/api/fhir/v1/Patient/8fa3e5b1-12cd-4e89-b712-1f4a9b2c3d4e/",
      "resource": {
        "resourceType": "Patient",
        "id": "8fa3e5b1-12cd-4e89-b712-1f4a9b2c3d4e",
        "...": "see section 3.2"
      }
    },
    {
      "fullUrl": "http://localhost:8000/api/fhir/v1/Observation/e3c1b0a4-d9ef-4123-a152-7b8c9d0e1f2a/",
      "resource": {
        "resourceType": "Observation",
        "id": "e3c1b0a4-d9ef-4123-a152-7b8c9d0e1f2a",
        "...": "see section 4.2"
      }
    }
  ]
}
```

---

## 6. Validation Procedure (do this for your report)

1. Run the backend locally and hit each FHIR endpoint (browser or `curl`).
2. Copy the JSON response.
3. Paste it into **https://validator.fhir.org** (select version **R4**), OR run it
   through the **Inferno** test suite.
4. Fix any warnings until the resource validates with **zero errors**.
5. Screenshot the passing result — this is your interoperability proof.

> **Tip:** the most common validator errors are missing `resourceType`, wrong `gender`
> casing, and `valueQuantity` missing its `system`/`code`. The mappings above already
> account for all three.
