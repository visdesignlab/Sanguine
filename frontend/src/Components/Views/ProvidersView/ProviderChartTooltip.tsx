import { formatValueForDisplay } from '../../../Utils/dashboard';

type ProviderChartTooltipProps = {
    active?: boolean;
    payload?: { payload?: Record<string, number> }[];
    xAxisVar?: string; // chart.title
    yAxisVar?: string; // "Number of Providers"
    aggregation: 'sum' | 'avg';
};

export function ProviderChartTooltip({
  active,
  payload,
  xAxisVar,
  yAxisVar,
  aggregation,
}: ProviderChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  // --- Get formatted values ---
  const row = payload?.[0]?.payload ?? {};
  const xValue = row[xAxisVar ?? ''];
  const yValue = row[yAxisVar ?? ''];

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
        {formatValueForDisplay(yAxisVar ?? '', yValue, aggregation)}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 11,
          color: '#444',
          maxWidth: 175, // limit width so long labels wrap
          whiteSpace: 'normal', // allow wrapping
          wordBreak: 'break-word', // break long words if needed
          overflowWrap: 'anywhere', // more aggressive wrapping for long tokens
        }}
      >
        {formatValueForDisplay(xAxisVar ?? '', xValue, aggregation)}
      </div>
    </div>
  );
}
