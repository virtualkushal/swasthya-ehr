"""
Seed a full set of demo data for local exploration of the whole frontend.

Creates one staff login for EVERY role (so you can log in and see each
dashboard) plus a couple of sample patients — one with a Penicillin allergy so
you can immediately demo the pharmacy safety interceptor.

Usage:
    python manage.py seed_demo

All demo accounts use the password:  demo12345
This is for local development only — never run it against production.
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.constants import (
    Gender,
    LabOrderStatus,
    LabTest,
    PrescriptionStatus,
    RegisteredBy,
    Role,
)
from core.models import LabObservation, LabOrder, Patient, Prescription

Staff = get_user_model()


DEMO_PASSWORD = "demo12345"

# username, full name, role
DEMO_STAFF = [
    ("admin", "System Administrator", Role.ADMIN),
    ("reception", "Front Desk Receptionist", Role.RECEPTIONIST),
    ("doctor", "Dr. Anjali Sharma", Role.DOCTOR),
    ("labtech", "Lab Technician Bikash", Role.LAB_TECH),
    ("pharmacist", "Pharmacist Rojina", Role.PHARMACIST),
]

# first, last, phone, dob, gender, allergies, registered_by, portal_username
# When portal_username is set, the patient also gets a login (role PATIENT) so
# you can demo the read-only patient portal.
DEMO_PATIENTS = [
    (
        "Ram", "Bahadur", "+977-9841000001", date(1994, 5, 12),
        Gender.MALE, ["Penicillin"], RegisteredBy.SELF, "patient",
    ),
    (
        "Sita", "Kumari", "+977-9803000002", date(1988, 11, 23),
        Gender.FEMALE, ["None"], RegisteredBy.RECEPTIONIST, None,
    ),
]



class Command(BaseCommand):
    help = "Create demo staff (one per role) and sample patients for local testing."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Seeding demo staff..."))
        staff_by_role = {}
        for username, full_name, role in DEMO_STAFF:
            staff, created = Staff.objects.get_or_create(
                username=username,
                defaults={
                    "full_name": full_name,
                    "role": role,
                    "is_staff": role == Role.ADMIN,
                    "is_superuser": role == Role.ADMIN,
                },
            )
            staff_by_role[role] = staff
            if created:
                staff.set_password(DEMO_PASSWORD)
                staff.save()
                self.stdout.write(
                    self.style.SUCCESS(f"  + {username:<11} ({role})")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"  = {username:<11} already exists — skipped")
                )


        self.stdout.write(self.style.MIGRATE_HEADING("Seeding demo patients..."))
        for (
            first, last, phone, dob, gender, allergies, reg_by, portal_username
        ) in DEMO_PATIENTS:
            patient = Patient.objects.filter(
                first_name=first, last_name=last, phone_number=phone
            ).first()
            if patient is not None:
                self.stdout.write(
                    self.style.WARNING(
                        f"  = {first} {last} already exists — reusing"
                    )
                )
            else:
                # Optionally create a linked login (role PATIENT) for the portal.
                user = None
                if portal_username and not Staff.objects.filter(
                    username=portal_username
                ).exists():
                    user = Staff.objects.create(
                        username=portal_username,
                        full_name=f"{first} {last}",
                        role=Role.PATIENT,
                    )
                    user.set_password(DEMO_PASSWORD)
                    user.save()

                patient = Patient.objects.create(
                    user=user,
                    first_name=first,
                    last_name=last,
                    phone_number=phone,
                    date_of_birth=dob,
                    gender=gender,
                    allergies=allergies,
                    registered_by=reg_by,
                )
                login_note = f" [portal login: {portal_username}]" if user else ""
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  + {first} {last} ({patient.hospital_identifier}) "
                        f"allergies={allergies}{login_note}"
                    )
                )

            # Give every demo patient some clinical history so the doctor's
            # timeline + lab-trend charts are populated out of the box.
            self._seed_clinical_history(patient, staff_by_role)

        self.stdout.write("")

        self.stdout.write(self.style.SUCCESS("Demo data ready. Log in at /login with:"))
        for username, _full_name, role in DEMO_STAFF:
            self.stdout.write(f"    {username:<11} / {DEMO_PASSWORD}   -> {role}")
        for *_rest, portal_username in DEMO_PATIENTS:
            if portal_username:
                self.stdout.write(
                    f"    {portal_username:<11} / {DEMO_PASSWORD}   -> {Role.PATIENT}"
                )
        self.stdout.write("")
        self.stdout.write(
            "Tip: as 'doctor', prescribe 'Penicillin G' to Ram Bahadur to see the "
            "red safety block; prescribe a safe drug to send it to the pharmacy queue. "
            "Log in as 'patient' to see the read-only patient portal."
        )

    def _seed_clinical_history(self, patient, staff_by_role):
        """
        Create a small, realistic clinical history for a demo patient so the
        doctor's timeline and lab-trend charts show data immediately.

        Idempotent: if the patient already has observations we skip, so re-running
        `seed_demo` doesn't pile up duplicates.
        """
        if LabObservation.objects.filter(patient=patient).exists():
            self.stdout.write(
                self.style.WARNING(
                    f"    = {patient.first_name}'s clinical history already seeded"
                )
            )
            return

        doctor = staff_by_role.get(Role.DOCTOR)
        labtech = staff_by_role.get(Role.LAB_TECH)
        pharmacist = staff_by_role.get(Role.PHARMACIST)
        now = timezone.now()

        # Three Hemoglobin readings + two WBC readings across the last ~5 weeks so
        # the trend charts have a visible line.
        lab_points = [
            (LabTest.HEMOGLOBIN, "12.10", 35),
            (LabTest.HEMOGLOBIN, "13.40", 21),
            (LabTest.HEMOGLOBIN, "14.20", 3),
            (LabTest.WBC, "6.50", 21),
            (LabTest.WBC, "7.10", 3),
        ]
        for test_name, value, days_ago in lab_points:
            order = LabOrder.objects.create(
                patient=patient,
                ordered_by=doctor,
                test_name=test_name,
                status=LabOrderStatus.COMPLETED,
            )
            obs = LabObservation.objects.create(
                patient=patient,
                lab_order=order,
                entered_by=labtech,
                test_name=test_name,
                result_value=value,
            )
            # created_at is auto_now_add, so backdate it explicitly for the chart.
            stamp = now - timedelta(days=days_ago)
            LabObservation.objects.filter(pk=obs.pk).update(created_at=stamp)
            LabOrder.objects.filter(pk=order.pk).update(created_at=stamp)

        # A couple of prescriptions (safe drugs — no allergy conflict). One is
        # already fulfilled, one still active/queued for the pharmacist.
        rx_data = [
            ("Paracetamol 500mg", "1 tablet every 6 hours for 3 days",
             PrescriptionStatus.COMPLETED, 20),
            ("Amlodipine 5mg", "1 tablet once daily",
             PrescriptionStatus.ACTIVE, 2),
        ]
        for med, dosage, rx_status, days_ago in rx_data:
            rx = Prescription.objects.create(
                patient=patient,
                prescribed_by=doctor,
                medication_name=med,
                dosage_instruction=dosage,
                status=rx_status,
            )
            stamp = now - timedelta(days=days_ago)
            fields = {"created_at": stamp}
            if rx_status == PrescriptionStatus.COMPLETED:
                rx.fulfilled_by = pharmacist
                rx.fulfilled_at = stamp
                rx.save(update_fields=["fulfilled_by", "fulfilled_at"])
                fields["updated_at"] = stamp
            Prescription.objects.filter(pk=rx.pk).update(**fields)

        self.stdout.write(
            self.style.SUCCESS(
                f"    + clinical history for {patient.first_name}: "
                f"{len(lab_points)} lab results, {len(rx_data)} prescriptions"
            )
        )



