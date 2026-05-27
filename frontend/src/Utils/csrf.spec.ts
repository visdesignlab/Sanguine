import {
  describe,
  expect,
  test,
  beforeEach,
  vi,
} from 'vitest';

import { getCsrfToken, ensureCsrfToken } from './csrf';
import { apiPath } from './api';

describe('getCsrfToken', () => {
  beforeEach(() => {
    // Clear cookies before each test.
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
  });

  test('returns the csrftoken cookie value when present', () => {
    document.cookie = 'csrftoken=abc123token; path=/';
    expect(getCsrfToken()).toBe('abc123token');
  });

  test('decodes URI-encoded cookie values', () => {
    document.cookie = 'csrftoken=hello%20world; path=/';
    expect(getCsrfToken()).toBe('hello world');
  });

  test('returns null when no cookie is set', () => {
    expect(getCsrfToken()).toBeNull();
  });

  test('returns null when csrftoken cookie is absent among other cookies', () => {
    // Clear and set only a non-csrf cookie.
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
    document.cookie = 'sessionid=xyz; path=/';
    expect(getCsrfToken()).toBeNull();
  });

  test('handles empty cookie string', () => {
    document.cookie = '';
    expect(getCsrfToken()).toBeNull();
  });
});

describe('ensureCsrfToken', () => {
  beforeEach(() => {
    // Clear cookies.
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
    vi.restoreAllMocks();
  });

  test('returns the existing cookie value when present', async () => {
    document.cookie = 'csrftoken=existing-token; path=/';
    const result = await ensureCsrfToken();
    expect(result).toBe('existing-token');
  });

  test('fetches from email_gate/csrf when cookie is missing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
    });
    vi.stubGlobal('fetch', mockFetch);

    // First call (ensureCsrfToken) finds no cookie, fetches, then sets it.
    // We need to simulate the cookie being set after the fetch.
    // Since we can't easily intercept set-cookie headers in jsdom,
    // we'll test the behavior: ensureCsrfToken calls fetch when no cookie.
    const result = await ensureCsrfToken();

    expect(mockFetch).toHaveBeenCalledWith(
      apiPath('email_gate/csrf'),
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      }),
    );
    // After fetch succeeds, getCsrfToken returns null (cookie not set in jsdom)
    expect(result).toBeNull();
  });

  test('returns null when fetch fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await ensureCsrfToken();
    expect(result).toBeNull();
  });

  test('returns null when fetch throws', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const result = await ensureCsrfToken();
    expect(result).toBeNull();
  });
});
