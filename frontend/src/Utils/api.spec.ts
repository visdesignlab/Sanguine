import { describe, expect, test } from 'vitest';

import { apiPath } from './api';

describe('apiPath', () => {
  test('prefixes relative API paths', () => {
    expect(apiPath('visits')).toBe('/api/visits');
  });

  test('strips leading slashes before prefixing', () => {
    expect(apiPath('/visits/123')).toBe('/api/visits/123');
  });
});
