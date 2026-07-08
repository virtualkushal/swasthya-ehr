"""
Database models for SwasthyaEHR.

These mirror docs/DATABASE_SCHEMA.md exactly. Every table uses a UUID primary
key and created_at/updated_at timestamps.
"""

import uuid

from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.indexes import GinIndex
from django.db import models, transaction

from .constants import (
    Gender,
    LabOrderPriority,
    LabOrderStatus,
    LabTest,
    PrescriptionStatus,
    RegisteredBy,
    Role,
)


class TimeStampedUUIDModel(models.Model):
    """Abstract base: UUID primary key + auto timestamps for every table."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Staff(AbstractUser):
    """
    Custom user model = hospital employee.

    We extend Django's AbstractUser so `role` lives on the user object and JWT
    can read it directly. `full_name` is our display field; Django's first/last
    name fields are left available but unused by our UI.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=Role.CHOICES)
    # email is optional but unique when present.
    email = models.EmailField(blank=True, null=True, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "core_staff"

    def __str__(self):
        return f"{self.full_name or self.username} ({self.role})"

    def save(self, *args, **kwargs):
        # Normalise empty-string email to NULL so the unique constraint allows
        # multiple staff without an email.
        if self.email == "":
            self.email = None
        super().save(*args, **kwargs)


class Patient(TimeStampedUUIDModel):
    """Patient demographics + allergy list (JSONB)."""

    hospital_identifier = models.CharField(max_length=20, unique=True, editable=False)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=Gender.CHOICES)
    allergies = models.JSONField(default=list, blank=True)
    registered_by = models.CharField(max_length=20, choices=RegisteredBy.CHOICES)

    class Meta:
        db_table = "core_patient"
        indexes = [GinIndex(fields=["allergies"], name="patient_allergies_gin")]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.hospital_identifier})"

    def save(self, *args, **kwargs):
        if not self.hospital_identifier:
            self.hospital_identifier = self._generate_hospital_identifier()
        super().save(*args, **kwargs)

    @staticmethod
    def _generate_hospital_identifier():
        """
        Build a human-readable id: HOSP-YYYY-NNNNN.

        NNNNN is a zero-padded running count within the current year. Wrapped in
        a transaction with row locking to avoid two registrations colliding.
        """
        from django.utils import timezone

        year = timezone.now().year
        prefix = f"HOSP-{year}-"
        with transaction.atomic():
            last = (
                Patient.objects.select_for_update()
                .filter(hospital_identifier__startswith=prefix)
                .order_by("-hospital_identifier")
                .first()
            )
            next_seq = 1
            if last:
                try:
                    next_seq = int(last.hospital_identifier.split("-")[-1]) + 1
                except (ValueError, IndexError):
                    next_seq = 1
            return f"{prefix}{next_seq:05d}"


class LabOrder(TimeStampedUUIDModel):
    """A doctor's request for a lab test (the lab's pending to-do)."""

    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="lab_orders"
    )
    ordered_by = models.ForeignKey(
        Staff, on_delete=models.PROTECT, related_name="ordered_lab_orders"
    )
    test_name = models.CharField(max_length=50, choices=LabTest.CHOICES)
    loinc_code = models.CharField(max_length=20)
    status = models.CharField(
        max_length=20, choices=LabOrderStatus.CHOICES, default=LabOrderStatus.PENDING
    )
    priority = models.CharField(
        max_length=10,
        choices=LabOrderPriority.CHOICES,
        default=LabOrderPriority.ROUTINE,
    )

    class Meta:
        db_table = "core_laborder"

    def save(self, *args, **kwargs):
        # loinc_code is derived from the chosen test; keep them in sync.
        ref = LabTest.REFERENCE.get(self.test_name)
        if ref:
            self.loinc_code = ref["loinc"]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.test_name} for {self.patient} [{self.status}]"


class LabObservation(TimeStampedUUIDModel):
    """A completed lab result entered by a lab tech. Feeds FHIR Observation."""

    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="lab_observations"
    )
    lab_order = models.ForeignKey(
        LabOrder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="observations",
    )
    entered_by = models.ForeignKey(
        Staff, on_delete=models.PROTECT, related_name="entered_observations"
    )
    test_name = models.CharField(max_length=50, choices=LabTest.CHOICES)
    loinc_code = models.CharField(max_length=20)
    result_value = models.DecimalField(max_digits=7, decimal_places=2)
    result_unit = models.CharField(max_length=20)

    class Meta:
        db_table = "core_labobservation"

    def save(self, *args, **kwargs):
        ref = LabTest.REFERENCE.get(self.test_name)
        if ref:
            self.loinc_code = ref["loinc"]
            self.result_unit = ref["unit"]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.test_name}={self.result_value}{self.result_unit} for {self.patient}"


class Prescription(TimeStampedUUIDModel):
    """A medication order written by a doctor, fulfilled by a pharmacist."""

    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="prescriptions"
    )
    prescribed_by = models.ForeignKey(
        Staff, on_delete=models.PROTECT, related_name="written_prescriptions"
    )
    fulfilled_by = models.ForeignKey(
        Staff,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="fulfilled_prescriptions",
    )
    medication_name = models.CharField(max_length=200)
    dosage_instruction = models.CharField(max_length=500)
    status = models.CharField(
        max_length=20,
        choices=PrescriptionStatus.CHOICES,
        default=PrescriptionStatus.ACTIVE,
    )
    fulfilled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "core_prescription"

    def __str__(self):
        return f"{self.medication_name} for {self.patient} [{self.status}]"
