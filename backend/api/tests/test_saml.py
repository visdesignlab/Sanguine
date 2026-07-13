import base64
import importlib.util
import os
import unittest
from tempfile import NamedTemporaryFile
from unittest.mock import patch

import environ
from django.test import SimpleTestCase

from api.saml import build_saml_settings


HAS_PYSAML2 = importlib.util.find_spec("saml2") is not None


def saml_env():
    return environ.Env(
        DJANGO_DEBUG=(bool, False),
        SAML_ENTITY_ID=(str, ""),
        SAML_SP_BASE_URL=(str, ""),
        SAML_IDP_METADATA_MODE=(str, "file"),
        SAML_IDP_METADATA_URL=(str, ""),
        SAML_IDP_METADATA_PATH=(str, ""),
        SAML_IDP_METADATA_CERT_PATH=(str, ""),
        SAML_IDP_METADATA_XML=(str, ""),
        SAML_SP_CERT_PATH=(str, ""),
        SAML_SP_KEY_PATH=(str, ""),
        SAML_SP_CERT_B64=(str, ""),
        SAML_SP_KEY_B64=(str, ""),
        SAML_VERIFY_SSL_CERT=(bool, True),
        SAML_CA_CERTS_PATH=(str, ""),
        SAML_AUTHN_REQUESTS_SIGNED=(bool, True),
        SAML_LOGOUT_REQUESTS_SIGNED=(bool, True),
        SAML_WANT_ASSERTIONS_SIGNED=(bool, True),
        SAML_WANT_RESPONSE_SIGNED=(bool, True),
        SAML_ACCEPTED_TIME_DIFF=(int, 60),
        SAML_USERNAME_ATTRIBUTE=(str, "email"),
        SAML_EMAIL_ATTRIBUTE=(str, "email"),
        SAML_FIRST_NAME_ATTRIBUTE=(str, "first_name"),
        SAML_LAST_NAME_ATTRIBUTE=(str, "last_name"),
        SAML_DEFAULT_REDIRECT_URL=(str, "/api"),
    )


