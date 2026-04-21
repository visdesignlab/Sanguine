import {
  Title, Paper, Text, Divider, Flex,
} from '@mantine/core';
import { IconFilter } from '@tabler/icons-react';
import { dashboardYAxisVars } from '../../../Types/application';
import { formatValueForDisplay } from '../../../Utils/dashboard';
import { useThemeConstants } from '../../../Theme/mantineTheme';

// --- Custom tooltip component ---
export function DashboardChartTooltip({
  active, payload, xAxisVar, yAxisVar, aggregation, departmentLabel,
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
  departmentLabel?: string | null;
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
      {departmentLabel && (
        <>
          <Divider mt={6} mb={4} />
          <Flex align="center" gap={4}>
            <IconFilter size={10} style={{ opacity: 0.5, flexShrink: 0 }} />
            <Text size="xs" c="dimmed">{departmentLabel}</Text>
          </Flex>
        </>
      )}
    </Paper>
  );
}
