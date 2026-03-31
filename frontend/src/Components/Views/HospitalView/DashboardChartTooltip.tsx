import {
  Title, Paper, Flex, Box, Divider,
} from '@mantine/core';
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

  return (
    <Paper p="xs" shadow="md" radius="sm" style={{ ...tooltipStyles, minWidth: 150 }}>
      {payload.map((p, i) => (

        <Flex key={`${p.name}-${i}`} direction="row" align="center" justify="space-between" gap="sm">
          <Flex align="center" gap="xs">
            <Box style={{
              width: 10, height: 10, borderRadius: '50%', backgroundColor: p.color,
            }}
            />
            <Title order={5} style={{ fontWeight: 500 }}>
              {p.name}
            </Title>
          </Flex>
          <Title order={5}>
            {formatValueForDisplay(yAxisVar, p.value ?? 0, aggregation)}
          </Title>
        </Flex>
      ))}
      <Divider my={4} />
      <Title order={5} c="dimmed">
        {xAxisVar}
      </Title>
    </Paper>
  );
}
