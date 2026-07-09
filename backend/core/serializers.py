"""
Serializers for SwasthyaEHR.

Covers: staff management (admin), JWT login carrying the user's role, patient
registration (self + receptionist), and prescriptions (the drug-allergy safety
check lives in the view, inside an atomic transaction).
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .constants import ALLERGEN_VOCABULARY, Role
from .models import Patient, Prescription

Staff = get_user_model()


class StaffSerializer(serializers.ModelSerializer):
    """Read/list representation of a staff account (no password exposed)."""

    class Meta:
        model = Staff
        fields = [
            "id",
            "username",
            "full_name",
            "email",
            "role",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class StaffCreateSerializer(serializers.ModelSerializer):
    """Create a staff account. Password is write-only and properly hashed."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Staff
        fields = ["id", "username", "full_name", "email", "role", "password", "is_active"]
        read_only_fields = ["id"]

    def validate_role(self, value):
        valid = {choice[0] for choice in Role.CHOICES}
        if value not in valid:
            raise serializers.ValidationError(f"'{value}' is not a valid role.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        staff = Staff(**validated_data)
        staff.set_password(password)
        staff.save()
        return staff


class LoginSerializer(TokenObtainPairSerializer):
    """
    JWT login. Embeds role + identity into the token and also returns a `user`
    object in the response body so the SPA can set up its session immediately.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["full_name"] = user.full_name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = {
            "id": str(self.user.id),
            "username": self.user.username,
            "full_name": self.user.full_name,
            "role": self.user.role,
        }
        return data


class PatientSerializer(serializers.ModelSerializer):
    """
    Create/read a patient profile.

    `allergies` is validated against the fixed vocabulary so the safety engine's
    substring match stays reliable (REQ-004/005). `registered_by` and
    `hospital_identifier` are set by the server, never trusted from the client.
    """

    class Meta:
        model = Patient
        fields = [
            "id",
            "hospital_identifier",
            "first_name",
            "last_name",
            "phone_number",
            "date_of_birth",
            "gender",
            "allergies",
            "registered_by",
            "created_at",
        ]
        read_only_fields = ["id", "hospital_identifier", "registered_by", "created_at"]

    def validate_allergies(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Allergies must be a list.")
        allowed = set(ALLERGEN_VOCABULARY)
        for item in value:
            if item not in allowed:
                raise serializers.ValidationError(
                    f"'{item}' is not an allowed allergen. "
                    f"Choose from: {', '.join(ALLERGEN_VOCABULARY)}."
                )
        # "None" means no allergies; store it as an empty list for clean matching.
        if value == ["None"]:
            return []
        # If "None" is combined with real allergens, drop the "None" token.
        return [item for item in value if item != "None"]


class PrescriptionSerializer(serializers.ModelSerializer):
    """
    Read/create a prescription. On create, only patient + medication + dosage
    are accepted from the client; prescriber, status and safety are handled by
    the view. Includes a couple of read-only convenience fields for the UI.
    """

    patient_name = serializers.SerializerMethodField(read_only=True)
    prescribed_by_name = serializers.CharField(
        source="prescribed_by.full_name", read_only=True
    )

    class Meta:
        model = Prescription
        fields = [
            "id",
            "patient",
            "patient_name",
            "medication_name",
            "dosage_instruction",
            "status",
            "prescribed_by",
            "prescribed_by_name",
            "fulfilled_by",
            "fulfilled_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "prescribed_by",
            "fulfilled_by",
            "fulfilled_at",
            "created_at",
        ]

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"
