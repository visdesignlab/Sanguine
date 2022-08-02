"""api URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
import django_cas_ng.views

from . import views
from . import auth_utils

urlpatterns = [
    path("api/admin/", admin.site.urls),
    path('api/accounts/login/', django_cas_ng.views.LoginView.as_view(), name='cas_ng_login'),
    path('api/accounts/logout/', django_cas_ng.views.LogoutView.as_view(), name='cas_ng_logout'),
    path("api/whoami", auth_utils.whoami, name="whoami"),

    path("api/", views.index, name="index"),
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
