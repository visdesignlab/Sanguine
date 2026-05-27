import json
from unittest.mock import MagicMock, patch

from django.conf import settings
from django.test import Client, TestCase
from django.urls import reverse

from api.views.llm_chat import _SILICON_FLOW_URL


class LlmChatEndpointTests(TestCase):
    """Tests for the /api/llm_chat proxy endpoint."""

    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.default_origin = settings.CSRF_TRUSTED_ORIGINS[0]
        self.requests_post_patcher = patch("api.views.llm_chat.requests.post")
        self.mock_requests_post = self.requests_post_patcher.start()
        self.mock_requests_post.side_effect = AssertionError(
            "Unexpected outbound Silicon Flow request in test. Mock requests.post explicitly.",
        )

    def tearDown(self):
        self.requests_post_patcher.stop()

    # ------------------------------------------------------------------
    # 1. Success — valid message returns 200 with LLM content
    # ------------------------------------------------------------------
    def test_success_returns_llm_content(self):
        """A valid POST with a message returns the LLM's response content."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "This is the generated state."}}],
        }
        mock_response.raise_for_status.return_value = None
        self.mock_requests_post.side_effect = None
        self.mock_requests_post.return_value = mock_response

        response = self.client.post(
            reverse("llm_chat"),
            data=json.dumps({"message": "What is the RBC transfusion rate?"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"message": "This is the generated state."},
        )

        # Verify requests.post was called with correct parameters
        self.mock_requests_post.assert_called_once()
        call_args = self.mock_requests_post.call_args
        self.assertEqual(call_args[0][0], _SILICON_FLOW_URL)
        self.assertEqual(
            call_args[1]["headers"]["Authorization"],
            f"Bearer {settings.SILICON_FLOW_API_KEY}",
        )
        self.assertEqual(
            call_args[1]["json"]["model"],
            settings.SILICON_FLOW_MODEL,
        )
        self.assertEqual(call_args[1]["json"]["max_tokens"], 2048)
        self.assertEqual(call_args[1]["json"]["temperature"], 0.7)
        self.assertFalse(call_args[1]["json"]["stream"])
        messages = call_args[1]["json"]["messages"]
        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0]["role"], "system")
        self.assertEqual(messages[1]["role"], "user")
        self.assertEqual(
            messages[1]["content"],
            "What is the RBC transfusion rate?",
        )

    def test_streaming_returns_text_stream(self):
        """A request with stream=true returns a streaming text response."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status.return_value = None
        mock_response.iter_lines.return_value = [
            'data: {"choices":[{"delta":{"content":"{\\"foo\\": "}}]}',
            'data: {"choices":[{"delta":{"content":"\\"bar\\"}"}}]}',
            'data: [DONE]',
        ]
        mock_response.close.return_value = None
        self.mock_requests_post.side_effect = None
        self.mock_requests_post.return_value = mock_response

        response = self.client.post(
            reverse("llm_chat"),
            data=json.dumps({"message": "What is the RBC transfusion rate?", "stream": True}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.streaming)
        self.assertEqual(
            b"".join(response.streaming_content).decode("utf-8"),
            '{"foo": "bar"}',
        )

        self.mock_requests_post.assert_called_once()
        call_args = self.mock_requests_post.call_args
        self.assertTrue(call_args[1]["stream"])
        self.assertTrue(call_args[1]["json"]["stream"])

    # ------------------------------------------------------------------
    # 2. Empty message — returns 400
    # ------------------------------------------------------------------
    def test_empty_message_returns_400(self):
        """POST with an empty message body returns 400."""
        response = self.client.post(
            reverse("llm_chat"),
            data=json.dumps({"message": ""}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {"error": "message is required and must not be empty"},
        )

    def test_missing_message_key_returns_400(self):
        """POST with no 'message' key returns 400."""
        response = self.client.post(
            reverse("llm_chat"),
            data=json.dumps({}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {"error": "message is required and must not be empty"},
        )

    def test_whitespace_only_message_returns_400(self):
        """POST with whitespace-only message returns 400."""
        response = self.client.post(
            reverse("llm_chat"),
            data=json.dumps({"message": "   "}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {"error": "message is required and must not be empty"},
        )

    # ------------------------------------------------------------------
    # 3. Missing env vars — returns 500
    # ------------------------------------------------------------------
    @patch("api.views.llm_chat.settings")
    def test_missing_api_key_returns_500(self, mock_settings):
        """When SILICON_FLOW_API_KEY is empty, returns 500."""
        mock_settings.SILICON_FLOW_API_KEY = ""
        mock_settings.SILICON_FLOW_MODEL = "Qwen/Qwen2.5-72B-Instruct"

        response = self.client.post(
            reverse("llm_chat"),
            data=json.dumps({"message": "test"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(
            response.json(),
            {"error": "SILICON_FLOW_API_KEY is not configured"},
        )

    @patch("api.views.llm_chat.settings")
    def test_missing_model_returns_500(self, mock_settings):
        """When SILICON_FLOW_MODEL is empty, returns 500."""
        mock_settings.SILICON_FLOW_API_KEY = "fake-key"
        mock_settings.SILICON_FLOW_MODEL = ""

        response = self.client.post(
            reverse("llm_chat"),
            data=json.dumps({"message": "test"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(
            response.json(),
            {"error": "SILICON_FLOW_MODEL is not configured"},
        )

    # ------------------------------------------------------------------
    # 4. HTTP error — returns 502
    # ------------------------------------------------------------------
    def test_http_error_returns_502(self):
        """When Silicon Flow returns an HTTP error, returns 502."""
        import requests as requests_lib

        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = requests_lib.exceptions.HTTPError(
            "400 Client Error"
        )
        self.mock_requests_post.side_effect = None
        self.mock_requests_post.return_value = mock_response

        response = self.client.post(
            reverse("llm_chat"),
            data=json.dumps({"message": "test"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 502)
        self.assertIn("LLM proxy failed", response.json()["error"])

    def test_empty_content_returns_502(self):
        """When Silicon Flow returns no content in choices, returns 502."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"choices": []}
        mock_response.raise_for_status.return_value = None
        self.mock_requests_post.side_effect = None
        self.mock_requests_post.return_value = mock_response

        response = self.client.post(
            reverse("llm_chat"),
            data=json.dumps({"message": "test"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.json(),
            {"error": "LLM returned an empty response"},
        )

    # ------------------------------------------------------------------
    # 5. Fixed model forwarding — model comes from settings, not user
    # ------------------------------------------------------------------
    @patch("api.views.llm_chat.settings")
    def test_fixed_model_from_settings(self, mock_settings):
        """The model arg is from settings, not user-controlled."""
        mock_settings.SILICON_FLOW_API_KEY = "fake-key"
        mock_settings.SILICON_FLOW_MODEL = "custom/model/from/settings"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "result"}}],
        }
        mock_response.raise_for_status.return_value = None
        self.mock_requests_post.side_effect = None
        self.mock_requests_post.return_value = mock_response

        self.client.post(
            reverse("llm_chat"),
            data=json.dumps({"message": "test"}),
            content_type="application/json",
        )

        # Verify the model arg is from settings
        json_body = self.mock_requests_post.call_args[1]["json"]
        self.assertEqual(json_body["model"], "custom/model/from/settings")

    # ------------------------------------------------------------------
    # 6. Auth behavior — requires login when not DISABLE_LOGINS
    # ------------------------------------------------------------------
    @patch("api.views.llm_chat.settings")
    def test_requires_login_when_disabled_logins_false(self, mock_settings):
        """When DISABLE_LOGINS is False, unauthenticated requests are redirected."""
        mock_settings.DISABLE_LOGINS = False
        mock_settings.LOGIN_URL = "/api/accounts/login"

        response = self.client.post(
            reverse("llm_chat"),
            data=json.dumps({"message": "test"}),
            content_type="application/json",
        )

        # CAS login redirects with 302 to the login URL
        self.assertEqual(response.status_code, 302)
        self.assertIn("/api/accounts/login", response.url)

    @patch("api.views.llm_chat.settings")
    def test_allows_access_when_disabled_logins_true(self, mock_settings):
        """When DISABLE_LOGINS is True, no authentication is required."""
        mock_settings.DISABLE_LOGINS = True
        mock_settings.SILICON_FLOW_API_KEY = "fake-key"
        mock_settings.SILICON_FLOW_MODEL = "Qwen/Qwen2.5-72B-Instruct"

        import requests as requests_lib

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "ok"}}],
        }
        mock_response.raise_for_status.return_value = None

        self.mock_requests_post.side_effect = None
        self.mock_requests_post.return_value = mock_response
        response = self.client.post(
            reverse("llm_chat"),
            data=json.dumps({"message": "test"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

    # ------------------------------------------------------------------
    # 7. Wrong method — returns 405
    # ------------------------------------------------------------------
    def test_get_method_returns_405(self):
        """GET requests are not allowed."""
        response = self.client.get(reverse("llm_chat"))
        self.assertEqual(response.status_code, 405)

    def test_put_method_returns_405(self):
        """PUT requests are not allowed."""
        response = self.client.put(
            reverse("llm_chat"),
            data=json.dumps({"message": "test"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 405)

    # ------------------------------------------------------------------
    # 8. Invalid JSON body — returns 400
    # ------------------------------------------------------------------
    def test_invalid_json_returns_400(self):
        """POST with malformed JSON returns 400."""
        response = self.client.post(
            reverse("llm_chat"),
            data="not valid json {{{",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {"error": "Request body must be valid JSON"},
        )

    # ------------------------------------------------------------------
    # 9. Timeout — returns 504
    # ------------------------------------------------------------------
    def test_timeout_returns_504(self):
        """When Silicon Flow times out, returns 504."""
        import requests as requests_lib

        self.mock_requests_post.side_effect = requests_lib.exceptions.Timeout("Request timed out")

        response = self.client.post(
            reverse("llm_chat"),
            data=json.dumps({"message": "test"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 504)
        self.assertEqual(
            response.json(),
            {"error": "LLM request timed out"},
        )

    # ------------------------------------------------------------------
    # 10. User message is stripped and stringified
    # ------------------------------------------------------------------
    def test_user_message_is_stripped(self):
        """Leading/trailing whitespace in the user message is stripped before sending."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "result"}}],
        }
        mock_response.raise_for_status.return_value = None
        self.mock_requests_post.side_effect = None
        self.mock_requests_post.return_value = mock_response

        self.client.post(
            reverse("llm_chat"),
            data=json.dumps({"message": "  hello  "}),
            content_type="application/json",
        )

        messages = self.mock_requests_post.call_args[1]["json"]["messages"]
        self.assertEqual(messages[1]["content"], "hello")
