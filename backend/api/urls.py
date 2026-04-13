from django.contrib import admin
from django.conf import settings
from django.urls import include, path

from .auth import auth_login, auth_logout
from . import views

urlpatterns = [
    path("api/admin/", admin.site.urls),
    path("api/accounts/login/", auth_login, name="auth_login"),
    path("api/accounts/logout/", auth_logout, name="auth_logout"),
    path("api/csrf/", views.get_csrf_token, name="get_csrf_token"),
    path("api/", views.index, name="index"),
    path("api/whoami", views.whoami, name="whoami"),
    path("api/get_procedure_counts", views.get_procedure_counts, name="get_procedure_counts"),
    path("api/fetch_surgery", views.fetch_surgery, name="fetch_surgery"),
    path("api/fetch_patient", views.fetch_patient, name="fetch_patient"),
    path("api/state", views.state, name="state"),
    path("api/share_state", views.share_state, name="share_state"),
    path("api/state_unids", views.state_unids, name="state_unids"),
    path("api/get_sanguine_surgery_cases", views.get_sanguine_surgery_cases, name="get_sanguine_surgery_cases"),
]

if settings.AUTH_PROVIDER == "saml":
    urlpatterns.append(path("api/saml2/", include("djangosaml2.urls")))
