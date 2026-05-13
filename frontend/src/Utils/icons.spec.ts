import { describe, expect, test } from 'vitest';

import { getIconForVar, icons } from './icons';

describe('getIconForVar', () => {
  test('returns the blood component icon for blood product metrics', () => {
    expect(getIconForVar('rbc_units')).toBe(icons.bloodComponent);
  });

  test('returns the adherence icon for adherence metrics', () => {
    expect(getIconForVar('overall_units_adherent')).toBe(icons.adherence);
  });

  test('returns the outcome icon for outcome metrics', () => {
    expect(getIconForVar('death')).toBe(icons.outcome);
  });

  test('returns the prophylactic medication icon for medication metrics', () => {
    expect(getIconForVar('b12')).toBe(icons.prophylMed);
  });

  test('falls back to the blood component icon for unknown metrics', () => {
    expect(getIconForVar('unknown_metric' as never)).toBe(icons.bloodComponent);
  });
});
