import json
from urllib.parse import urlparse

from django.contrib.auth.models import User
from django.conf import settings
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .utils.utils import log_request


USERNAME_MAX_LENGTH = User._meta.get_field("username").max_length
FIRST_NAME_MAX_LENGTH = User._meta.get_field("first_name").max_length


def _is_allowed_gate_origin(request) -> bool:
    configured_hostname = (getattr(settings, "DJANGO_HOSTNAME", "") or "").lower()
    request_hostname = request.get_host().split(":", 1)[0].lower()

    def is_allowed_host(hostname: str) -> bool:
        if not hostname:
            return False
        if hostname == "localhost":
            return bool(getattr(settings, "DEBUG", False))
        if hostname in ("127.0.0.1", "::1"):
            return bool(getattr(settings, "DEBUG", False))
        if hostname.endswith(".localhost"):
            return bool(getattr(settings, "DEBUG", False))
        if hostname == "intelvia.app" or hostname.endswith(".intelvia.app"):
            return True
        if configured_hostname and (hostname == configured_hostname or hostname.endswith(f".{configured_hostname}")):
            return True
        return hostname == request_hostname

    for header_name in ("Origin", "Referer"):
        header_value = request.headers.get(header_name)
        if not header_value:
            continue
        parsed = urlparse(header_value)
        if is_allowed_host((parsed.hostname or "").lower()):
            return True

    return False


@csrf_exempt
@require_http_methods(["POST"])
def submit_email_gate(request):
    log_request(request)

    if not _is_allowed_gate_origin(request):
        return JsonResponse({"ok": False, "error": "Invalid request origin"}, status=403)

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

    user = User.objects.filter(username=email).first()
    if user:
        update_fields = []
        if user.first_name != institution:
            user.first_name = institution
            update_fields.append("first_name")
        if user.email != email:
            user.email = email
            update_fields.append("email")
        if update_fields:
            user.save(update_fields=update_fields)
    else:
        try:
            user = User(username=email, email=email, first_name=institution)
            user.set_unusable_password()
            user.save()
        except IntegrityError:
            return JsonResponse(
                {
                    "ok": False,
                    "error": "A user with this username already exists",
                },
                status=409,
            )

    return JsonResponse({"ok": True})
