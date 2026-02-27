import { mean as d3Mean } from 'd3-array';

/**
 * Epanechnikov kernel function.
 * @param k Bandwidth
 */
export function kernelEpanechnikov(k: number) {
  return function kernelFn(v: number) {
    const u = v / k;
    return Math.abs(u) <= 1 ? (0.75 * (1 - u * u)) / k : 0;
  };
}

/**
 * Kernel Density Estimator.
 * @param kernel Kernel function
 * @param thresholds Array of threshold values (x-axis)
 */
export function kernelDensityEstimator(kernel: (v: number) => number, thresholds: number[]) {
  return function estimator(data: number[]) {
    return thresholds.map((x) => [x, d3Mean(data, (v) => kernel(x - v)) ?? 0] as [number, number]);
  };
}
