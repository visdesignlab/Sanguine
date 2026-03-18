/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable react/prop-types */
import {
  Card, CloseButton, Stack, Text,
} from '@mantine/core';
import { useState } from 'react';
import clsx from 'clsx';
import { BarChart, LineChart } from '@mantine/charts';
import { ReferenceLine } from 'recharts';
import {
  ProviderChart, ProviderChartConfig,
} from '../../../Types/application';
import { formatValueForDisplay } from '../../../Utils/dashboard';
import { ProviderChartTooltip } from './ProviderChartTooltip';
import classes from '../GridLayoutItem.module.css';

const MANTINE_BLUE = '#1C7ED6';
const GOLD = '#FFD43B';

/**
 * Format a raw numeric tick value for histogram x-axis.
 * Unlike `formatValueForDisplay`, this does NOT multiply by 100 for
 * percentage-unit fields — the bins are already aggregated values.
 */
function formatHistogramTick(value: number): string {
  if (!Number.isFinite(value)) return '';
  return value % 1 === 0 ? String(value) : value.toFixed(2);
}

/**
 * Compute the label position for the provider marker reference line
 * on a histogram, so the label doesn't clip at the edges.
 */
function getProviderLabelPosition(marker: number, data: ProviderChart['data'], dataKey: string) {
  const values = (data || []).map((r) => Number(r[dataKey])).filter(Number.isFinite);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = (max - min) || 1;
  const pct = (marker - min) / range;

  if (pct <= 0.1) return 'insideTopLeft' as const;
  if (pct >= 0.9) return 'insideTopRight' as const;
  return 'insideTop' as const;
}

/** Build chart series from the first data row's keys. */
function buildSeries(chart: ProviderChart) {
  if (!chart.data?.length) return [];
  return Object.keys(chart.data[0])
    .filter((k) => k !== chart.dataKey)
    .map((name, idx) => ({
      name,
      color: idx % 2 === 0 ? MANTINE_BLUE : GOLD,
      label: name,
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
 */
export function ProviderChartCard({
  cfg, chart, selectedProviderName, onRemove,
}: ProviderChartCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredRecommendedLine, setHoveredRecommendedLine] = useState(false);
  const chartKey = `${cfg.chartId}_${cfg.xAxisVar}`;
  const series = buildSeries(chart);

  return (
    <Card
      key={chartKey}
      p="md"
      shadow="sm"
      withBorder
      className={clsx(classes.gridItem, isHovered && classes.gridItemHovered)}
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
        {cfg.chartType === 'time-series-line' ? (
          <LineChart
            h={160}
            w="100%"
            data={chart.data}
            dataKey={chart.dataKey}
            orientation={chart.orientation}
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
              formatter: (value) => <span style={{ fontSize: 12 }}>{value}</span>,
            }}
            yAxisProps={{
              type: 'number',
              width: 20,
              domain: ['dataMin', 'dataMax'],
              tickFormatter: (value) => formatValueForDisplay(cfg.yAxisVar, value, cfg.aggregation, false),
            }}
            series={series}
            xAxisProps={{
              type: 'category',
              domain: ['dataMin', 'dataMax'],
              padding: { left: 10, right: 10 },
              tickFormatter: (value) => formatValueForDisplay(cfg.xAxisVar, value, cfg.aggregation, false),
            }}
            tooltipProps={{
              content: (props) => (
                <ProviderChartTooltip
                  active
                  payload={props.payload}
                  label={props.label}
                  xAxisVar={cfg.xAxisVar}
                  yAxisVar={cfg.yAxisVar}
                  aggregation={cfg.aggregation}
                />
              ),
            }}
          />
        ) : (
          <BarChart
            h={160}
            w="100%"
            data={chart.data}
            dataKey={chart.dataKey}
            orientation={chart.orientation}
            barChartProps={{
              margin: {
                top: 30, right: 25, bottom: 15, left: 25,
              },
            }}
            yAxisProps={{ width: 20 }}
            barProps={{ radius: 5 }}
            series={series}
            xAxisProps={{
              type: 'number',
              domain: ['dataMin', 'dataMax'],
              padding: { left: 10, right: 10 },
              tickFormatter: formatHistogramTick,
            }}
            tooltipProps={{
              content: (props) => (
                <ProviderChartTooltip
                  active
                  payload={props.payload}
                  label={props.label}
                  xAxisVar={cfg.xAxisVar}
                  yAxisVar={cfg.yAxisVar}
                  aggregation={cfg.aggregation}
                />
              ),
            }}
          >
            {/* Provider marker reference line */}
            <ReferenceLine
              yAxisId="left"
              x={chart.providerMark}
              ifOverflow="visible"
              stroke="#4a4a4a"
              label={{
                value: selectedProviderName ?? 'Provider',
                fill: '#4a4a4a',
                position: getProviderLabelPosition(
                  Number(chart.providerMark) || 0,
                  chart.data,
                  chart.dataKey,
                ),
                offset: -25,
                fontSize: 12,
              }}
            />
            {/* Recommended mark — visible dashed line */}
            <ReferenceLine
              yAxisId="left"
              x={Number(chart.recommendedMark)}
              ifOverflow="visible"
              stroke="#82ca9d"
              strokeDasharray="3 3"
            />
            {/* Invisible hitbox for recommended mark hover label */}
            <ReferenceLine
              yAxisId="left"
              x={Number(chart.recommendedMark)}
              ifOverflow="visible"
              stroke="transparent"
              strokeWidth={8}
              style={{ pointerEvents: 'stroke', cursor: 'pointer', zIndex: 9999 }}
              onMouseEnter={() => setHoveredRecommendedLine(true)}
              onMouseLeave={() => setHoveredRecommendedLine(false)}
              label={hoveredRecommendedLine ? {
                value: 'Recommended',
                position: 'bottom',
                fill: '#2f9e44',
                fontSize: 12,
                style: { zIndex: 9999 },
              } : undefined}
            />
          </BarChart>
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
