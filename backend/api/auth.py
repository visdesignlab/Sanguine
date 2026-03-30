import logging
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import logout as django_logout
from django.http import HttpResponseRedirect


AUTH_PROVIDER_CAS = "cas"
AUTH_PROVIDER_SAML = "saml"
VALID_AUTH_PROVIDERS = {AUTH_PROVIDER_CAS, AUTH_PROVIDER_SAML}
logger = logging.getLogger(__name__)


def normalize_auth_provider(value: str | None) -> str:
    provider = (value or AUTH_PROVIDER_CAS).strip().lower()
    if provider not in VALID_AUTH_PROVIDERS:
        valid = ", ".join(sorted(VALID_AUTH_PROVIDERS))
        raise ValueError(f"DJANGO_AUTH_PROVIDER must be one of: {valid}")
    return provider


def query_redirect(path: str, query_params) -> HttpResponseRedirect:
    if query_params:
        return HttpResponseRedirect(f"{path}?{urlencode(query_params, doseq=True)}")
    return HttpResponseRedirect(path)


def auth_login(request):
    if settings.AUTH_PROVIDER == AUTH_PROVIDER_SAML:
        return query_redirect("/saml2/login/", request.GET)

    from django_cas_ng.views import LoginView

    return LoginView.as_view()(request)


def auth_logout(request):
    if settings.AUTH_PROVIDER == AUTH_PROVIDER_SAML:
        try:
            from djangosaml2.views import LogoutInitView

            return LogoutInitView.as_view()(request)
        except Exception:
            logger.exception("SAML logout initiation failed; falling back to local logout.")
            django_logout(request)
            return HttpResponseRedirect(settings.LOGOUT_REDIRECT_URL)

    from django_cas_ng.views import LogoutView

    return LogoutView.as_view()(request)
