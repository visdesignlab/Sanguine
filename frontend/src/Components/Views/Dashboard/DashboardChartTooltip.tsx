import { Title, Paper } from '@mantine/core';
import { dashboardYAxisVars } from '../../../Types/application';
import { formatValueForDisplay } from '../../../Utils/dashboard';
import { useThemeConstants } from '../../../Theme/mantineTheme';

// --- Custom tooltip component ---
export function DashboardChartTooltip({
  active, payload, xAxisVar, yAxisVar, aggregation,
}: {
  active?: boolean;
  payload?: Array<{
    value?: number;
    name?: string;
    color?: string;
  }>;
  xAxisVar?: string;
  yAxisVar: typeof dashboardYAxisVars[number];
  aggregation: 'sum' | 'avg';
}) {
  const { tooltipStyles } = useThemeConstants();

  if (!active || !payload || !payload.length) {
    return null;
  }

  const formattedValue = formatValueForDisplay(yAxisVar, payload[0].value ?? 0, aggregation);

  return (
    <Paper p="xs" shadow="md" radius="sm" style={tooltipStyles}>
      <Title order={4}>
        {formattedValue}
      </Title>
      <Title order={5} c="dimmed">
        {xAxisVar}
      </Title>
    </Paper>
  );
}
