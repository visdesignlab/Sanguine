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

from . import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", views.index, name="index"),
    path("api/get_attributes", views.get_attributes, name="get_attributes"),
    path("api/hemoglobin", views.hemoglobin, name = "hemoglobin"),
    path("api/request_transfused_units",views.request_transfused_units, name="request_transfused_units"),
    path("api/fetch_surgery", views.fetch_surgery, name="fetch_surgery"),
    path("api/fetch_patient", views.fetch_patient, name="fetch_patient"),
    path("api/request_individual_specific", views.request_individual_specific, name = "request_individual_specific"),
    path("api/request_fetch_professional_set", views.fetch_professional_set, name = "request_fetch_professional_set"),
    path("api/risk_score", views.risk_score, name = "risk_score"),
    path("api/patient_outcomes", views.risk_score, name = "patient_outcomes"),
]
