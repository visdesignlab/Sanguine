import {
  afterEach, describe, expect, test, vi,
} from 'vitest';

import { formatValueForDisplay, isMetricChangeGood } from './dashboard';

describe('formatValueForDisplay', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('formats blood component sums with commas and units', () => {
    expect(formatValueForDisplay('rbc_units', 1234, 'sum')).toBe('1,234 RBC Units');
  });

  test('formats percentage metrics using configured decimals', () => {
    expect(formatValueForDisplay('death', 0.123, 'avg')).toBe('12.3% of Visits');
  });

  test('formats adherence percentages compactly when full units are disabled', () => {
    expect(formatValueForDisplay('overall_units_adherent', 0.12, 'avg', false)).toBe('12% adherent');
  });

  test('formats cost metrics with a dollar prefix', () => {
    expect(formatValueForDisplay('total_blood_product_cost', 1500, 'sum')).toBe('$1,500');
  });

  test('formats large values in millions', () => {
    expect(formatValueForDisplay('total_blood_product_cost', 1_250_000, 'sum')).toBe('$1.25M');
  });

  test('warns and falls back to the raw value for unclassified axes', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(formatValueForDisplay('not_a_metric' as never, 42, 'sum')).toBe('42');
    expect(warnSpy).toHaveBeenCalledWith('Invalid yAxisVar: not_a_metric is not present in dashboardYAxisOptions');
  });
});

describe('isMetricChangeGood', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('treats negative changes as good for blood product metrics', () => {
    expect(isMetricChangeGood('rbc_units', -0.1)).toBe(true);
    expect(isMetricChangeGood('rbc_units', 0.1)).toBe(false);
  });

  test('treats positive changes as good for adherence metrics', () => {
    expect(isMetricChangeGood('overall_units_adherent', 0.1)).toBe(true);
    expect(isMetricChangeGood('overall_units_adherent', -0.1)).toBe(false);
  });

  test('warns and falls back to nonnegative changes for unknown metrics', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(isMetricChangeGood('unknown_metric' as never, 0)).toBe(true);
    expect(isMetricChangeGood('unknown_metric' as never, -1)).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('Unclassified metric: unknown_metric');
  });
});
