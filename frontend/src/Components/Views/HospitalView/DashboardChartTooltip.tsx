import {
  Title, Paper, Text, Stack, Box, Group,
} from '@mantine/core';
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

  const isMulti = payload.length > 1;
  const total = isMulti ? payload.reduce((acc, p) => acc + (p.value ?? 0), 0) : payload[0].value ?? 0;
  const formattedTotal = formatValueForDisplay(yAxisVar, total, aggregation);

  return (
    <Paper p="xs" shadow="md" radius="sm" style={tooltipStyles}>
      <Stack gap={4}>
        <Box>
          <Title order={4}>
            {formattedTotal}
          </Title>
          <Text size="xs" c="dimmed" fw={500}>
            {xAxisVar}
          </Text>
        </Box>

        {isMulti && (
          <Box pt={4} mt={4} style={{ borderTop: '1px solid rgba(128,128,128,0.2)' }}>
            <Stack gap={2}>
              {payload.map((p, i) => (
                <Group key={i} justify="space-between" gap="xl" wrap="nowrap">
                  <Group gap={6} wrap="nowrap">
                    <Box
                      w={8}
                      h={8}
                      style={{ backgroundColor: p.color, borderRadius: '2px', flexShrink: 0 }}
                    />
                    <Text size="xs" fw={500} style={{ whiteSpace: 'nowrap' }}>
                      {p.name}
                    </Text>
                  </Group>
                  <Text size="xs" fw={600}>
                    {formatValueForDisplay(yAxisVar, p.value ?? 0, aggregation)}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Box>
        )}

        {departmentLabel && (
          <Text size="xs" c="dimmed" fs="italic" mt={isMulti ? 4 : 0}>
            {departmentLabel}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
