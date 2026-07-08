"""
API views for SwasthyaEHR.

Part 3 scope:
- health check (open)
- JWT login (open)
- "who am I" (any authenticated user)
- staff management (ADMIN only) via the EnforceStrictRole permission
"""

from django.contrib.auth import get_user_model
from rest_framework import generics

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .constants import Role
from .permissions import EnforceStrictRole
from .serializers import LoginSerializer, StaffCreateSerializer, StaffSerializer

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
