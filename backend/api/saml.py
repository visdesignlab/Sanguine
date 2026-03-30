import base64
import tempfile
from typing import Any

from django.core.exceptions import ImproperlyConfigured, PermissionDenied


def _first_value(values):
    if isinstance(values, (list, tuple)):
        return values[0] if values else None
    return values


def _env_value(env, name: str, default: str = "") -> str:
    value = env(name, default=default)
    return value.strip() if isinstance(value, str) else value


def _write_temp_file(prefix: str, suffix: str, content: str | bytes) -> str:
    mode = "wb" if isinstance(content, bytes) else "w"
    with tempfile.NamedTemporaryFile(mode=mode, prefix=prefix, suffix=suffix, delete=False) as handle:
        handle.write(content)
        return handle.name


def _resolve_file_setting(
    *,
    path_value: str,
    base64_value: str,
    temp_prefix: str,
    suffix: str,
) -> str:
    if path_value:
        return path_value
    if base64_value:
        decoded = base64.b64decode(base64_value.encode("utf-8"))
        return _write_temp_file(temp_prefix, suffix, decoded)
    raise ImproperlyConfigured(
        f"Missing SAML file material for {temp_prefix}. Provide a path or base64 value."
    )


def _build_attribute_mapping(*, username_attr: str, email_attr: str, first_name_attr: str, last_name_attr: str) -> dict[str, tuple[str, ...]]:
    mapping: dict[str, list[str]] = {}
    for saml_attr, django_field in (
        (username_attr, "username"),
        (email_attr, "email"),
        (first_name_attr, "first_name"),
        (last_name_attr, "last_name"),
    ):
        if not saml_attr:
            continue
        mapping.setdefault(saml_attr, [])
        if django_field not in mapping[saml_attr]:
            mapping[saml_attr].append(django_field)
    return {key: tuple(values) for key, values in mapping.items()}


def _metadata_config(env) -> dict[str, list]:
    mode = _env_value(env, "SAML_IDP_METADATA_MODE", "remote").lower()

    if mode == "remote":
        url = _env_value(env, "SAML_IDP_METADATA_URL")
        if not url:
            raise ImproperlyConfigured("SAML_IDP_METADATA_URL is required in remote metadata mode.")
        return {"remote": [{"url": url}]}

    if mode == "file":
        path_value = _env_value(env, "SAML_IDP_METADATA_PATH")
        if not path_value:
            raise ImproperlyConfigured("SAML_IDP_METADATA_PATH is required in file metadata mode.")
        return {"local": [path_value]}

    if mode == "inline":
        metadata_xml = _env_value(env, "SAML_IDP_METADATA_XML")
        if not metadata_xml:
            raise ImproperlyConfigured("SAML_IDP_METADATA_XML is required in inline metadata mode.")
        metadata_path = _write_temp_file("saml-idp-metadata-", ".xml", metadata_xml)
        return {"local": [metadata_path]}

    raise ImproperlyConfigured("SAML_IDP_METADATA_MODE must be one of: remote, file, inline.")


def _normalize_base_url(raw_base_url: str, hostname: str) -> str:
    base_url = raw_base_url or hostname
    if not base_url:
        raise ImproperlyConfigured("SAML_SP_BASE_URL or DJANGO_HOSTNAME must be configured for SAML auth.")
    if not base_url.startswith(("http://", "https://")):
        base_url = f"https://{base_url}"
    return base_url.rstrip("/")


