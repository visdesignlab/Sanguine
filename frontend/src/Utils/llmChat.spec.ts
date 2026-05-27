import {
  describe,
  expect,
  test,
  beforeEach,
  vi,
} from 'vitest';

import { sendChatMessage } from './llmChat';
import { apiPath } from './api';

const makeStreamResponse = (chunks: string[]) => {
  const encoder = new TextEncoder();
  let index = 0;

  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () => {
          if (index >= chunks.length) {
            return { done: true, value: undefined };
          }

          const value = encoder.encode(chunks[index]);
          index += 1;
          return { done: false, value };
        },
      }),
    },
  };
};

describe('sendChatMessage', () => {
  beforeEach(() => {
    // Clear cookies before each test.
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
    vi.restoreAllMocks();
  });

  test('posts to the correct endpoint', async () => {
    document.cookie = 'csrftoken=token; path=/';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Hello from LLM' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await sendChatMessage('What is RBC count?');

    expect(mockFetch).toHaveBeenCalledWith(
      apiPath('llm_chat'),
      expect.any(Object),
    );
    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(callArgs[0]).toBe(apiPath('llm_chat'));
  });

  test('includes credentials: include', async () => {
    document.cookie = 'csrftoken=token; path=/';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'OK' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await sendChatMessage('test');

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(callArgs[1].credentials).toBe('include');
  });

  test('includes Content-Type: application/json', async () => {
    document.cookie = 'csrftoken=token; path=/';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'OK' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await sendChatMessage('test');

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(callArgs[1].headers).toHaveProperty('Content-Type', 'application/json');
  });

  test('includes the X-CSRFToken header', async () => {
    // Pre-set the cookie so ensureCsrfToken returns it without fetching.
    document.cookie = 'csrftoken=test-csrf-token; path=/';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'OK' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await sendChatMessage('test');

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(callArgs[1].headers).toHaveProperty('X-CSRFToken', 'test-csrf-token');
  });

  test('returns the parsed message from the response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'RBC count is red blood cell count.' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    document.cookie = 'csrftoken=token; path=/';

    const result = await sendChatMessage('What is RBC?');

    expect(result).toEqual({ message: 'RBC count is red blood cell count.' });
  });

  test('throws on non-2xx response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Something went wrong',
    });
    vi.stubGlobal('fetch', mockFetch);

    document.cookie = 'csrftoken=token; path=/';

    await expect(sendChatMessage('test')).rejects.toThrow(
      'Chat request failed (500)',
    );
  });

  test('throws on empty message', async () => {
    document.cookie = 'csrftoken=token; path=/';

    await expect(sendChatMessage('')).rejects.toThrow(
      'Message cannot be empty.',
    );
    await expect(sendChatMessage('   ')).rejects.toThrow(
      'Message cannot be empty.',
    );
  });

  test('throws when CSRF token cannot be obtained', async () => {
    // No cookie set, and fetch fails.
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(sendChatMessage('test')).rejects.toThrow(
      'Unable to obtain CSRF token.',
    );
  });

  test('throws on unexpected response shape', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ notMessage: 'wrong shape' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    document.cookie = 'csrftoken=token; path=/';

    await expect(sendChatMessage('test')).rejects.toThrow(
      'Unexpected response from chat endpoint.',
    );
  });

  test('trims the message before sending', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'OK' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    document.cookie = 'csrftoken=token; path=/';

    await sendChatMessage('  hello world  ');

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(callArgs[1].body as string);
    expect(body.message).toBe('hello world');
    expect(body.stream).toBe(false);
  });

  test('streams chunks when a chunk callback is provided', async () => {
    document.cookie = 'csrftoken=token; path=/';

    const streamedChunks: string[] = [];
    const mockFetch = vi.fn().mockResolvedValue(
      makeStreamResponse(['{"foo": ', '"bar"}']) as unknown as Response,
    );
    vi.stubGlobal('fetch', mockFetch);

    const result = await sendChatMessage('stream this', {
      onChunk: (chunk) => {
        streamedChunks.push(chunk);
      },
    });

    expect(result.message).toBe('{"foo": "bar"}');
    expect(streamedChunks).toEqual(['{"foo": ', '"bar"}']);

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(callArgs[1].body as string);
    expect(body.stream).toBe(true);
  });
});
