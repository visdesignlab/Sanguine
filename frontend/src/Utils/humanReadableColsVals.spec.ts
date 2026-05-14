import {
  afterEach, describe, expect, test, vi,
} from 'vitest';

import {
  formatStateDetailName,
  formatStateDetailValue,
  makeHumanReadableColumn,
  makeHumanReadableValues,
} from './humanReadableColsVals';

describe('makeHumanReadableColumn', () => {
  test('returns friendly names for known columns', () => {
    expect(makeHumanReadableColumn('rbc_units')).toBe('# RBC Units');
  });

  test('falls back to the raw column name when unknown', () => {
    expect(makeHumanReadableColumn('custom_field' as never)).toBe('custom_field');
  });
});

describe('makeHumanReadableValues', () => {
  test('returns N/A for nullish values', () => {
    expect(makeHumanReadableValues('death', null)).toBe('N/A');
  });

  test('formats boolean-like values as yes or no', () => {
    expect(makeHumanReadableValues('death', true)).toBe('Yes');
    expect(makeHumanReadableValues('death', 0)).toBe('No');
  });

  test('formats DRG weights with three decimals', () => {
    expect(makeHumanReadableValues('ms_drg_weight', 2.34567)).toBe('2.346');
  });

  test('formats departments as a readable comma-separated list', () => {
    expect(makeHumanReadableValues('departments', '["Oncology","Radiology"]')).toBe('Oncology, Radiology');
  });

  test('returns invalid date for bad timestamps', () => {
    expect(makeHumanReadableValues('adm_dtm', Number.NaN)).toBe('Invalid Date');
  });
});

describe('formatStateDetailName', () => {
  test('special-cases date field names', () => {
    expect(formatStateDetailName('dateFrom')).toBe('Date From');
  });

  test('uses configured labels for known metric keys', () => {
    expect(formatStateDetailName('rbc_units')).toBe('RBCs Transfused');
  });

  test('falls back to title-cased keys', () => {
    expect(formatStateDetailName('custom_field')).toBe('Custom Field');
  });
});

describe('formatStateDetailValue', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('formats keyed date strings via locale date formatting', () => {
    vi.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('5/13/2026');

    expect(formatStateDetailValue('2026-05-13T00:00:00.000Z', 'dateFrom')).toBe('5/13/2026');
  });

  test('formats booleans and ranges readably', () => {
    expect(formatStateDetailValue(true)).toBe('Yes');
    expect(formatStateDetailValue([1, 3])).toBe('1 - 3');
  });

  test('formats arrays and nullish values', () => {
    expect(formatStateDetailValue(['A', 'B'])).toBe('A, B');
    expect(formatStateDetailValue(undefined)).toBe('None');
  });
});
