import { describe, expect, test } from 'vitest';

import { expandTimePeriod } from './expandTimePeriod';

describe('expandTimePeriod', () => {
  test('expands a year into the year, quarters, and months', () => {
    const periods = expandTimePeriod('2024');

    expect(periods).toHaveLength(17);
    expect(periods).toEqual(expect.arrayContaining(['2024', '2024-Q1', '2024-Q4', '2024-Jan', '2024-Dec']));
  });

  test('expands a quarter into the quarter and its months', () => {
    expect(expandTimePeriod('2024-Q3')).toEqual(['2024-Q3', '2024-Jul', '2024-Aug', '2024-Sep']);
  });

  test('returns a single month unchanged', () => {
    expect(expandTimePeriod('2024-Feb')).toEqual(['2024-Feb']);
  });

  test('returns an empty array for empty or invalid input', () => {
    expect(expandTimePeriod('')).toEqual([]);
    expect(expandTimePeriod('2024-13')).toEqual([]);
  });
});
