"""
Shared constants for the SwasthyaEHR domain.

Kept in one place so models, serializers, and validators all agree. These
values mirror docs/DATABASE_SCHEMA.md — if they ever disagree, the schema doc
wins.
"""


class Role:
    """Staff roles. Stored as UPPER_SNAKE_CASE strings on the Staff model."""

    ADMIN = "ADMIN"
    RECEPTIONIST = "RECEPTIONIST"
    DOCTOR = "DOCTOR"
    LAB_TECH = "LAB_TECH"
    PHARMACIST = "PHARMACIST"
    PATIENT = "PATIENT"

    CHOICES = [
        (ADMIN, "System Administrator"),
        (RECEPTIONIST, "Receptionist"),
        (DOCTOR, "Doctor"),
        (LAB_TECH, "Laboratory Technician"),
        (PHARMACIST, "Pharmacist"),
        (PATIENT, "Patient"),
    ]


class Gender:
    """Lowercase to satisfy the FHIR `Patient.gender` requirement."""

    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    UNKNOWN = "unknown"

    CHOICES = [
        (MALE, "Male"),
        (FEMALE, "Female"),
        (OTHER, "Other"),
        (UNKNOWN, "Unknown"),
    ]


class RegisteredBy:
    """How a patient profile row was created."""

    SELF = "SELF"
    RECEPTIONIST = "RECEPTIONIST"

    CHOICES = [
        (SELF, "Self (public form)"),
        (RECEPTIONIST, "Receptionist"),
    ]


# Fixed allergen vocabulary. Free text is prohibited so the safety engine's
# substring match stays reliable.
ALLERGEN_VOCABULARY = [
    "Penicillin",
    "Sulfa Drugs",
    "Aspirin",
    "NSAIDs",
    "Anticonvulsants",
    "None",
]


class LabTest:
    """The three supported lab tests, each bound to a LOINC code, unit, range."""

    HEMOGLOBIN = "HEMOGLOBIN"
    WBC = "WBC"
    PLATELETS = "PLATELETS"

    CHOICES = [
        (HEMOGLOBIN, "Hemoglobin"),
        (WBC, "White Blood Cells"),
        (PLATELETS, "Platelets"),
    ]

    # test_name -> {loinc, unit, min, max}
    REFERENCE = {
        HEMOGLOBIN: {"loinc": "718-7", "unit": "g/dL", "min": 0.00, "max": 25.00},
        WBC: {"loinc": "6690-2", "unit": "10^3/uL", "min": 0.00, "max": 50.00},
        PLATELETS: {"loinc": "777-3", "unit": "10^3/uL", "min": 0.00, "max": 1000.00},
    }


class LabOrderStatus:
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"

    CHOICES = [(PENDING, "Pending"), (COMPLETED, "Completed")]


class LabOrderPriority:
    ROUTINE = "ROUTINE"
    URGENT = "URGENT"

    CHOICES = [(ROUTINE, "Routine"), (URGENT, "Urgent")]


class PrescriptionStatus:
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"

    CHOICES = [(ACTIVE, "Active"), (COMPLETED, "Completed")]


class DiagnosisStatus:
    """Clinical status of a recorded diagnosis (FHIR Condition.clinicalStatus)."""

    ACTIVE = "ACTIVE"
    RESOLVED = "RESOLVED"

    CHOICES = [(ACTIVE, "Active"), (RESOLVED, "Resolved")]


class ICD10:
    """
    Curated ICD-10 diagnosis vocabulary.

    A doctor records a diagnosis by picking from this fixed, coded list so every
    stored condition carries a valid, interoperable ICD-10 code (the WHO standard
    used for national reporting in Nepal). This is NOT an exhaustive ICD-10 set —
    it is a practical starter list of common, Nepal-relevant conditions. The
    system only RECORDS a doctor's chosen diagnosis; it never auto-diagnoses.

    Each entry: code -> human-readable display name.
    """

    CODES = {
        # Infectious / communicable
        "A01.0": "Typhoid fever",
        "A09": "Acute gastroenteritis / diarrhoea",
        "A15.9": "Respiratory tuberculosis",
        "A90": "Dengue fever",
        "B50.9": "Plasmodium falciparum malaria",
        "B54": "Malaria, unspecified",
        "B19.9": "Viral hepatitis, unspecified",
        "J00": "Acute nasopharyngitis (common cold)",
        "J02.9": "Acute pharyngitis",
        "J03.9": "Acute tonsillitis",
        "J06.9": "Acute upper respiratory infection",
        "J18.9": "Pneumonia, unspecified",
        "N39.0": "Urinary tract infection",
        # Chronic / non-communicable
        "E11.9": "Type 2 diabetes mellitus",
        "E10.9": "Type 1 diabetes mellitus",
        "I10": "Essential (primary) hypertension",
        "I25.1": "Atherosclerotic heart disease",
        "I50.9": "Heart failure, unspecified",
        "J44.9": "Chronic obstructive pulmonary disease (COPD)",
        "J45.9": "Asthma",
        "E78.5": "Hyperlipidaemia, unspecified",
        "E03.9": "Hypothyroidism, unspecified",
        "E05.9": "Hyperthyroidism, unspecified",
        "N18.9": "Chronic kidney disease, unspecified",
        "K21.9": "Gastro-oesophageal reflux disease (GERD)",
        "K29.7": "Gastritis, unspecified",
        "K76.0": "Fatty liver (non-alcoholic)",
        # Blood / nutrition
        "D50.9": "Iron deficiency anaemia",
        "D64.9": "Anaemia, unspecified",
        "E66.9": "Obesity, unspecified",
        "E43": "Severe protein-energy malnutrition",
        # Musculoskeletal / neuro
        "M54.5": "Low back pain",
        "M17.9": "Osteoarthritis of knee",
        "G43.9": "Migraine, unspecified",
        "R51": "Headache",
        # Mental health
        "F32.9": "Depressive episode, unspecified",
        "F41.9": "Anxiety disorder, unspecified",
        # Symptoms / signs / general
        "R50.9": "Fever, unspecified",
        "R05": "Cough",
        "R10.4": "Abdominal pain, unspecified",
        "A08.4": "Viral intestinal infection (viral fever)",
        "T78.4": "Allergy, unspecified",
    }

    # Django choices form: [(code, "code — display"), ...]
    CHOICES = [(code, f"{code} — {name}") for code, name in CODES.items()]

    @classmethod
    def is_valid(cls, code):
        return code in cls.CODES

    @classmethod
    def display(cls, code):
        return cls.CODES.get(code, "")


