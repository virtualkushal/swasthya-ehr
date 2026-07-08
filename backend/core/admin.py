from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import LabObservation, LabOrder, Patient, Prescription, Staff


@admin.register(Staff)
class StaffAdmin(UserAdmin):
    list_display = ("username", "full_name", "role", "is_active", "created_at")
    list_filter = ("role", "is_active")
    search_fields = ("username", "full_name", "email")
    ordering = ("-created_at",)
    # Extend the default UserAdmin fieldsets with our custom fields.
    fieldsets = UserAdmin.fieldsets + (
        ("SwasthyaEHR", {"fields": ("full_name", "role")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("SwasthyaEHR", {"fields": ("full_name", "role")}),
    )


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = (
        "hospital_identifier",
        "first_name",
        "last_name",
        "gender",
        "registered_by",
        "created_at",
    )
    search_fields = ("hospital_identifier", "first_name", "last_name", "phone_number")
    list_filter = ("gender", "registered_by")


@admin.register(LabOrder)
class LabOrderAdmin(admin.ModelAdmin):
    list_display = ("test_name", "patient", "status", "priority", "created_at")
    list_filter = ("test_name", "status", "priority")


@admin.register(LabObservation)
class LabObservationAdmin(admin.ModelAdmin):
    list_display = ("test_name", "patient", "result_value", "result_unit", "created_at")
    list_filter = ("test_name",)


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ("medication_name", "patient", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("medication_name",)
