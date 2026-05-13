import {
  afterEach, describe, expect, test, vi,
} from 'vitest';

import { compareTimePeriods, formatTimestamp, safeParseDate } from './dates';

describe('safeParseDate', () => {
  test('parses ISO date strings', () => {
    expect(safeParseDate('2024-01-02T00:00:00.000Z').toISOString()).toBe('2024-01-02T00:00:00.000Z');
  });

  test('throws on nullish input', () => {
    expect(() => safeParseDate(null)).toThrow('Date input is null or undefined');
  });

  test('throws on invalid input', () => {
    expect(() => safeParseDate('not-a-date')).toThrow('Invalid date format: not-a-date');
  });
});

describe('compareTimePeriods', () => {
  test('sorts years chronologically', () => {
    expect(compareTimePeriods('2023', '2024')).toBeLessThan(0);
  });

  test('sorts quarters within a year', () => {
    expect(compareTimePeriods('2024-Q1', '2024-Q3')).toBeLessThan(0);
  });

  test('sorts months within a year', () => {
    expect(compareTimePeriods('2024-Feb', '2024-Nov')).toBeLessThan(0);
  });
});

describe('formatTimestamp', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('delegates to locale formatting with the expected options', () => {
    const toLocaleStringSpy = vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('May 13, 2026, 10:00 AM');

    expect(formatTimestamp(1_715_594_400_000)).toBe('May 13, 2026, 10:00 AM');
    expect(toLocaleStringSpy).toHaveBeenCalledWith('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  });
});