class SAMLConfigTests(SimpleTestCase):
    @unittest.skipUnless(HAS_PYSAML2, "pysaml2 is not installed")
    def test_remote_metadata_mode_uses_remote_url(self):
        with NamedTemporaryFile(mode="w", suffix=".pem") as cert_file:
            cert_file.write("cert")
            cert_file.flush()
            with patch.dict(
                os.environ,
                {
                    "DJANGO_DEBUG": "False",
                    "SAML_IDP_METADATA_MODE": "remote",
                    "SAML_IDP_METADATA_URL": "https://idp.example.edu/metadata",
                    "SAML_IDP_METADATA_CERT_PATH": cert_file.name,
                    "SAML_SP_CERT_B64": base64.b64encode(b"cert").decode("utf-8"),
                    "SAML_SP_KEY_B64": base64.b64encode(b"key").decode("utf-8"),
                },
                clear=False,
            ):
                settings_dict = build_saml_settings(env=saml_env(), hostname="partner.example.edu")

        self.assertEqual(
            settings_dict["SAML_CONFIG"]["metadata"],
            {"remote": [{"url": "https://idp.example.edu/metadata", "cert": cert_file.name}]},
        )
        self.assertEqual(
            settings_dict["SAML_CONFIG"]["entityid"],
            "https://partner.example.edu/api/saml2/metadata/",
        )
        self.assertTrue(settings_dict["SAML_CONFIG"]["verify_ssl_cert"])
        self.assertTrue(settings_dict["SAML_CONFIG"]["service"]["sp"]["authn_requests_signed"])
        self.assertTrue(settings_dict["SAML_CONFIG"]["service"]["sp"]["logout_requests_signed"])
        self.assertTrue(settings_dict["SAML_CONFIG"]["service"]["sp"]["want_response_signed"])
        self.assertEqual(settings_dict["ACS_DEFAULT_REDIRECT_URL"], "/api")

    @unittest.skipUnless(HAS_PYSAML2, "pysaml2 is not installed")
    def test_file_metadata_mode_uses_local_file(self):
        with NamedTemporaryFile(mode="w", suffix=".xml") as metadata_file:
            metadata_file.write("<xml />")
            metadata_file.flush()
            with patch.dict(
                os.environ,
                {
                    "DJANGO_DEBUG": "False",
                    "SAML_IDP_METADATA_MODE": "file",
                    "SAML_IDP_METADATA_PATH": metadata_file.name,
                    "SAML_SP_CERT_B64": base64.b64encode(b"cert").decode("utf-8"),
                    "SAML_SP_KEY_B64": base64.b64encode(b"key").decode("utf-8"),
                },
                clear=False,
            ):
                settings_dict = build_saml_settings(env=saml_env(), hostname="partner.example.edu")

        self.assertEqual(settings_dict["SAML_CONFIG"]["metadata"], {"local": [metadata_file.name]})

    @unittest.skipUnless(HAS_PYSAML2, "pysaml2 is not installed")
    def test_blank_entity_id_falls_back_to_metadata_url(self):
        with NamedTemporaryFile(mode="w", suffix=".xml") as metadata_file:
            metadata_file.write("<xml />")
            metadata_file.flush()
            with patch.dict(
                os.environ,
                {
                    "DJANGO_DEBUG": "False",
                    "SAML_ENTITY_ID": "",
                    "SAML_SP_BASE_URL": "https://sanguine.shands.ufl.edu",
                    "SAML_IDP_METADATA_MODE": "file",
                    "SAML_IDP_METADATA_PATH": metadata_file.name,
                    "SAML_SP_CERT_B64": base64.b64encode(b"cert").decode("utf-8"),
                    "SAML_SP_KEY_B64": base64.b64encode(b"key").decode("utf-8"),
                },
                clear=False,
            ):
                settings_dict = build_saml_settings(env=saml_env(), hostname="partner.example.edu")

        self.assertEqual(
            settings_dict["SAML_CONFIG"]["entityid"],
            "https://sanguine.shands.ufl.edu/api/saml2/metadata/",
        )

    @unittest.skipUnless(HAS_PYSAML2, "pysaml2 is not installed")
    def test_mdq_metadata_mode_requires_signed_metadata_cert(self):
        with NamedTemporaryFile(mode="w", suffix=".pem") as cert_file:
            cert_file.write("cert")
            cert_file.flush()
            with patch.dict(
                os.environ,
                {
                    "DJANGO_DEBUG": "False",
                    "SAML_IDP_METADATA_MODE": "mdq",
                    "SAML_IDP_METADATA_URL": "https://idp.example.edu/entities",
                    "SAML_IDP_METADATA_CERT_PATH": cert_file.name,
                    "SAML_SP_CERT_B64": base64.b64encode(b"cert").decode("utf-8"),
                    "SAML_SP_KEY_B64": base64.b64encode(b"key").decode("utf-8"),
                },
                clear=False,
            ):
                settings_dict = build_saml_settings(env=saml_env(), hostname="partner.example.edu")

        self.assertEqual(
            settings_dict["SAML_CONFIG"]["metadata"],
            {"mdq": [{"url": "https://idp.example.edu/entities", "cert": cert_file.name}]},
        )

    @unittest.skipUnless(HAS_PYSAML2, "pysaml2 is not installed")
    def test_inline_metadata_mode_materializes_local_file(self):
        with patch.dict(
            os.environ,
            {
                "DJANGO_DEBUG": "False",
                "SAML_IDP_METADATA_MODE": "inline",
                "SAML_IDP_METADATA_XML": "<xml />",
                "SAML_USERNAME_ATTRIBUTE": "mail",
                "SAML_EMAIL_ATTRIBUTE": "mail",
                "SAML_SP_CERT_B64": base64.b64encode(b"cert").decode("utf-8"),
                "SAML_SP_KEY_B64": base64.b64encode(b"key").decode("utf-8"),
            },
            clear=False,
        ):
            settings_dict = build_saml_settings(env=saml_env(), hostname="partner.example.edu")

        metadata_path = settings_dict["SAML_CONFIG"]["metadata"]["local"][0]
        with open(metadata_path, "r", encoding="utf-8") as handle:
            self.assertEqual(handle.read(), "<xml />")
        self.assertEqual(settings_dict["SAML_ATTRIBUTE_MAPPING"]["mail"], ("username", "email"))
