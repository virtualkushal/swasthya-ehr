"""
Tests for the Diagnoses (problem-list) feature.

Focus: doctor-only writes, ICD-10 validation, patient-own scoping, and the
resolve action. These mirror the acceptance checks in the feat/diagnoses plan.
"""

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase


from .constants import DiagnosisStatus, Gender, RegisteredBy, Role
from .models import Diagnosis, Patient

Staff = get_user_model()


class DiagnosisAPITests(APITestCase):
    def setUp(self):
        # A doctor who records diagnoses.
        self.doctor = Staff.objects.create_user(
            username="dr_gurung",
            password="testpass123",
            full_name="Dr Gurung",
            role=Role.DOCTOR,
        )
        # A lab tech who must NOT be able to record diagnoses.
        self.lab_tech = Staff.objects.create_user(
            username="lab1",
            password="testpass123",
            full_name="Lab One",
            role=Role.LAB_TECH,
        )
        # Two patient login accounts, each linked to their own profile.
        self.patient_user_a = Staff.objects.create_user(
            username="patient_a",
            password="testpass123",
            full_name="Sita Kumari",
            role=Role.PATIENT,
        )
        self.patient_user_b = Staff.objects.create_user(
            username="patient_b",
            password="testpass123",
            full_name="Ram Bahadur",
            role=Role.PATIENT,
        )
        self.patient_a = Patient.objects.create(
            user=self.patient_user_a,
            first_name="Sita",
            last_name="Kumari",
            phone_number="+977-9800000000",
            date_of_birth="1990-01-01",
            gender=Gender.FEMALE,
            registered_by=RegisteredBy.SELF,
        )
        self.patient_b = Patient.objects.create(
            user=self.patient_user_b,
            first_name="Ram",
            last_name="Bahadur",
            phone_number="+977-9811111111",
            date_of_birth="1985-05-05",
            gender=Gender.MALE,
            registered_by=RegisteredBy.SELF,
        )

    # --- helpers -------------------------------------------------------- #

    def auth(self, user):
        self.client.force_authenticate(user=user)

    # --- tests ---------------------------------------------------------- #

    def test_doctor_can_record_diagnosis_and_name_is_derived(self):
        self.auth(self.doctor)
        res = self.client.post(
            "/api/v1/diagnoses/",
            {"patient": str(self.patient_a.id), "icd10_code": "J18.9"},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.data["disease_name"], "Pneumonia, unspecified")
        self.assertEqual(res.data["clinical_status"], DiagnosisStatus.ACTIVE)
        self.assertEqual(res.data["diagnosed_by_name"], "Dr Gurung")

    def test_invalid_icd10_is_rejected(self):
        self.auth(self.doctor)
        res = self.client.post(
            "/api/v1/diagnoses/",
            {"patient": str(self.patient_a.id), "icd10_code": "ZZ.999"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("icd10_code", res.data)

    def test_non_doctor_cannot_record_diagnosis(self):
        self.auth(self.lab_tech)
        res = self.client.post(
            "/api/v1/diagnoses/",
            {"patient": str(self.patient_a.id), "icd10_code": "J18.9"},
            format="json",
        )
        # Lab tech is not in allowed_roles -> permission denied (403).
        self.assertEqual(res.status_code, 403)

    def test_patient_sees_only_their_own_diagnoses(self):
        # Give each patient one diagnosis.
        Diagnosis.objects.create(
            patient=self.patient_a,
            diagnosed_by=self.doctor,
            icd10_code="E11.9",
        )
        Diagnosis.objects.create(
            patient=self.patient_b,
            diagnosed_by=self.doctor,
            icd10_code="I10",
        )

        self.auth(self.patient_user_a)
        res = self.client.get("/api/v1/diagnoses/")
        self.assertEqual(res.status_code, 200)
        codes = [d["icd10_code"] for d in res.data]
        self.assertEqual(codes, ["E11.9"])  # only patient A's own row

    def test_doctor_can_resolve_diagnosis(self):
        dx = Diagnosis.objects.create(
            patient=self.patient_a,
            diagnosed_by=self.doctor,
            icd10_code="A09",
        )
        self.auth(self.doctor)
        res = self.client.post(f"/api/v1/diagnoses/{dx.id}/resolve/")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.data["clinical_status"], DiagnosisStatus.RESOLVED)
        self.assertIsNotNone(res.data["resolved_at"])

    def test_icd10_catalog_is_available_to_authenticated_users(self):
        self.auth(self.doctor)
        res = self.client.get("/api/v1/icd10/")
        self.assertEqual(res.status_code, 200)
        self.assertGreater(res.data["count"], 0)
        self.assertIn("code", res.data["results"][0])
        self.assertIn("name", res.data["results"][0])
