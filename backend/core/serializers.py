"""
Serializers for SwasthyaEHR.

Part 3 scope: staff management (admin) and JWT login that carries the user's
role so the frontend can route by role without an extra request.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .constants import Role

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
