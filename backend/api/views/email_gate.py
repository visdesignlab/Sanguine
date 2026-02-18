import json

from django.contrib.auth.models import User
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from .utils.utils import log_request


USERNAME_MAX_LENGTH = User._meta.get_field("username").max_length
FIRST_NAME_MAX_LENGTH = User._meta.get_field("first_name").max_length


@require_http_methods(["GET"])
@ensure_csrf_cookie
def email_gate_csrf(request):
    log_request(request)
    return JsonResponse({"ok": True})


@csrf_protect
@require_http_methods(["POST"])
def submit_email_gate(request):
    log_request(request)

    try:
        body = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"ok": False, "error": "Invalid JSON body"}, status=400)

    email = (body.get("email") or "").strip().lower()
    institution = (body.get("institution") or "").strip()

    if not email:
        return JsonResponse({"ok": False, "error": "Email is required"}, status=400)

    email = email[:USERNAME_MAX_LENGTH]

    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"ok": False, "error": "Invalid email"}, status=400)

    if not institution:
        return JsonResponse({"ok": False, "error": "Institution is required"}, status=400)

    institution = institution[:FIRST_NAME_MAX_LENGTH]

    if User.objects.filter(username=email).exists():
        return JsonResponse({"ok": True})

    try:
        user = User(username=email, email=email, first_name=institution)
        user.set_unusable_password()
        user.save()
    except IntegrityError:
        # Concurrent request may create the same username between exists() and save().
        return JsonResponse({"ok": True})

    return JsonResponse({"ok": True})
