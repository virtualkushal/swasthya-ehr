"""
HL7 FHIR R4 serializers for SwasthyaEHR.

These are read-only: they translate our flat PostgreSQL rows into nested,
standards-compliant FHIR R4 JSON on the fly. We build the JSON by hand (no heavy
`fhir.resources` dependency) so the mapping is explicit and easy to explain.

Mapping rules mirror docs/FHIR_MAPPING.md exactly — if they ever disagree, that
document wins.
"""

# The identifier system URI printed on every Patient resource.
PATIENT_ID_SYSTEM = "https://hospital.swasthya.org.np/ids"


def patient_to_fhir(patient):
    """Map a core.Patient row to a FHIR R4 `Patient` resource (dict)."""
    resource = {
        "resourceType": "Patient",
        "id": str(patient.id),
        "active": True,
        "identifier": [
            {
                "system": PATIENT_ID_SYSTEM,
                "value": patient.hospital_identifier,
            }
        ],
        "name": [
            {
                "use": "official",
                "family": patient.last_name,
                "given": [patient.first_name],
            }
        ],
        "telecom": [
            {
                "system": "phone",
                "value": patient.phone_number,
                "use": "mobile",
            }
        ],
        "gender": (patient.gender or "unknown").lower(),
    }
    if patient.date_of_birth:
        # FHIR birthDate is a plain YYYY-MM-DD string.
        resource["birthDate"] = patient.date_of_birth.isoformat()
    return resource


def observation_to_fhir(observation):
    """Map a core.LabObservation row to a FHIR R4 `Observation` resource."""
    return {
        "resourceType": "Observation",
        "id": str(observation.id),
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": (
                            "http://terminology.hl7.org/CodeSystem/"
                            "observation-category"
                        ),
                        "code": "laboratory",
                        "display": "Laboratory",
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": observation.loinc_code,
                    "display": observation.get_test_name_display(),
                }
            ]
        },
        "subject": {
            "reference": f"Patient/{observation.patient_id}",
        },
        "effectiveDateTime": observation.created_at.isoformat(),
        "valueQuantity": {
            "value": float(observation.result_value),
            "unit": observation.result_unit,
            "system": "http://unitsofmeasure.org",
            "code": observation.result_unit,
        },
    }


def build_everything_bundle(patient, observations, base_url):
    """
    Build a FHIR `Bundle` (type=searchset) containing the patient plus every one
    of their observations. `base_url` is used to construct each entry's fullUrl.
    """
    base = base_url.rstrip("/")
    entries = [
        {
            "fullUrl": f"{base}/api/fhir/v1/Patient/{patient.id}/",
            "resource": patient_to_fhir(patient),
        }
    ]
    for obs in observations:
        entries.append(
            {
                "fullUrl": f"{base}/api/fhir/v1/Observation/{obs.id}/",
                "resource": observation_to_fhir(obs),
            }
        )

    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(entries),
        "entry": entries,
    }
