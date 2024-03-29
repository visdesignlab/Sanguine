from django.contrib import admin
from django.urls import path
import django_cas_ng.views

from . import views

urlpatterns = [
    path("api/admin/", admin.site.urls),
    path('api/accounts/login/', django_cas_ng.views.LoginView.as_view(), name='cas_ng_login'),
    path('api/accounts/logout/', django_cas_ng.views.LogoutView.as_view(), name='cas_ng_logout'),


    path("api/", views.index, name="index"),
    path("api/whoami", views.whoami, name="whoami"),
    path("api/get_procedure_counts", views.get_procedure_counts, name="get_procedure_counts"),
    path("api/hemoglobin", views.hemoglobin, name="hemoglobin"),
    path("api/request_transfused_units", views.request_transfused_units, name="request_transfused_units"),
    path("api/fetch_surgery", views.fetch_surgery, name="fetch_surgery"),
    path("api/fetch_patient", views.fetch_patient, name="fetch_patient"),
    path("api/risk_score", views.risk_score, name="risk_score"),
    path("api/patient_outcomes", views.patient_outcomes, name="patient_outcomes"),
    path("api/state", views.state, name="state"),
    path("api/share_state", views.share_state, name="share_state"),
    path("api/state_unids", views.state_unids, name="state_unids"),
    path("api/surgeon_anest_names", views.surgeon_anest_names, name="surgeon_anest_names"),
]