def build_saml_settings(*, env, hostname: str) -> dict[str, Any]:
    import saml2
    import saml2.saml

    username_attr = _env_value(env, "SAML_USERNAME_ATTRIBUTE", "email")
    email_attr = _env_value(env, "SAML_EMAIL_ATTRIBUTE", "email")
    first_name_attr = _env_value(env, "SAML_FIRST_NAME_ATTRIBUTE", "first_name")
    last_name_attr = _env_value(env, "SAML_LAST_NAME_ATTRIBUTE", "last_name")
    base_url = _normalize_base_url(_env_value(env, "SAML_SP_BASE_URL"), hostname)
    entity_id = _env_value(env, "SAML_ENTITY_ID", f"{base_url}/saml2/metadata/")
    cert_file = _resolve_file_setting(
        path_value=_env_value(env, "SAML_SP_CERT_PATH"),
        base64_value=_env_value(env, "SAML_SP_CERT_B64"),
        temp_prefix="saml-sp-cert-",
        suffix=".pem",
    )
    key_file = _resolve_file_setting(
        path_value=_env_value(env, "SAML_SP_KEY_PATH"),
        base64_value=_env_value(env, "SAML_SP_KEY_B64"),
        temp_prefix="saml-sp-key-",
        suffix=".pem",
    )

    saml_config = {
        "xmlsec_binary": "/usr/bin/xmlsec1",
        "entityid": entity_id,
        "allow_unknown_attributes": True,
        "service": {
            "sp": {
                "name": "Sanguine SAML Service Provider",
                "name_id_format": saml2.saml.NAMEID_FORMAT_TRANSIENT,
                "allow_unsolicited": False,
                "authn_requests_signed": False,
                "logout_requests_signed": False,
                "want_assertions_signed": True,
                "want_response_signed": False,
                "only_use_keys_in_metadata": True,
                "endpoints": {
                    "assertion_consumer_service": [
                        (f"{base_url}/saml2/acs/", saml2.BINDING_HTTP_POST),
                    ],
                    "single_logout_service": [
                        (f"{base_url}/saml2/ls/", saml2.BINDING_HTTP_REDIRECT),
                        (f"{base_url}/saml2/ls/post/", saml2.BINDING_HTTP_POST),
                    ],
                },
            },
        },
        "metadata": _metadata_config(env),
        "debug": 1 if env("DJANGO_DEBUG") else 0,
        "key_file": key_file,
        "cert_file": cert_file,
    }

    return {
        "SAML_ATTRIBUTE_MAPPING": _build_attribute_mapping(
            username_attr=username_attr,
            email_attr=email_attr,
            first_name_attr=first_name_attr,
            last_name_attr=last_name_attr,
        ),
        "SAML_CONFIG": saml_config,
        "SAML_CREATE_UNKNOWN_USER": True,
        "SAML_DJANGO_USER_MAIN_ATTRIBUTE": "username",
        "SAML_DEFAULT_BINDING": saml2.BINDING_HTTP_REDIRECT,
        "SAML_EMAIL_ATTRIBUTE": email_attr,
        "SAML_FIRST_NAME_ATTRIBUTE": first_name_attr,
        "SAML_IGNORE_LOGOUT_ERRORS": True,
        "SAML_LAST_NAME_ATTRIBUTE": last_name_attr,
        "SAML_SESSION_COOKIE_NAME": "saml_session",
        "SAML_SESSION_COOKIE_SAMESITE": "None",
        "SAML_USERNAME_ATTRIBUTE": username_attr,
        "ACS_DEFAULT_REDIRECT_URL": _env_value(env, "SAML_DEFAULT_REDIRECT_URL", "/api"),
    }

try:
    from djangosaml2.backends import Saml2Backend
except Exception:  # pragma: no cover - keeps local static analysis/tests importable without the package
    Saml2Backend = object


class SanguineSaml2Backend(Saml2Backend):
    def clean_attributes(self, attributes: dict, idp_entityid: str, **kwargs) -> dict:
        attributes = super().clean_attributes(attributes, idp_entityid, **kwargs)
        username_attr = getattr(self, "_configured_username_attr", None) or "email"
        main_value = _first_value(attributes.get(username_attr))
        if not main_value:
            raise PermissionDenied(
                f"Configured SAML identity attribute '{username_attr}' was not provided by the IdP."
            )
        return attributes

    @property
    def _configured_username_attr(self) -> str:
        from django.conf import settings

        return getattr(settings, "SAML_USERNAME_ATTRIBUTE", "email")

    def _update_user(self, user, attributes: dict, attribute_mapping: dict, force_save: bool = False):
        username = _first_value(attributes.get(self._configured_username_attr))
        email = _first_value(attributes.get(getattr(self, "_configured_email_attr", "email")))
        first_name = _first_value(attributes.get(getattr(self, "_configured_first_name_attr", "first_name")))
        last_name = _first_value(attributes.get(getattr(self, "_configured_last_name_attr", "last_name")))
        has_updates = force_save

        if username and user.username != username:
            user.username = username
            has_updates = True
        if email and user.email != email:
            user.email = email
            has_updates = True
        if first_name and user.first_name != first_name:
            user.first_name = first_name
            has_updates = True
        if last_name and user.last_name != last_name:
            user.last_name = last_name
            has_updates = True
        return super()._update_user(user, attributes, attribute_mapping, force_save=has_updates)

    @property
    def _configured_email_attr(self) -> str:
        from django.conf import settings

        return getattr(settings, "SAML_EMAIL_ATTRIBUTE", "email")

    @property
    def _configured_first_name_attr(self) -> str:
        from django.conf import settings

        return getattr(settings, "SAML_FIRST_NAME_ATTRIBUTE", "first_name")

    @property
    def _configured_last_name_attr(self) -> str:
        from django.conf import settings

        return getattr(settings, "SAML_LAST_NAME_ATTRIBUTE", "last_name")
