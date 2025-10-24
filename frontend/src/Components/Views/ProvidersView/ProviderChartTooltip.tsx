import React from 'react';

type ProviderChartTooltipProps = {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  xAxisVar?: string; // chart.title
  yAxisVar?: string; // "Number of Providers"
};

export function ProviderChartTooltip({
  active,
  payload,
  label,
  xAxisVar,
  yAxisVar,
}: ProviderChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const fmt = (v: any) => {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'number') {
      return Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
    }
    return String(v);
  };

  const row = payload?.[0]?.payload ?? {};

  console.log("Tooltip row:", row);
  console.log("xAxisVar:", xAxisVar, "yAxisVar:", yAxisVar);
  console.log("x val", row[xAxisVar ?? ''], "y val:", row[yAxisVar ?? '']);
  console.log("Formatted x value:", fmt(row[xAxisVar ?? '']));
  console.log("Formatted y value:", fmt(row[yAxisVar ?? '']));
  
  const xValue = fmt(row[xAxisVar ?? '']);
  const yValue = fmt(row[yAxisVar ?? '']);

  const xLabel = xAxisVar ?? String(label ?? '');

  return (
    <div style={{
      background: '#fff',
      padding: 6,
      borderRadius: 6,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      minWidth: 140,
      fontSize: 12,
      color: '#222',
      lineHeight: 1.2,
    }}
    >
      <div style={{ fontWeight: 700, fontSize: 12 }}>
        {yValue}
        {' '}
        Providers
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: '#444' }}>
        {xLabel}
        :
        {' '}
        {xValue}
      </div>
    </div>
  );
}
