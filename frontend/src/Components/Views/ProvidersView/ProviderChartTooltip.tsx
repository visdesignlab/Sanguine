import { formatValueForDisplay } from '../../../Utils/dashboard';

type ProviderChartTooltipProps = {
    active?: boolean;
    payload?: { payload?: Record<string, unknown> }[]; // changed to unknown to handle labels & numbers
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

  // If the explicit yAxisVar is present, use it. Otherwise collect every entry that isn't the x-axis value.
  let yEntries: Array<[string, unknown]> = [];
  if (yAxisVar && Object.prototype.hasOwnProperty.call(row, yAxisVar)) {
    yEntries = [[yAxisVar, row[yAxisVar]]];
  } else {
    yEntries = Object.entries(row)
      .filter(([k]) => k !== (xAxisVar ?? '')) // skip the x axis key
      .filter(([k]) => k !== 'payload');
  }

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
        {yEntries.map(([label, val], idx) => (
          <div key={`${String(label)}-${idx}`} style={{ marginBottom: 2 }}>
            <span style={{ marginRight: 6 }}>
              {String(label)}
              :
            </span>
            <span>{formatValueForDisplay(yAxisVar ?? String(label), val as any, aggregation)}</span>
          </div>
        ))}
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
        {formatValueForDisplay(xAxisVar ?? '', xValue as any, aggregation)}
      </div>
    </div>
  );
}
