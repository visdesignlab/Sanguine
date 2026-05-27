import json
import logging
from pathlib import Path

import requests
from django.conf import settings
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.http import require_http_methods

from .decorators.conditional_login_required import conditional_login_required
from .utils.utils import log_request

logger = logging.getLogger(__name__)

# Path to the committed system prompt, relative to this file
_PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "application_state_system_prompt.md"

# Silicon Flow API endpoint (OpenAI-compatible)
_SILICON_FLOW_URL = "https://api.siliconflow.com/v1/chat/completions"

# Chat parameters
_MAX_TOKENS = 2048
_TEMPERATURE = 0.7


def _stream_silicon_flow_content(upstream_response):
    """Yield assistant content chunks from an OpenAI-compatible SSE stream."""
    try:
        for raw_line in upstream_response.iter_lines(decode_unicode=True):
            if not raw_line:
                continue

            line = raw_line.decode("utf-8") if isinstance(raw_line, bytes) else str(raw_line)
            if not line.startswith("data:"):
                continue

            payload = line.removeprefix("data:").strip()
            if not payload or payload == "[DONE]":
                break

            try:
                data = json.loads(payload)
            except (json.JSONDecodeError, ValueError):
                logger.debug("Skipping malformed stream chunk: %s", payload)
                continue

            choices = data.get("choices") or []
            if not choices:
                continue

            delta = choices[0].get("delta") or {}
            content = delta.get("content")
            if content:
                yield str(content)
    finally:
        upstream_response.close()


def _load_system_prompt() -> str:
    """Read the committed system prompt file at runtime."""
    try:
        return _PROMPT_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        logger.error("System prompt file not found: %s", _PROMPT_PATH)
        return ""


@require_http_methods(["POST"])
@conditional_login_required
def llm_chat(request):
    """Proxy endpoint: forwards the user message to Silicon Flow."""
    log_request(request)

    # --- Validate environment configuration ---
    api_key = settings.SILICON_FLOW_API_KEY
    model = settings.SILICON_FLOW_MODEL
    if not api_key:
        return JsonResponse(
            {"error": "SILICON_FLOW_API_KEY is not configured"},
            status=500,
        )
    if not model:
        return JsonResponse(
            {"error": "SILICON_FLOW_MODEL is not configured"},
            status=500,
        )

    # --- Parse and validate request body ---
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse(
            {"error": "Request body must be valid JSON"},
            status=400,
        )

    user_message = body.get("message")
    if not user_message or not str(user_message).strip():
        return JsonResponse(
            {"error": "message is required and must not be empty"},
            status=400,
        )
    user_message = str(user_message).strip()
    stream_response = bool(body.get("stream"))

    # --- Build messages ---
    system_prompt = _load_system_prompt()
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    # --- Call Silicon Flow ---
    try:
        response = requests.post(
            _SILICON_FLOW_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "max_tokens": _MAX_TOKENS,
                "temperature": _TEMPERATURE,
                "response_format": {"type": "json_object"},
                "stream": stream_response,
            },
            timeout=60,
            stream=stream_response,
        )
        response.raise_for_status()

        if stream_response:
            streaming_response = StreamingHttpResponse(
                _stream_silicon_flow_content(response),
                content_type="text/plain; charset=utf-8",
            )
            streaming_response["Cache-Control"] = "no-cache"
            streaming_response["X-Accel-Buffering"] = "no"
            return streaming_response

        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content")
        if content is None:
            logger.error("Silicon Flow returned no content for user: %s", request.user)
            return JsonResponse(
                {"error": "LLM returned an empty response"},
                status=502,
            )
        return JsonResponse({"message": content})

    except requests.exceptions.Timeout:
        logger.exception("Timeout calling Silicon Flow for user: %s", request.user)
        return JsonResponse(
            {"error": "LLM request timed out"},
            status=504,
        )
    except requests.exceptions.HTTPError as exc:
        logger.exception("HTTP error calling Silicon Flow for user: %s", request.user)
        return JsonResponse(
            {"error": f"LLM proxy failed: {exc}"},
            status=502,
        )
    except Exception as exc:
        logger.exception("Error calling Silicon Flow for user: %s", request.user)
        return JsonResponse(
            {"error": f"LLM proxy failed: {exc}"},
            status=502,
        )
