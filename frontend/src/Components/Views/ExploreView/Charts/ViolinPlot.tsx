import React from 'react';
import { mean as d3Mean, max as d3Max } from 'd3-array';
import { area, curveCatmullRom } from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import { Tooltip } from '@mantine/core';

export function kernelEpanechnikov(k: number) {
  return (v: number) => {
    v /= k;
    return Math.abs(v) <= 1 ? (0.75 * (1 - v * v)) / k : 0;
  };
}

function kernelDensityEstimator(kernel: (v: number) => number, X: number[]) {
  return (V: number[]) => X.map((x) => [x, d3Mean(V, (v) => kernel(x - v)) ?? 0] as [number, number]);
}

export function computeMedian(arr: number[]) {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// deterministic pseudo-random generator
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface HasSurgeonAndCases {
  surgeon?: string;
  cases?: number;
  [k: string]: any;
}

export function makeFakeSamplesForRow(row: HasSurgeonAndCases, count = 40) {
  const seedStr = `${row.surgeon ?? ''}:${row.cases ?? 0}`;
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  const rnd = mulberry32(h);
  return new Array(count).fill(0).map(() => {
    const v = rnd() ** 1.3 * 1.5 + 0.2 + (Number(row.cases ?? 0) % 5) * 0.05;
    return Math.round(v * 100) / 100;
  });
}

export interface ViolinPlotProps {
    samples: number[];
    domain?: [number, number];
    height?: number;
    padding?: number;
    internalWidth?: number;
    color?: string;
    stroke?: string;
    showMedian?: boolean;
    tooltipFormatter?: (stats: { min: number; median: number; max: number }) => string;
  }

export function ViolinCell({
  samples,
  domain,
  height = 25,
  padding = 0,
  internalWidth = 120,
  color = '#a6a6a6',
  stroke = '#8c8c8c',
  showMedian = true,
  tooltipFormatter,
}: ViolinPlotProps) {
  if (!samples || samples.length === 0) {
    return (
      <div style={{ width: '100%', height }}>
        <div style={{
          width: '30%', height: 6, background: '#ddd', margin: '0 auto', borderRadius: 3,
        }}
        />
      </div>
    );
  }

  const sampleMin = Math.min(...samples);
  const sampleMax = Math.max(...samples);
  const domainMin = (domain && typeof domain[0] === 'number') ? domain[0] : sampleMin;
  const domainMax = (domain && typeof domain[1] === 'number') ? domain[1] : sampleMax;
  const domainRange = Math.max(1e-6, domainMax - domainMin);
  const ticks = 20;
  const centerY = height / 2;

  const xScale = scaleLinear().domain([domainMin, domainMax]).range([padding, internalWidth - padding]);
  const liner = Array.from({ length: ticks }).map((_, i) => domainMin + (i * domainRange) / Math.max(1, ticks - 1));
  const bandwidth = Math.max(domainRange / 8, 1e-3);
  const kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), liner);
  const density = kde(samples);
  const maxDens = d3Max(density.map((d) => d[1])) ?? 1;
  const yDensityScale = scaleLinear().domain([0, maxDens]).range([0, (height - padding * 2) / 2 * 0.85]);

  const pathBuilder = area<[number, number]>()
    .x((d) => xScale(d[0]))
    .y0((d) => centerY - yDensityScale(d[1]))
    .y1((d) => centerY + yDensityScale(d[1]))
    .curve(curveCatmullRom);

  const d = pathBuilder(density) ?? '';
  const median = computeMedian(samples);
  const medianX = xScale(median);
  const medianHalfH = yDensityScale(maxDens);

  const tooltipLabel = tooltipFormatter
    ? tooltipFormatter({ min: sampleMin, median, max: sampleMax })
    : `Min ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(sampleMin)} • Median ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(median)} • Max ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(sampleMax)}`;

  return (
    <Tooltip label={tooltipLabel} position="top" withArrow>
      <div style={{
        width: '100%', height, flex: 1, position: 'relative', display: 'flex', alignItems: 'center',
      }}
      >
        <svg
          viewBox={`0 0 ${internalWidth} ${height}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', display: 'block' }}
          aria-hidden
        >
          <path d={d} fill={color} stroke={stroke} strokeWidth={1} opacity={0.95} />
        </svg>
        {showMedian && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: `${(medianX / internalWidth) * 100}%`,
            transform: 'translateX(-50%)',
            top: `${centerY - medianHalfH}px`,
            height: `${medianHalfH * 2}px`,
            width: 1,
            background: stroke,
            opacity: 0.95,
            pointerEvents: 'none',
          }}
        />
        )}
      </div>
    </Tooltip>
  );
}

export default ViolinCell;
