import json

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse


class SubmitEmailGateTests(TestCase):
    def test_creates_user_on_first_submission(self):
        response = self.client.post(
            reverse("submit_email_gate"),
            data=json.dumps(
                {
                    "email": "Test@Example.com",
                    "institution": "University Hospital",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})

        user = User.objects.get(email="test@example.com")
        self.assertEqual(user.username, "test@example.com")
        self.assertEqual(user.first_name, "University Hospital")
        self.assertFalse(user.has_usable_password())

    def test_updates_institution_for_existing_email(self):
        existing = User.objects.create(
            username="existing@example.com",
            email="existing@example.com",
            first_name="Old Institution",
        )
        existing.set_unusable_password()
        existing.save()

        response = self.client.post(
            reverse("submit_email_gate"),
            data=json.dumps(
                {
                    "email": "existing@example.com",
                    "institution": "New Institution",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})

        existing.refresh_from_db()
        self.assertEqual(existing.first_name, "New Institution")

    def test_rejects_invalid_email(self):
        response = self.client.post(
            reverse("submit_email_gate"),
            data=json.dumps(
                {
                    "email": "not-an-email",
                    "institution": "University Hospital",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"ok": False, "error": "Invalid email"})

    def test_rejects_empty_email(self):
        response = self.client.post(
            reverse("submit_email_gate"),
            data=json.dumps(
                {
                    "email": "   ",
                    "institution": "University Hospital",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"ok": False, "error": "Email is required"})

    def test_rejects_empty_institution(self):
        response = self.client.post(
            reverse("submit_email_gate"),
            data=json.dumps(
                {
                    "email": "test@example.com",
                    "institution": "   ",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"ok": False, "error": "Institution is required"})
