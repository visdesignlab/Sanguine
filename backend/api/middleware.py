import logging

from django.conf import settings
from django.http import HttpResponse, JsonResponse
import sentry_sdk

logger = logging.getLogger(__name__)


class GenericExceptionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return self._capture_handled_http_error(request, response)

    def process_exception(self, request, exception):
        logger.exception("Unhandled server exception")

        if settings.DEBUG:
            return None

        sentry_sdk.capture_exception(exception)
        request._sentry_exception_captured = True

        if request.path.startswith("/api/"):
            return JsonResponse(
                {"detail": "An unexpected server error occurred."},
                status=500,
            )

        return HttpResponse("An unexpected server error occurred.", status=500)

    def _capture_handled_http_error(self, request, response):
        status_code = getattr(response, "status_code", 200)
        if status_code < 400:
            return response

        if not getattr(settings, "SENTRY_CAPTURE_HANDLED_HTTP_ERRORS", True):
            return response

        if getattr(request, "_sentry_exception_captured", False):
            return response

        if getattr(request, "resolver_match", None) is None:
            return response

        level = "error" if status_code >= 500 else "warning"
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("handled_http_error", "true")
            scope.set_tag("http_status_code", str(status_code))
            scope.set_tag("http_method", request.method)
            scope.set_tag("path", request.path)
            sentry_sdk.capture_message(
                f"Handled HTTP {status_code}: {request.method} {request.path}",
                level=level,
            )

        logger.log(
            logging.ERROR if status_code >= 500 else logging.WARNING,
            "Handled HTTP %s response for %s %s",
            status_code,
            request.method,
            request.path,
        )
        return response
