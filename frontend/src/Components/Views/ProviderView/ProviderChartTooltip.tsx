import {
  Box, Paper, Text,
} from '@mantine/core';
import { formatValueForDisplay } from '../../../Utils/dashboard';
import {
  AGGREGATION_OPTIONS, dashboardYAxisOptions, ProviderChartTooltipProps, providerXAxisOptions,
} from '../../../Types/application';

/**
 * Format the tooltip header value. Histogram bin centers are raw aggregated
 * numbers and must NOT be run through formatValueForDisplay (which multiplies
 * percentage-unit fields by 100). Time-series labels are strings and displayed
 * as-is.
 */
function formatTooltipLabel(label: string | number | undefined): string {
  if (label === undefined || label === null) return '';
  if (typeof label === 'string') return label;
  if (!Number.isFinite(label)) return '';
  return label % 1 === 0 ? String(label) : label.toFixed(2);
}

/**
 * Custom tooltip component for ProviderView charts.
 */
export function ProviderChartTooltip({
  active, payload, label, xAxisVar, yAxisVar, aggregation,
}: ProviderChartTooltipProps) {
  if (!active || !payload?.length) return null;

  // Resolve the human-readable name for the x-axis variable
  const xVarOption = [...dashboardYAxisOptions, ...providerXAxisOptions].find((opt) => opt.value === xAxisVar);
  const xVarLabel = xVarOption?.label?.[aggregation as keyof typeof AGGREGATION_OPTIONS] || xAxisVar;

  return (
    <Paper withBorder shadow="md" p="sm" radius="md">
      <Box mb={5}>
        <Text size="sm" fw={700}>
          {xVarLabel}
          :
          {' '}
          {formatTooltipLabel(label)}
        </Text>
      </Box>
      {payload.map((item: unknown) => {
        const castItem = item as { name: string; value: number; color: string };
        return (
          <Box key={castItem.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Box style={{
              width: 10, height: 10, borderRadius: '50%', backgroundColor: castItem.color,
            }}
            />
            <Text size="xs">
              {castItem.name}
              :
              {' '}
              <Text component="span" fw={600}>
                {formatValueForDisplay(yAxisVar as never, Number(castItem.value), aggregation as keyof typeof AGGREGATION_OPTIONS)}
              </Text>
            </Text>
          </Box>
        );
      })}
    </Paper>
  );
}
