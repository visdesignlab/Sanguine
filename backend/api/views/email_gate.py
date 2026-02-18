import json

from django.contrib.auth.models import User
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .utils.utils import log_request


@csrf_exempt
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

    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"ok": False, "error": "Invalid email"}, status=400)

    if not institution:
        return JsonResponse({"ok": False, "error": "Institution is required"}, status=400)

    user = User.objects.filter(email=email).first()
    if user:
        user.first_name = institution
        user.save(update_fields=["first_name"])
    else:
        user = User(username=email, email=email, first_name=institution)
        user.set_unusable_password()
        user.save()

    return JsonResponse({"ok": True})
