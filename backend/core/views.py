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
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .constants import PrescriptionStatus, RegisteredBy, Role
from .models import Patient, Prescription
from .permissions import EnforceStrictRole
from .serializers import (
    LoginSerializer,
    PatientSerializer,
    PrescriptionSerializer,
    StaffCreateSerializer,
    StaffSerializer,
)

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
    """

    permission_classes = [AllowAny]
    serializer_class = PatientSerializer

    def perform_create(self, serializer):
        serializer.save(registered_by=RegisteredBy.SELF)


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
