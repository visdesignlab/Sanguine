import {
  Box, Paper, Text,
} from '@mantine/core';
import { formatValueForDisplay } from '../../../Utils/dashboard';
import {
  AGGREGATION_OPTIONS, providerViewYAxisOptions, ProviderChartTooltipProps,
  TIME_AGGREGATION_OPTIONS,
} from '../../../Types/application';

/** Human-readable label for tooltip series names. */
function formatSeriesName(name: string): string {
  if (name === 'attending_provider') return 'Number of Providers';
  return name;
}

/**
 * Format the tooltip header label for histogram bins.
 * For percentage metrics, multiply by 100 and append %.
 */
function formatBinLabel(value: number, xAxisVar: string): string {
  if (!Number.isFinite(value)) return '';
  const opt = providerViewYAxisOptions.find((o) => o.value === xAxisVar);
  const avgUnit = (opt as { units?: { avg?: string } })?.units?.avg ?? '';
  if (avgUnit.startsWith('%')) {
    const pct = value * 100;
    return `${pct % 1 === 0 ? String(pct) : pct.toFixed(1)}%`;
  }
  return value % 1 === 0 ? String(value) : value.toFixed(2);
}

/**
 * Custom tooltip component for ProviderView charts.
 */
export function ProviderChartTooltip({
  active, payload, label, xAxisVar, yAxisVar, aggregation,
}: ProviderChartTooltipProps) {
  if (!active || !payload?.length) return null;

  // Determine if this is a time-series chart (xAxisVar is a time period like month/quarter/year)
  const isTimeSeries = xAxisVar in TIME_AGGREGATION_OPTIONS;

  // For time-series: show the time period label directly (e.g. "2022-Q3")
  // For histograms: show a formatted header like "Average RBC Units: 2.33"
  let headerContent: string;
  if (isTimeSeries) {
    // Just show the period label directly, no prefix
    headerContent = label !== undefined && label !== null ? String(label) : '';
  } else {
    // Histogram: resolve the human-readable name for the x-axis metric
    const xVarOption = providerViewYAxisOptions.find((opt) => opt.value === xAxisVar);
    const xVarLabel = xVarOption?.label?.[aggregation as keyof typeof AGGREGATION_OPTIONS] || xAxisVar;
    const formattedValue = typeof label === 'number' ? formatBinLabel(label, xAxisVar) : String(label ?? '');
    headerContent = `${xVarLabel}: ${formattedValue}`;
  }

  return (
    <Paper withBorder shadow="md" p="sm" radius="md">
      <Box mb={5}>
        <Text size="sm" fw={700}>
          {headerContent}
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
              {formatSeriesName(castItem.name)}
              :
              {' '}
              <Text component="span" fw={600}>
                {(() => {
                  const opt = providerViewYAxisOptions.find((o) => o.value === yAxisVar);
                  if (opt) {
                    const unit = opt.units?.[aggregation as 'sum' | 'avg'] ?? '';
                    const isPercent = unit.startsWith('%');
                    const rawValue = isPercent ? castItem.value * 100 : castItem.value;
                    const decimals = typeof opt.decimals === 'number'
                      ? opt.decimals
                      : opt.decimals?.[aggregation as 'sum' | 'avg'] ?? 0;
                    const displayValue = rawValue.toLocaleString(undefined, {
                      minimumFractionDigits: decimals,
                      maximumFractionDigits: decimals,
                    });
                    return isPercent ? `${displayValue}${unit}` : `${displayValue} ${unit}`.trim();
                  }
                  return formatValueForDisplay(yAxisVar as never, Number(castItem.value), aggregation as keyof typeof AGGREGATION_OPTIONS);
                })()}
              </Text>
            </Text>
          </Box>
        );
      })}
    </Paper>
  );
}
