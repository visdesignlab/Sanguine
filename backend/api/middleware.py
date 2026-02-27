import logging

from django.conf import settings
from django.http import HttpResponse, JsonResponse
import sentry_sdk

logger = logging.getLogger(__name__)


class GenericExceptionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        logger.exception("Unhandled server exception")
        sentry_sdk.capture_exception(exception)

        if settings.DEBUG:
            return None

        if request.path.startswith("/api/"):
            return JsonResponse(
                {"detail": "An unexpected server error occurred."},
                status=500,
            )

        return HttpResponse("An unexpected server error occurred.", status=500)
