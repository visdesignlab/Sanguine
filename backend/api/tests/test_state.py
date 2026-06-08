import json

from django.contrib.auth import get_user_model
from django.test import TestCase

from api.models import State, StateAccess


class StateEndpointTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.owner = User.objects.create_user(username="alice", password="secret")
        self.reader = User.objects.create_user(username="bob", password="secret")
        self.client.force_login(self.owner)

    def test_create_state_returns_created_and_can_be_loaded_by_encoded_name(self):
        state_name = "Case mix & blood = view?"

        response = self.client.post(
            "/api/state",
            {
                "name": state_name,
                "definition": "compressed-state",
                "public": "true",
            },
        )

        self.assertEqual(response.status_code, 201)

        response = self.client.get("/api/state", {"name": state_name})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["name"], state_name)
        self.assertEqual(payload["definition"], "compressed-state")
        self.assertTrue(payload["public"])

    def test_update_state_preserves_public_flag_when_omitted(self):
        State.objects.create(
            name="Shared State",
            definition="before",
            owner=self.owner.username,
            public=True,
        )

        response = self.client.put(
            "/api/state",
            data=json.dumps(
                {
                    "old_name": "Shared State",
                    "new_name": "Shared State",
                    "new_definition": "after",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        state = State.objects.get(name="Shared State")
        self.assertEqual(state.definition, "after")
        self.assertTrue(state.public)

    def test_update_state_applies_explicit_public_flag(self):
        State.objects.create(
            name="Private State",
            definition="before",
            owner=self.owner.username,
            public=False,
        )

        response = self.client.put(
            "/api/state",
            data=json.dumps(
                {
                    "old_name": "Private State",
                    "new_name": "Private State",
                    "new_definition": "after",
                    "new_public": True,
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(State.objects.get(name="Private State").public)

    def test_share_state_returns_created_for_new_share(self):
        State.objects.create(
            name="Owner State",
            definition="compressed-state",
            owner=self.owner.username,
            public=False,
        )

        response = self.client.post(
            "/api/share_state",
            {
                "name": "Owner State",
                "user": self.reader.username,
                "role": "RE",
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            StateAccess.objects.filter(
                state__name="Owner State",
                user=self.reader.username,
                role="RE",
            ).exists()
        )
