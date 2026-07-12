"""
API views for SwasthyaEHR.

Covers:
- health check (open)
- JWT login (open) + "who am I"
- staff management (ADMIN only)
- patient registration: self (public) + receptionist (internal)
- patient directory (DOCTOR / PHARMACIST / RECEPTIONIST)
- prescriptions: doctor creates (with the atomic drug-allergy safety check),
  pharmacist views the queue and fulfills.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import PasswordResetRequestSerializer, PasswordResetConfirmSerializer

from .constants import LabOrderStatus, PrescriptionStatus, RegisteredBy, Role
from .fhir_serializers import (
    build_everything_bundle,
    observation_to_fhir,
    patient_to_fhir,
)
from .models import LabObservation, LabOrder, Patient, Prescription
from .permissions import EnforceStrictRole
from .serializers import (
    LabObservationSerializer,
    LabOrderSerializer,
    LoginSerializer,
    PatientSerializer,
    PrescriptionSerializer,
    StaffCreateSerializer,
    StaffSerializer,
)

FHIR_CONTENT_TYPE = "application/fhir+json"
# Roles allowed to read the interoperable FHIR API (PATIENT excluded).
FHIR_READ_ROLES = [Role.ADMIN, Role.DOCTOR, Role.PHARMACIST, Role.LAB_TECH]


Staff = get_user_model()


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Simple liveness check used to confirm the API is reachable."""
    return Response({"status": "ok", "service": "swasthya-ehr-api"})


class LoginView(TokenObtainPairView):
    """POST username + password -> access/refresh tokens + user object."""

    permission_classes = [AllowAny]
    serializer_class = LoginSerializer


