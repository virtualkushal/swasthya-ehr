from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from core.views import (
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

from . import views

app_name = "core"

urlpatterns = [
    # Liveness
    path("health/", views.health, name="health"),
    # Auth
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", views.MeView.as_view(), name="me"),
    # Staff management (ADMIN only)
    path("auth/staff/", views.StaffListCreateView.as_view(), name="staff_list_create"),
    path("auth/staff/<uuid:pk>/", views.StaffDetailView.as_view(), name="staff_detail"),
    # Patient registration & directory
    path(
        "patients/register/",
        views.PatientSelfRegisterView.as_view(),
        name="patient_self_register",
    ),
    path("patients/", views.PatientListCreateView.as_view(), name="patient_list_create"),
    path(
        "patients/<uuid:pk>/",
        views.PatientDetailView.as_view(),
        name="patient_detail",
    ),
    path(
        "patients/<uuid:pk>/timeline/",
        views.PatientTimelineView.as_view(),
        name="patient_timeline",
    ),
    # Patient portal (PATIENT reads their own data only)
    path(
        "portal/me/",
        views.PatientPortalView.as_view(),
        name="patient_portal_me",
    ),

    # Prescriptions (safety interceptor + pharmacy queue)

    path(
        "prescriptions/",
        views.PrescriptionCreateView.as_view(),
        name="prescription_create",
    ),
    path(
        "prescriptions/queue/",
        views.PrescriptionQueueView.as_view(),
        name="prescription_queue",
    ),
    path(
        "prescriptions/<uuid:pk>/fulfill/",
        views.PrescriptionFulfillView.as_view(),
        name="prescription_fulfill",
    ),
    # Laboratory: orders (doctor) + results (lab tech)
    path(
        "lab-orders/",
        views.LabOrderListCreateView.as_view(),
        name="lab_order_list_create",
    ),
    path(
        "lab-observations/",
        views.LabObservationListCreateView.as_view(),
        name="lab_observation_list_create",
    ),
    # Diagnoses: the doctor's problem list (ICD-10 coded)
    path("icd10/", views.icd10_catalog, name="icd10_catalog"),
    path(
        "diagnoses/",
        views.DiagnosisListCreateView.as_view(),
        name="diagnosis_list_create",
    ),
    path(
        "diagnoses/<uuid:pk>/resolve/",
        views.DiagnosisResolveView.as_view(),
        name="diagnosis_resolve",
    ),


    path("auth/password-reset/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
]


