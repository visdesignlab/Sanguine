import { apiPath } from './api';

/**
 * Read the `csrftoken` cookie from the current document.
 * Returns null if the cookie is not present.
 */
export function getCsrfToken(): string | null {
  if (!document.cookie) return null;

  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i += 1) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith('csrftoken=')) {
      return decodeURIComponent(cookie.slice('csrftoken='.length));
    }
  }

  return null;
}

/**
 * Ensure the `csrftoken` cookie is present.
 * If the cookie is already set, return it immediately.
 * Otherwise, fetch a fresh token via the email_gate/csrf endpoint
 * (which sets the cookie) and return it.
 */
export async function ensureCsrfToken(): Promise<string | null> {
  const existingToken = getCsrfToken();
  if (existingToken) {
    return existingToken;
  }

  try {
    const csrfResponse = await fetch(apiPath('email_gate/csrf'), {
      method: 'GET',
      credentials: 'include',
    });
    if (!csrfResponse.ok) {
      return null;
    }

    return getCsrfToken();
  } catch {
    return null;
  }
}
