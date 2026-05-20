import { describe, expect, test } from 'vitest';

import { kernelDensityEstimator, kernelEpanechnikov } from './d3Utils';

describe('kernelEpanechnikov', () => {
  test('returns the peak density at zero', () => {
    const kernel = kernelEpanechnikov(1);

    expect(kernel(0)).toBe(0.75);
  });

  test('returns zero outside the bandwidth', () => {
    const kernel = kernelEpanechnikov(2);

    expect(kernel(3)).toBe(0);
  });
});

describe('kernelDensityEstimator', () => {
  test('maps thresholds to mean kernel values', () => {
    const estimator = kernelDensityEstimator((value) => value, [2, 4]);

    expect(estimator([1, 3])).toEqual([
      [2, 0],
      [4, 2],
    ]);
  });
});
