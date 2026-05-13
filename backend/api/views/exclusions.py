import json
from django.db import transaction
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.http import require_http_methods

from api.models import DataExclusion
from .decorators.conditional_login_required import conditional_login_required
from .utils.utils import log_request


@require_http_methods(["GET", "POST"])
@conditional_login_required
def exclusions(request):
    log_request(request)

    if request.method == "GET":
        visit_ids = list(
            DataExclusion.objects.filter(record_type=DataExclusion.VISIT)
            .values_list('record_id', flat=True)
        )
        surgery_case_ids = list(
            DataExclusion.objects.filter(record_type=DataExclusion.SURGERY_CASE)
            .values_list('record_id', flat=True)
        )
        return JsonResponse({
            "visits": [int(v) for v in visit_ids],
            "surgery_cases": [int(v) for v in surgery_case_ids],
        })

    # POST: apply to_add and to_remove atomically
    try:
        body = json.loads(request.body.decode())
    except (ValueError, KeyError):
        return HttpResponseBadRequest("Invalid JSON body")

    to_add = body.get("to_add", [])
    to_remove = body.get("to_remove", [])

    if not isinstance(to_add, list) or not isinstance(to_remove, list):
        return HttpResponseBadRequest("to_add and to_remove must be arrays")

    excluded_by = str(request.user)

    with transaction.atomic():
        # Remove first so re-adding with a different flag_key works cleanly
        for item in to_remove:
            record_type = item.get("record_type")
            record_id = str(item.get("record_id", ""))
            if record_type and record_id:
                DataExclusion.objects.filter(
                    record_type=record_type, record_id=record_id
                ).delete()

        for item in to_add:
            record_type = item.get("record_type")
            record_id = str(item.get("record_id", ""))
            flag_key = str(item.get("flag_key", ""))
            if record_type and record_id and flag_key:
                DataExclusion.objects.update_or_create(
                    record_type=record_type,
                    record_id=record_id,
                    defaults={"flag_key": flag_key, "excluded_by": excluded_by},
                )

    # Return updated state
    visit_ids = list(
        DataExclusion.objects.filter(record_type=DataExclusion.VISIT)
        .values_list('record_id', flat=True)
    )
    surgery_case_ids = list(
        DataExclusion.objects.filter(record_type=DataExclusion.SURGERY_CASE)
        .values_list('record_id', flat=True)
    )
    return JsonResponse({
        "visits": [int(v) for v in visit_ids],
        "surgery_cases": [int(v) for v in surgery_case_ids],
    })
