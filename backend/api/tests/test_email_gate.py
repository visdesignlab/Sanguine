import json

from django.conf import settings
from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.urls import reverse


class SubmitEmailGateTests(TestCase):
    def setUp(self):
        self.csrf_client = Client(enforce_csrf_checks=True)
        self.default_origin = settings.CSRF_TRUSTED_ORIGINS[0]

    def post_email_gate(self, payload, **extra):
        csrf_response = self.csrf_client.get(
            reverse("email_gate_csrf"),
            HTTP_ORIGIN=self.default_origin,
            secure=True,
        )
        self.assertEqual(csrf_response.status_code, 200)
        csrf_cookie = self.csrf_client.cookies.get("csrftoken")
        self.assertIsNotNone(csrf_cookie)
        csrf_token = csrf_cookie.value

        return self.csrf_client.post(
            reverse("submit_email_gate"),
            data=json.dumps(payload),
            content_type="application/json",
            HTTP_ORIGIN=self.default_origin,
            HTTP_X_CSRFTOKEN=csrf_token,
            secure=True,
            **extra,
        )

    def test_creates_user_on_first_submission(self):
        response = self.post_email_gate(
            {
                "email": "Test@Example.com",
                "institution": "University Hospital",
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})

        user = User.objects.get(email="test@example.com")
        self.assertEqual(user.username, "test@example.com")
        self.assertEqual(user.first_name, "University Hospital")
        self.assertFalse(user.has_usable_password())

    def test_does_not_update_institution_for_existing_email(self):
        existing = User.objects.create(
            username="existing@example.com",
            email="existing@example.com",
            first_name="Old Institution",
        )
        existing.set_unusable_password()
        existing.save()

        response = self.post_email_gate(
            {
                "email": "existing@example.com",
                "institution": "New Institution",
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})

        existing.refresh_from_db()
        self.assertEqual(existing.first_name, "Old Institution")

    def test_does_not_update_user_when_username_exists_with_different_email(self):
        existing = User.objects.create(
            username="existing@example.com",
            email="old-address@example.org",
            first_name="Old Institution",
        )
        existing.set_unusable_password()
        existing.save()

        response = self.post_email_gate(
            {
                "email": "existing@example.com",
                "institution": "New Institution",
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})

        existing.refresh_from_db()
        self.assertEqual(existing.first_name, "Old Institution")
        self.assertEqual(existing.email, "old-address@example.org")
        self.assertEqual(User.objects.filter(username="existing@example.com").count(), 1)

    def test_does_not_update_username_match_when_multiple_users_share_email(self):
        target = User.objects.create(
            username="shared@example.com",
            email="shared@example.com",
            first_name="Target Institution",
        )
        other = User.objects.create(
            username="other-username",
            email="shared@example.com",
            first_name="Other Institution",
        )

        response = self.post_email_gate(
            {
                "email": "shared@example.com",
                "institution": "Updated Institution",
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})

        target.refresh_from_db()
        other.refresh_from_db()
        self.assertEqual(target.first_name, "Target Institution")
        self.assertEqual(other.first_name, "Other Institution")

    def test_truncates_email_and_institution_to_user_field_lengths(self):
        username_max_length = User._meta.get_field("username").max_length
        first_name_max_length = User._meta.get_field("first_name").max_length

        long_email = f"test@{'b' * 63}.{'c' * 63}.com.{'d' * 20}"
        long_institution = "Institution " + ("X" * 300)

        response = self.post_email_gate(
            {
                "email": long_email,
                "institution": long_institution,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})

        expected_email = long_email.strip().lower()[:username_max_length]
        expected_institution = long_institution.strip()[:first_name_max_length]
        user = User.objects.get(username=expected_email)

        self.assertEqual(user.email, expected_email)
        self.assertEqual(user.first_name, expected_institution)
        self.assertEqual(len(user.username), username_max_length)
        self.assertEqual(len(user.first_name), first_name_max_length)

    def test_rejects_submit_without_csrf_token(self):
        response = self.csrf_client.post(
            reverse("submit_email_gate"),
            data=json.dumps(
                {
                    "email": "test@example.com",
                    "institution": "University Hospital",
                }
            ),
            content_type="application/json",
            HTTP_ORIGIN=self.default_origin,
            secure=True,
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(User.objects.filter(username="test@example.com").exists())

    def test_rejects_invalid_email(self):
        response = self.post_email_gate(
            {
                "email": "not-an-email",
                "institution": "University Hospital",
            }
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"ok": False, "error": "Invalid email"})

    def test_rejects_empty_email(self):
        response = self.post_email_gate(
            {
                "email": "   ",
                "institution": "University Hospital",
            }
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"ok": False, "error": "Email is required"})

    def test_rejects_empty_institution(self):
        response = self.post_email_gate(
            {
                "email": "test@example.com",
                "institution": "   ",
            }
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"ok": False, "error": "Institution is required"})