class MeView(APIView):
    """Return the currently authenticated user's identity."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "id": str(user.id),
                "username": user.username,
                "full_name": user.full_name,
                "role": user.role,
                "is_active": user.is_active,
            }
        )


class StaffListCreateView(generics.ListCreateAPIView):
    """ADMIN-only: list all staff, or create a new staff account."""

    permission_classes = [EnforceStrictRole]
    allowed_roles = [Role.ADMIN]
    queryset = Staff.objects.all().order_by("-created_at")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return StaffCreateSerializer
        return StaffSerializer


class StaffDetailView(generics.RetrieveUpdateAPIView):
    """
    ADMIN-only: view or update a staff account. The main practical use is
    deactivating an account (soft delete) by PATCHing is_active=false.
    """

    permission_classes = [EnforceStrictRole]
    allowed_roles = [Role.ADMIN]
    queryset = Staff.objects.all()
    serializer_class = StaffSerializer

    def perform_update(self, serializer):
        # Prevent an admin from deactivating their own account by accident.
        target = self.get_object()
        if (
            target.id == self.request.user.id
            and self.request.data.get("is_active") is False
        ):
            from rest_framework.exceptions import ValidationError

            raise ValidationError("You cannot deactivate your own account.")
        serializer.save()


# --------------------------------------------------------------------------- #
# Patient registration & directory
# --------------------------------------------------------------------------- #


class PatientSelfRegisterView(generics.CreateAPIView):
    """
    Public self-registration (REQ-001). No auth required: a patient fills the
    web form from home before their appointment. `registered_by` is stamped
    SELF by the server.

    If the form includes a username + password, we also create a linked login
    account (role PATIENT) so the patient can sign in to the read-only portal.
    The whole thing runs in one atomic transaction so we never end up with a
    half-created account.
    """

    permission_classes = [AllowAny]
    serializer_class = PatientSerializer

    def perform_create(self, serializer):

        username = (serializer.validated_data.pop("username", "") or "").strip()
        password = serializer.validated_data.pop("password", "") or ""

        with transaction.atomic():
            user = None
            if username and password:
                user = Staff(
                    username=username,
                    full_name=(
                        f"{serializer.validated_data.get('first_name', '')} "
                        f"{serializer.validated_data.get('last_name', '')}"
                    ).strip(),
                    role=Role.PATIENT,
                )
                user.set_password(password)
                user.save()

            serializer.save(registered_by=RegisteredBy.SELF, user=user)



class PatientListCreateView(generics.ListCreateAPIView):
    """
    Internal patient directory.

    - GET (list/search): DOCTOR, PHARMACIST, RECEPTIONIST. Supports ?search= to
      match name or hospital identifier.
    - POST (receptionist intake): RECEPTIONIST only; stamps registered_by
      RECEPTIONIST.
    """

    serializer_class = PatientSerializer
    permission_classes = [EnforceStrictRole]

    # Read is open to the clinical roles; write is restricted further below.
    allowed_roles = [Role.DOCTOR, Role.PHARMACIST, Role.RECEPTIONIST]

    def get_queryset(self):
        qs = Patient.objects.all().order_by("-created_at")
        search = self.request.query_params.get("search")
        if search:
            from django.db.models import Q

            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(hospital_identifier__icontains=search)
            )
        return qs

    def create(self, request, *args, **kwargs):
        # Only receptionists may key in a patient here.
        if request.user.role != Role.RECEPTIONIST:
            return Response(
                {"detail": "Only a receptionist can register patients here."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(registered_by=RegisteredBy.RECEPTIONIST)


class PatientDetailView(generics.RetrieveAPIView):
    """View a single patient profile (DOCTOR / PHARMACIST / RECEPTIONIST)."""

    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [EnforceStrictRole]
    allowed_roles = [Role.DOCTOR, Role.PHARMACIST, Role.RECEPTIONIST]


class PatientTimelineView(APIView):
    """
    DOCTOR-only clinical cockpit data for one patient: the profile, the full
    prescription history, all lab results, and a per-test series prepared for
    plotting lab trends over time.
    """

    permission_classes = [EnforceStrictRole]
    allowed_roles = [Role.DOCTOR]

    def get(self, request, pk):
        try:
            patient = Patient.objects.get(pk=pk)
        except Patient.DoesNotExist:
            return Response(
                {"detail": "Patient not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        observations = LabObservation.objects.filter(patient=patient).order_by(
            "created_at"
        )
        prescriptions = Prescription.objects.filter(patient=patient).order_by(
            "-created_at"
        )

        # Group observations by test into time-ordered series for the charts.
        trends = {}
        for obs in observations:
            trends.setdefault(
                obs.test_name,
                {"test_name": obs.test_name, "unit": obs.result_unit, "points": []},
            )
            trends[obs.test_name]["unit"] = obs.result_unit
            trends[obs.test_name]["points"].append(
                {
                    "date": obs.created_at.isoformat(),
                    "value": float(obs.result_value),
                }
            )

        return Response(
            {
                "patient": PatientSerializer(patient).data,
                "prescriptions": PrescriptionSerializer(prescriptions, many=True).data,
                "observations": LabObservationSerializer(
                    observations, many=True
                ).data,
                "trends": list(trends.values()),
            }
        )



class PatientPortalView(APIView):
    """
    PATIENT-only read-only portal (REQ personas 2.1/2.5).

    Returns the signed-in patient's OWN profile, finalized lab observations, and
    active/past medications. Scoping is by the linked user account, so a patient
    can never see anyone else's rows even by guessing an id.
    """

    permission_classes = [EnforceStrictRole]
    allowed_roles = [Role.PATIENT]

    def get(self, request):
        patient = Patient.objects.filter(user=request.user).first()
        if patient is None:
            return Response(
                {"detail": "No patient profile is linked to this account."},
                status=status.HTTP_404_NOT_FOUND,
            )

        observations = LabObservation.objects.filter(patient=patient).order_by(
            "created_at"
        )
        prescriptions = Prescription.objects.filter(patient=patient).order_by(
            "-created_at"
        )

        # Per-test time-ordered series so the portal can chart trends too.
        trends = {}
        for obs in observations:
            trends.setdefault(
                obs.test_name,
                {"test_name": obs.test_name, "unit": obs.result_unit, "points": []},
            )
            trends[obs.test_name]["unit"] = obs.result_unit
            trends[obs.test_name]["points"].append(
                {
                    "date": obs.created_at.isoformat(),
                    "value": float(obs.result_value),
                }
            )

        return Response(
            {
                "patient": PatientSerializer(patient).data,
                "observations": LabObservationSerializer(
                    observations, many=True
                ).data,
                "prescriptions": PrescriptionSerializer(prescriptions, many=True).data,
                "trends": list(trends.values()),
            }
        )


# --------------------------------------------------------------------------- #
# Prescriptions: the Clinical Safety Interceptor
# --------------------------------------------------------------------------- #



class PrescriptionCreateView(generics.CreateAPIView):
    """
    DOCTOR-only. Creates a prescription ONLY if the medication does not match any
    of the patient's documented allergies.

    The whole thing runs inside a single atomic transaction (REQ-006/007): if a
    match is found we never commit the row and return a 400 with the safety
    payload the frontend renders as a red alert.
    """

    permission_classes = [EnforceStrictRole]
    allowed_roles = [Role.DOCTOR]
    serializer_class = PrescriptionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient = serializer.validated_data["patient"]
        medication = serializer.validated_data["medication_name"]

        with transaction.atomic():
            matched = self._find_allergy_match(medication, patient.allergies)
            if matched:
                # Abort: nothing is written because we raise before .save().
                return Response(
                    {
                        "security_alert": True,
                        "violation_type": "DRUG_ALLERGY_MATCH",
                        "matched_allergen_token": matched,
                        "message": (
                            "CRITICAL ALERT: Transaction Aborted. This medication "
                            "matches a documented allergy entry on this patient "
                            "profile!"
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer.save(
                prescribed_by=request.user,
                status=PrescriptionStatus.ACTIVE,
            )

        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    @staticmethod
    def _find_allergy_match(medication_name, allergies):
        """
        Case-insensitive substring cross-match. Returns the matched allergen
        token, or None. E.g. medication "Penicillin G" matches allergen
        "Penicillin".
        """
        med = (medication_name or "").lower()
        for allergen in allergies or []:
            token = str(allergen).lower().strip()
            if token and token in med:
                return allergen
        return None


class PrescriptionQueueView(generics.ListAPIView):
    """
    PHARMACIST-only: the dispensing queue = all ACTIVE prescriptions, newest
    first, grouped in the UI by patient.
    """

    permission_classes = [EnforceStrictRole]
    allowed_roles = [Role.PHARMACIST]
    serializer_class = PrescriptionSerializer

    def get_queryset(self):
        return (
            Prescription.objects.filter(status=PrescriptionStatus.ACTIVE)
            .select_related("patient", "prescribed_by")
            .order_by("-created_at")
        )


class PrescriptionFulfillView(APIView):
    """PHARMACIST-only: mark an active prescription as dispensed/completed."""

    permission_classes = [EnforceStrictRole]
    allowed_roles = [Role.PHARMACIST]

    def post(self, request, pk):
        try:
            prescription = Prescription.objects.get(pk=pk)
        except Prescription.DoesNotExist:
            return Response(
                {"detail": "Prescription not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if prescription.status == PrescriptionStatus.COMPLETED:
            return Response(
                {"detail": "This prescription was already fulfilled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        prescription.status = PrescriptionStatus.COMPLETED
        prescription.fulfilled_by = request.user
        prescription.fulfilled_at = timezone.now()
        prescription.save()

        return Response(PrescriptionSerializer(prescription).data)


# --------------------------------------------------------------------------- #
# Laboratory: orders (doctor) + results (lab tech)
# --------------------------------------------------------------------------- #


class LabOrderListCreateView(generics.ListCreateAPIView):
    """
    - POST: a DOCTOR requests a test for a patient.
    - GET: the lab queue. LAB_TECH sees pending orders; DOCTOR sees the orders
      they made. Supports ?status=PENDING|COMPLETED.
    """

    serializer_class = LabOrderSerializer
    permission_classes = [EnforceStrictRole]
    allowed_roles = [Role.DOCTOR, Role.LAB_TECH]

    def get_queryset(self):
        qs = LabOrder.objects.select_related("patient", "ordered_by").order_by(
            "-created_at"
        )
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        # A lab tech's queue defaults to still-pending work.
        elif self.request.user.role == Role.LAB_TECH:
            qs = qs.filter(status=LabOrderStatus.PENDING)
        return qs

    def create(self, request, *args, **kwargs):
        if request.user.role != Role.DOCTOR:
            return Response(
                {"detail": "Only a doctor can order a lab test."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(ordered_by=self.request.user)


class LabObservationListCreateView(generics.ListCreateAPIView):
    """
    - POST: a LAB_TECH enters a result (range-validated in the serializer). If it
      is linked to an order, that order is flipped to COMPLETED.
    - GET: results. LAB_TECH + DOCTOR may read; filter by ?patient=<uuid>.
    """

    serializer_class = LabObservationSerializer
    permission_classes = [EnforceStrictRole]
    allowed_roles = [Role.DOCTOR, Role.LAB_TECH]

    def get_queryset(self):
        qs = LabObservation.objects.select_related(
            "patient", "entered_by"
        ).order_by("-created_at")
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        return qs

    def create(self, request, *args, **kwargs):
        if request.user.role != Role.LAB_TECH:
            return Response(
                {"detail": "Only a lab technician can submit results."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        with transaction.atomic():
            observation = serializer.save(entered_by=self.request.user)
            # Close the linked order, if any.
            if observation.lab_order_id:
                order = observation.lab_order
                order.status = LabOrderStatus.COMPLETED
                order.save(update_fields=["status", "updated_at"])


# --------------------------------------------------------------------------- #
# FHIR R4 interoperability layer (read-only)
# --------------------------------------------------------------------------- #


class FHIRPatientView(APIView):
    """GET a single patient as a FHIR R4 `Patient` resource."""

    permission_classes = [EnforceStrictRole]
    allowed_roles = FHIR_READ_ROLES

    def get(self, request, pk):
        try:
            patient = Patient.objects.get(pk=pk)
        except Patient.DoesNotExist:
            return Response(
                {"resourceType": "OperationOutcome", "issue": [{"severity": "error", "code": "not-found"}]},
                status=status.HTTP_404_NOT_FOUND,
                content_type=FHIR_CONTENT_TYPE,
            )
        return Response(
            patient_to_fhir(patient), content_type=FHIR_CONTENT_TYPE
        )


class FHIRObservationView(APIView):
    """GET a single lab result as a FHIR R4 `Observation` resource."""

    permission_classes = [EnforceStrictRole]
    allowed_roles = FHIR_READ_ROLES

    def get(self, request, pk):
        try:
            observation = LabObservation.objects.get(pk=pk)
        except LabObservation.DoesNotExist:
            return Response(
                {"resourceType": "OperationOutcome", "issue": [{"severity": "error", "code": "not-found"}]},
                status=status.HTTP_404_NOT_FOUND,
                content_type=FHIR_CONTENT_TYPE,
            )
        return Response(
            observation_to_fhir(observation), content_type=FHIR_CONTENT_TYPE
        )


class FHIRPatientEverythingView(APIView):
    """
    GET a FHIR `Bundle` (searchset) with the patient plus all of their
    observations — the FHIR `$everything` operation.
    """

    permission_classes = [EnforceStrictRole]
    allowed_roles = FHIR_READ_ROLES

    def get(self, request, pk):
        try:
            patient = Patient.objects.get(pk=pk)
        except Patient.DoesNotExist:
            return Response(
                {"resourceType": "OperationOutcome", "issue": [{"severity": "error", "code": "not-found"}]},
                status=status.HTTP_404_NOT_FOUND,
                content_type=FHIR_CONTENT_TYPE,
            )
        observations = LabObservation.objects.filter(patient=patient).order_by(
            "created_at"
        )
        bundle = build_everything_bundle(
            patient, observations, base_url=request.build_absolute_uri("/")
        )
        return Response(bundle, content_type=FHIR_CONTENT_TYPE)

# ================================================================
# PASSWORD RESET VIEWS (appended at the bottom)
# ================================================================
class PasswordResetRequestView(APIView):
    """Step 1: User submits email → sends reset link."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        user = Staff.objects.filter(email=email, is_active=True).first()

        if user:
            # Generate token and uid
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))

            # Build the reset link (points to your frontend)
            frontend_url = "http://localhost:3000"
            reset_link = f"{frontend_url}/reset-password/{uid}/{token}/"

            # Send email (prints to console in development)
            send_mail(
                subject="Reset Your SwasthyaEHR Password",
                message=f"Click the link below to reset your password:\n\n{reset_link}",
                from_email="noreply@swasthya.org.np",
                recipient_list=[email],
                fail_silently=False,
            )

        # Always return a success message (don't reveal if email exists)
        return Response(
            {"detail": "If an account exists with this email, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """Step 2: User submits new password with uid + token."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        new_password = serializer.validated_data["new_password"]

        user.set_password(new_password)
        user.save()

        return Response(
            {"detail": "Password has been reset successfully."},
            status=status.HTTP_200_OK,
        )