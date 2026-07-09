"""
Serializers for SwasthyaEHR.

Covers: staff management (admin), JWT login carrying the user's role, patient
registration (self + receptionist), and prescriptions (the drug-allergy safety
check lives in the view, inside an atomic transaction).
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .constants import ALLERGEN_VOCABULARY, LabTest, Role
from .models import LabObservation, LabOrder, Patient, Prescription


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


class LabOrderSerializer(serializers.ModelSerializer):
    """
    Read/create a lab order (a doctor's request for a test).

    On create only patient + test_name are accepted; loinc_code is derived by
    the model, and ordered_by is stamped from the authenticated user in the
    view. `test_name` must be one of the three supported tests.
    """

    patient_name = serializers.SerializerMethodField(read_only=True)
    ordered_by_name = serializers.CharField(
        source="ordered_by.full_name", read_only=True
    )

    class Meta:
        model = LabOrder
        fields = [
            "id",
            "patient",
            "patient_name",
            "test_name",
            "loinc_code",
            "status",
            "priority",
            "ordered_by",
            "ordered_by_name",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "loinc_code",
            "status",
            "ordered_by",
            "created_at",
        ]

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"


class LabObservationSerializer(serializers.ModelSerializer):
    """
    Read/create a lab result entered by a lab technician.

    Enforces REQ-008/009: `test_name` must be supported, and `result_value`
    must be a number inside the test's valid clinical range. loinc_code and
    result_unit are derived by the model; entered_by is stamped in the view.
    """

    patient_name = serializers.SerializerMethodField(read_only=True)
    entered_by_name = serializers.CharField(
        source="entered_by.full_name", read_only=True
    )

    class Meta:
        model = LabObservation
        fields = [
            "id",
            "patient",
            "lab_order",
            "test_name",
            "loinc_code",
            "result_value",
            "result_unit",
            "patient_name",
            "entered_by",
            "entered_by_name",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "loinc_code",
            "result_unit",
            "entered_by",
            "created_at",
        ]

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def validate_test_name(self, value):
        if value not in LabTest.REFERENCE:
            raise serializers.ValidationError(
                f"'{value}' is not a supported test. "
                f"Choose from: {', '.join(LabTest.REFERENCE)}."
            )
        return value

    def validate(self, attrs):
        """Cross-field check: result_value must sit inside the test's range."""
        test_name = attrs.get("test_name")
        result_value = attrs.get("result_value")
        ref = LabTest.REFERENCE.get(test_name)
        if ref and result_value is not None:
            value = float(result_value)
            if value < ref["min"] or value > ref["max"]:
                raise serializers.ValidationError(
                    {
                        "result_value": (
                            f"{value} is outside the valid range for "
                            f"{test_name} ({ref['min']}–{ref['max']} {ref['unit']})."
                        )
                    }
                )
        return attrs


