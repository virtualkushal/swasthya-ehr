from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

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
]
