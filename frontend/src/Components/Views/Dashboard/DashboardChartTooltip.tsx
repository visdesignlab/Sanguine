import { Title, Paper } from '@mantine/core';
import { dashboardYAxisVars } from '../../../Types/application';
import { formatStatValue } from '../../../Utils/dashboard';

// --- Custom tooltip component ---
export function DashboardChartTooltip({
  active, payload, label, yAxisVar, aggregation,
}: {
  active?: boolean;
  payload?: Array<{
    value?: number;
    name?: string;
    color?: string;
  }>;
  label?: string;
  yAxisVar: typeof dashboardYAxisVars[number];
  aggregation: 'sum' | 'avg';
}) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const formattedValue = formatStatValue(yAxisVar, payload[0].value ?? 0, aggregation);

  return (
    <Paper p="xs" shadow="md" radius="sm" style={{ border: '1px solid #e9ecef' }}>
      <Title size="sm" fw={500} mb={2}>
        {label}
      </Title>
      <Title size="sm" c="dimmed">
        {formattedValue}
      </Title>
    </Paper>
  );
}
