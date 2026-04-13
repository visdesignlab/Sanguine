import sys
from types import ModuleType
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.sessions.middleware import SessionMiddleware
from django.http import HttpResponse
from django.test import Client, RequestFactory, TestCase, override_settings

from api.auth import auth_login, auth_logout


def add_session(request):
    middleware = SessionMiddleware(lambda req: None)
    middleware.process_request(request)
    request.session.save()
    return request


class AuthDispatchTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @override_settings(AUTH_PROVIDER="cas")
    def test_login_dispatches_to_cas_view(self):
        request = self.factory.get("/api/accounts/login/")
        expected = HttpResponse("cas login")

        with patch("django_cas_ng.views.LoginView.as_view", return_value=lambda request: expected):
            response = auth_login(request)

        self.assertIs(response, expected)

    @override_settings(AUTH_PROVIDER="saml")
    def test_login_redirects_to_saml_endpoint(self):
        client = Client()
        response = client.get("/api/accounts/login/", {"next": "/api/state"})

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "/api/saml2/login/?next=%2Fapi%2Fstate")

    @override_settings(AUTH_PROVIDER="saml", LOGOUT_REDIRECT_URL="/api/")
    def test_logout_falls_back_to_local_logout_when_saml_errors(self):
        user = get_user_model()(username="tester")
        request = add_session(self.factory.get("/api/accounts/logout/"))
        request.user = user

        fake_views = ModuleType("djangosaml2.views")

        class FakeLogoutInitView:
            @staticmethod
            def as_view():
                def failing_view(_request):
                    raise RuntimeError("boom")

                return failing_view

        fake_views.LogoutInitView = FakeLogoutInitView

        with patch.dict(
            sys.modules,
            {
                "djangosaml2": ModuleType("djangosaml2"),
                "djangosaml2.views": fake_views,
            },
        ):
            response = auth_logout(request)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "/api/")


class ProtectedEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = get_user_model().objects.create_user(username="alice", password="secret")

    def test_protected_endpoint_redirects_when_not_authenticated(self):
        response = self.client.get("/api/state")

        self.assertEqual(response.status_code, 302)
        self.assertIn("/api/accounts/login/", response["Location"])

    def test_whoami_returns_username_for_authenticated_user(self):
        self.client.force_login(self.user)

        response = self.client.get("/api/whoami")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"alice")

    def test_state_lists_accessible_states_for_authenticated_user(self):
        self.client.force_login(self.user)

        response = self.client.get("/api/state")

        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, [])
