/* eslint-disable react/no-unstable-nested-components */
import {
  Card, CloseButton, Stack, Text,
} from '@mantine/core';
import { useMemo, useState } from 'react';
import { BarChart, LineChart } from '@mantine/charts';
import {
  AGGREGATION_OPTIONS,
  providerViewYAxisOptions,
  ProviderChart, ProviderChartConfig,
} from '../../../Types/application';
import { formatValueForDisplay } from '../../../Utils/dashboard';
import { ProviderChartTooltip } from './ProviderChartTooltip';
import classes from '../GridLayoutItem.module.css';

const MANTINE_BLUE = '#1C7ED6';
const GOLD = '#FFD43B';

/**
 * Check whether a metric variable uses percentage display (its avg unit starts with %).
 */
function isPercentageMetric(xAxisVar: string): boolean {
  const opt = providerViewYAxisOptions.find((o) => o.value === xAxisVar);
  const avgUnit = (opt as { units?: { avg?: string } })?.units?.avg ?? '';
  return avgUnit.startsWith('%');
}

/**
 * Format a raw numeric tick value for histogram x-axis.
 * For percentage metrics (b12, iron, antifibrinolytic, adherence),
 * multiply by 100 and append %. Otherwise display the raw value.
 */
function formatHistogramTick(value: number, xAxisVar: string): string {
  if (!Number.isFinite(value)) return '';
  if (isPercentageMetric(xAxisVar)) {
    const pct = value * 100;
    return `${pct % 1 === 0 ? String(pct) : pct.toFixed(1)}%`;
  }
  return value % 1 === 0 ? String(value) : value.toFixed(2);
}

/**
 * Snap a numeric value to the nearest category value in the chart data.
 * Required because category x-axes only render reference lines at exact category values.
 */
function snapToNearestCategory(value: number | undefined, data: ProviderChart['data'], dataKey: string): number | string | undefined {
  if (value === undefined || !Number.isFinite(value) || !data?.length) return undefined;
  const categories = data
    .map((r) => r[dataKey])
    .filter((v): v is string | number => typeof v === 'string' || typeof v === 'number');
  if (!categories.length) return undefined;

  let closest = categories[0];
  let minDist = Math.abs(value - Number(closest));

  for (let i = 1; i < categories.length; i += 1) {
    const dist = Math.abs(value - Number(categories[i]));
    if (dist < minDist) {
      closest = categories[i];
      minDist = dist;
    }
  }
  return closest;
}

/** Human-readable label for chart series keys. */
function formatSeriesLabel(name: string): string {
  if (name === 'attending_provider') return 'Number of Providers';
  if (name === 'All') return 'All Providers';
  return name;
}

/** Build chart series from the first data row's keys. */
function buildSeries(chart: ProviderChart) {
  if (!chart.data?.length) return [];
  return Object.keys(chart.data[0])
    .filter((k) => k !== chart.dataKey)
    .map((name, idx) => ({
      name,
      color: idx % 2 === 0 ? MANTINE_BLUE : GOLD,
      label: formatSeriesLabel(name),
    }));
}

interface ProviderChartCardProps {
  cfg: ProviderChartConfig;
  chart: ProviderChart;
  selectedProviderName: string | null;
  onRemove: (chartId: string) => void;
}

/**
 * Renders a single chart card in the ProviderView — either a histogram (BarChart)
 * or a time-series (LineChart).
 *
 * Provider marker and recommended threshold are rendered using the Mantine
 * `referenceLines` prop rather than raw Recharts `<ReferenceLine>` children.
 * Mantine's BarChart/LineChart internally creates the ReferenceLine elements,
 * which ensures Recharts' `findAllByType` discovery works correctly.
 */
