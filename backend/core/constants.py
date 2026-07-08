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
