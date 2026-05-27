import { apiPath } from './api';
import { ensureCsrfToken } from './csrf';

/**
 * Response shape from the /api/llm_chat endpoint.
 */
export interface LlmChatResponse {
  message: string;
}

export interface SendChatMessageOptions {
  onChunk?: (chunk: string) => void;
}

const readStreamResponse = async (
  response: Response,
  onChunk: (chunk: string) => void,
): Promise<string> => {
  if (!response.body) {
    throw new Error('Streaming response body is unavailable.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullMessage = '';

  const streamChunks = async function* streamChunksImpl(
    nextRead: Promise<ReadableStreamReadResult<Uint8Array>>,
  ): AsyncGenerator<string> {
    const { done, value } = await nextRead;
    if (done) {
      const finalChunk = decoder.decode();
      if (finalChunk) {
        yield finalChunk;
      }
      return;
    }

    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      yield chunk;
    }

    yield* streamChunksImpl(reader.read());
  };

  try {
    for await (const chunk of streamChunks(reader.read())) {
      fullMessage += chunk;
      onChunk(chunk);
    }
  } finally {
    reader.releaseLock?.();
  }

  return fullMessage;
};

/**
 * Send a user message to the LLM chat proxy.
 *
 * POSTs to `apiPath('llm_chat')` with credentials included and
 * the CSRF token attached.  Uses `ensureCsrfToken()` to guarantee
 * the cookie is present before the request.
 *
 * @param message — the user's natural-language question
 * @returns the LLM response message text
 * @throws Error with a human-readable message on failure
 */
export async function sendChatMessage(
  message: string,
  options: SendChatMessageOptions = {},
): Promise<{ message: string }> {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error('Message cannot be empty.');
  }

  const csrfToken = await ensureCsrfToken();
  if (!csrfToken) {
    throw new Error('Unable to obtain CSRF token.');
  }

  const response = await fetch(apiPath('llm_chat'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify({ message: trimmed, stream: Boolean(options.onChunk) }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Chat request failed (${response.status}): ${body || response.statusText}`);
  }

  if (options.onChunk) {
    const messageText = await readStreamResponse(response, options.onChunk);
    return { message: messageText };
  }

  const data = await response.json().catch(() => null);
  if (!data || typeof data.message !== 'string') {
    throw new Error('Unexpected response from chat endpoint.');
  }

  return { message: data.message };
}