export function ProviderChartCard({
  cfg, chart, selectedProviderName, onRemove,
}: ProviderChartCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const series = buildSeries(chart);
  const isTimeSeries = cfg.chartType === 'time-series-line';

  // Build the Mantine `referenceLines` array for histograms
  const histogramReferenceLines = useMemo(() => {
    if (isTimeSeries) return undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refs: any[] = [];
    const { dataKey } = chart;

    // Provider marker — vertical line showing where selected provider falls
    const providerX = snapToNearestCategory(chart.providerMark, chart.data, dataKey);
    if (providerX !== undefined) {
      refs.push({
        x: providerX,
        label: selectedProviderName ?? 'Provider',
        color: '#228be6',
        strokeWidth: 2,
        strokeDasharray: '6 3',
        labelPosition: 'top',
      });
    }

    // Recommended threshold
    if (chart.recommendedMark !== undefined && !Number.isNaN(chart.recommendedMark)) {
      const recX = snapToNearestCategory(chart.recommendedMark, chart.data, dataKey);
      if (recX !== undefined) {
        refs.push({
          x: recX,
          label: 'Recommended',
          color: '#40c057',
          strokeDasharray: '3 3',
          strokeWidth: 1.5,
          labelPosition: 'insideBottomLeft',
        });
      }
    }

    return refs.length > 0 ? refs : undefined;
  }, [chart, isTimeSeries, selectedProviderName]);

  // Build the Mantine `referenceLines` array for time-series (y-axis thresholds)
  const timeSeriesReferenceLines = useMemo(() => {
    if (!isTimeSeries) return undefined;
    if (chart.recommendedMark === undefined || Number.isNaN(chart.recommendedMark)) return undefined;

    return [{
      y: chart.recommendedMark,
      label: 'Recommended',
      color: '#40c057',
      strokeDasharray: '3 3',
      strokeWidth: 1.5,
      labelPosition: 'right' as const,
    }];
  }, [chart.recommendedMark, isTimeSeries]);

  const commonProps = {
    h: 160,
    w: '100%',
    data: chart.data,
    dataKey: chart.dataKey,
    series,
    tooltipProps: {
      content: (props: { payload?: unknown[]; label?: string | number }) => (
        <ProviderChartTooltip
          active
          payload={props.payload}
          label={props.label}
          xAxisVar={cfg.xAxisVar}
          yAxisVar={cfg.yAxisVar}
          aggregation={cfg.aggregation}
        />
      ),
    },
  };

  return (
    <Card
      p="md"
      shadow="sm"
      withBorder
      className={classes.gridItem}
      style={{
        position: 'relative', width: 'fit-content', minWidth: 300, flexShrink: 0,
      }}
      onMouseLeave={() => setIsHovered(false)}
      onMouseEnter={() => setIsHovered(true)}
    >
      {isHovered && (
        <CloseButton
          size="xs"
          onClick={() => onRemove(cfg.chartId)}
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 2,
          }}
          aria-label="Remove chart"
        />
      )}
      <Stack gap={0} align="stretch" justify="space-between" h="100%">
        {isTimeSeries ? (
          <LineChart
            {...commonProps}
            referenceLines={timeSeriesReferenceLines}
            lineProps={{ strokeWidth: 2, dot: false }}
            lineChartProps={{
              margin: {
                top: 12, right: 25, bottom: 15, left: 25,
              },
            }}
            withLegend
            legendProps={{
              wrapperStyle: { padding: 0, margin: 0, top: -5 },
              iconSize: 2,
              verticalAlign: 'top',
              height: 18,
              formatter: (value: string | number) => <span style={{ fontSize: 12 }}>{value}</span>,
            }}
            yAxisProps={{
              type: 'number',
              width: 20,
              domain: ['dataMin', 'dataMax'],
              tickFormatter: (value: string | number) => formatValueForDisplay(cfg.yAxisVar as never, Number(value), cfg.aggregation as keyof typeof AGGREGATION_OPTIONS, false),
            }}
            xAxisProps={{
              type: 'category',
              padding: { left: 10, right: 10 },
            }}
          />
        ) : (
          <BarChart
            {...commonProps}
            referenceLines={histogramReferenceLines}
            orientation={chart.orientation}
            barChartProps={{
              margin: {
                top: 45, right: 25, bottom: 15, left: 25,
              },
            }}
            yAxisProps={{ width: 20 }}
            barProps={{ radius: 5 }}
            xAxisProps={{
              type: 'category',
              padding: { left: 10, right: 10 },
              tickFormatter: (value: string | number) => formatHistogramTick(Number(value), cfg.xAxisVar),
            }}
          />
        )}
        <Text
          size="sm"
          fw={600}
          ta="center"
          mt="xs"
          style={{
            whiteSpace: 'nowrap',
            color: 'var(--mantine-color-gray-7)',
          }}
        >
          {chart.title}
        </Text>
      </Stack>
    </Card>
  );
}
