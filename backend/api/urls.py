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
    path("api/state", views.state, name="state"),
    path("api/share_state", views.share_state, name="share_state"),
    path("api/state_unids", views.state_unids, name="state_unids"),
    path("api/email_gate/submit", views.submit_email_gate, name="submit_email_gate"),
    path("api/get_visit_attributes", views.get_visit_attributes, name="get_visit_attributes"),
    path("api/get_procedure_hierarchy", views.get_procedure_hierarchy, name="get_procedure_hierarchy"),
]
