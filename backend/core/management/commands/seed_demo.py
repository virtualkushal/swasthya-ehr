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

from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from core.constants import Gender, RegisteredBy, Role
from core.models import Patient

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
            exists = Patient.objects.filter(
                first_name=first, last_name=last, phone_number=phone
            ).exists()
            if exists:
                self.stdout.write(
                    self.style.WARNING(f"  = {first} {last} already exists — skipped")
                )
                continue

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


