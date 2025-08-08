import { Title, Paper } from '@mantine/core';
import { dashboardYAxisOptions } from '../../../Types/application';

// --- Custom tooltip component ---
export function DashboardChartTooltip({
  active, payload, label, yAxisVar,
}: {
  active?: boolean;
  payload?: Array<{
    value?: number;
    name?: string;
    color?: string;
  }>;
  label?: string;
  yAxisVar: string;
}) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  // Find the option that matches this variable to get the unit
  const yAxisOption = dashboardYAxisOptions.find((opt) => opt.value === yAxisVar);
  const unit = yAxisOption?.unit || '';

  // Format the value based on unit type
  const formatValue = (value: number) => {
    if (unit === '%') {
      return `${(value * 100).toFixed(1)}%`;
    }
    return `${value.toLocaleString()} ${unit}`;
  };

  return (
    <Paper p="xs" shadow="md" radius="sm" style={{ border: '1px solid #e9ecef' }}>
      <Title size="sm" fw={500} mb={2}>
        {label}
      </Title>
      <Title size="sm" c="dimmed">
        {formatValue(payload[0].value ?? 0)}
      </Title>
    </Paper>
  );
}
