import React, {
  useContext, useEffect, useState, useMemo, useRef, CSSProperties,
  useCallback,
} from 'react';
import { area, curveCatmullRom } from 'd3-shape';
import { scaleLinear, scaleLog } from 'd3-scale';
import { max as d3Max, ticks as d3Ticks } from 'd3-array';
import { interpolateReds } from 'd3';
import { observer, useLocalObservable } from 'mobx-react-lite';
import {
  MultiSelect,
  CloseButton,
  Flex,
  Title,
  Stack,
  ActionIcon,
  Box,
  Tooltip,
  TextInput,
  Select,
  Text,
  LoadingOverlay,
  Loader,
} from '@mantine/core';
import {
  IconGripVertical, IconMathGreater, IconMathLower, IconPercentage, IconColumns3, IconCircles,
} from '@tabler/icons-react';
import {
  DataTable, DataTableColumn, useDataTableColumns, type DataTableSortStatus,
} from 'mantine-datatable';
import { BarChart } from '@mantine/charts';

import { Store } from '../../../../Store/Store';
import { kernelEpanechnikov, kernelDensityEstimator } from '../../../../Utils/d3Utils';
import {
  ExploreTableRow, ExploreTableData, ExploreTableConfig, ExploreTableColumn, ExploreTableColumnOptions, ExploreTableColumnOptionsGrouped, ExploreTableRowOptions, ExploreTableGroupByOptions,
} from '../../../../Types/application';
import { backgroundHoverColor, smallHoverColor } from '../../../../Theme/mantineTheme';
import './ExploreTable.css';

// Types
type NumericFilter = { query: string; cmp: '>' | '<' };
type HoveredValue = { col: string; value: number } | null;
type HistogramBin = { binMin: number; binMax: number; count: number };
type SetHoveredValue = (val: HoveredValue) => void;

const ROW_H_GROUPED = 60;
const SUB_ROW_H = 26;
const ROW_GAP = 12;

const GROUP_COLORS = ['#D81B60', '#1E88E5', '#40c057', '#fd7e14', '#be4bdb', '#1098ad', '#868e96'];

export const getGroupColor = (groupByVar: string | undefined, groupVal: string, index: number) => {
  if (!groupByVar) return GROUP_COLORS[index % GROUP_COLORS.length];

  const outcomes = ['death', 'stroke', 'vent', 'ecmo'];
  const nonOutcomes = ['b12', 'iron', 'antifibrinolytic'];

  if (outcomes.includes(groupByVar)) {
    if (groupVal === '1' || groupVal === 'true') return '#D81B60'; // Red
    if (groupVal === '0' || groupVal === 'false') return '#1E88E5'; // Blue
  }

  if (nonOutcomes.includes(groupByVar)) {
    if (groupVal === '1' || groupVal === 'true') return '#762A83'; // Purple
    if (groupVal === '0' || groupVal === 'false') return '#0d9488'; // Darker Teal
  }

  return GROUP_COLORS[index % GROUP_COLORS.length];
};

export const getGroupLabel = (groupByVar: string | undefined, val: string) => {
  if (!groupByVar) return val;
  if (['death', 'stroke', 'vent', 'ecmo', 'b12', 'iron', 'antifibrinolytic'].includes(groupByVar)) {
    const label = ExploreTableGroupByOptions.find((o) => o.value === groupByVar)?.label || val;
    if (val === '1' || val === 'true') return label;
    return `No ${label}`;
  }
  return val;
};

function ExploreTableLegend({
  groupByVar,
  groupValues,
  hoveredLegendGroup,
  setHoveredLegendGroup,
  selectedLegendGroup,
  setSelectedLegendGroup,
}: {
  groupByVar?: string;
  groupValues: string[];
  hoveredLegendGroup: string | null;
  setHoveredLegendGroup: (v: string | null) => void;
  selectedLegendGroup: string | null;
  setSelectedLegendGroup: (v: string | null) => void;
}) {
  if (!groupByVar) return null;
  if (groupValues.length === 0) return null;

  return (
    <Flex gap={12} align="center" mr={16}>
      {groupValues.map((v, i) => {
        const isDimmed = (selectedLegendGroup !== null && selectedLegendGroup !== v) || (hoveredLegendGroup !== null && hoveredLegendGroup !== v && selectedLegendGroup === null);
        return (
          <Flex
            key={v}
            align="center"
            gap={4}
            style={{
              cursor: 'pointer',
              opacity: isDimmed ? 0.25 : 1,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={() => setHoveredLegendGroup(v)}
            onMouseLeave={() => setHoveredLegendGroup(null)}
            onClick={() => {
              if (selectedLegendGroup === v) {
                setSelectedLegendGroup(null);
              } else {
                setSelectedLegendGroup(v);
              }
            }}
          >
            <Box w={8} h={8} style={{ borderRadius: '50%', background: getGroupColor(groupByVar, v, i) }} />
            <Text size="xs" fw={500} c="dimmed" style={{ whiteSpace: 'nowrap' }}>{getGroupLabel(groupByVar, v)}</Text>
          </Flex>
        );
      })}
    </Flex>
  );
}

// Helper to get decimals
const getDecimals = (colVar: string, agg: string = 'sum'): number => {
  const option = ExploreTableColumnOptions.find((opt) => opt.value === colVar);
  if (!option || option.decimals === undefined) return 0;
  if (typeof option.decimals === 'number') return option.decimals;
  const key = (agg === 'avg') ? 'avg' : 'sum';
  return option.decimals[key] ?? 0;
};

// Helper to clean up display values
const getFormattedValue = (
  value: number | null | undefined,
  colVar: string,
  agg: string = 'sum',
  isTooltip: boolean = false,
): string => {
  if (value === null || value === undefined) return '-';

  const unitConfig = ExploreTableColumnOptions.find((opt) => opt.value === colVar)?.units;
  const aggKey = (agg === 'avg') ? 'avg' : 'sum';
  const shortKey = (agg === 'avg') ? 'avgShort' : 'sumShort';

  const targetKey = isTooltip ? aggKey : shortKey;
  const fallbackKey = isTooltip ? shortKey : aggKey;

  const unitString = unitConfig?.[targetKey] ?? unitConfig?.[fallbackKey] ?? '';
  const resolvedType = unitConfig?.type ?? 'suffix';

  const prefix = resolvedType === 'prefix' ? unitString : '';
  const suffix = resolvedType === 'suffix' ? unitString : '';

  const decimals = getDecimals(colVar, agg);
  const formattedValue = Number(value).toFixed(decimals);

  const space = (suffix && !suffix.startsWith(' ') && !suffix.trim().startsWith('%')) ? ' ' : '';

  return `${prefix}${formattedValue}${space}${suffix}`;
};

const HEATMAP_COLS = ['percent_0_rbc', 'percent_1_rbc', 'percent_2_rbc', 'percent_3_rbc', 'percent_4_rbc', 'percent_above_5_rbc'];

// When adding column, infer column type from attribute
const inferColumnType = (key: string, data: ExploreTableData): ExploreTableColumn['type'] => {
  // Always treat year and quarter as text
  if (['year', 'quarter', 'attending_provider'].includes(key)) {
    return 'text';
  }

  // DRG weight always renders as violin
  if (key === 'drg_weight') {
    return 'violin';
  }

  const sample = data[0]?.[key];

  if (typeof sample !== 'string') {
    if (HEATMAP_COLS.includes(key)) {
      return 'heatmap';
    }
    return 'numeric';
  }
  return 'text';
};

// ---------- DRG Violin helpers ----------

function computeMedian(arr: number[]) {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function ViolinCell({
  samples: rawSamples, domain, height = 25, padding = 0, groupFilter,
}: { samples: number[] | Iterable<number>; domain?: [number, number]; height?: number; padding?: number; groupFilter?: { label: string; color: string } }) {
  const internalWidth = 120;

  // Normalize to a plain number[] — DuckDB list() may return typed arrays or proxy objects
  const samples: number[] = rawSamples ? Array.from(rawSamples, Number) : [];

  if (samples.length === 0) {
    return (
      <Tooltip
        label={groupFilter ? (
          <Stack gap={4} align="center">
            <Text size="sm">No data</Text>
            <Text size="xs" fs="italic" c={groupFilter.color}>
              (Filter:
              {' '}
              {groupFilter.label}
              )
            </Text>
          </Stack>
        ) : 'No data'}
        withArrow
        position="top"
      >
        <div style={{
          width: '100%', height, display: 'flex', alignItems: 'center',
        }}
        >
          <div style={{
            width: '30%', height: 6, background: '#ddd', margin: '0 auto', borderRadius: 3,
          }}
          />
        </div>
      </Tooltip>
    );
  }

  // Use reduce instead of Math.min/max(...spread) to avoid call-stack overflow on large arrays
  const sampleMin = samples.reduce((a, b) => Math.min(a, b), Infinity);
  const sampleMax = samples.reduce((a, b) => Math.max(a, b), -Infinity);

  const domainMin = (domain && typeof domain[0] === 'number') ? domain[0] : sampleMin;
  const domainMax = (domain && typeof domain[1] === 'number') ? domain[1] : sampleMax;
  const ticks = 60;
  const centerY = height / 2;

  // Use log scale as MS-DRG weights are highly skewed
  const effectiveMin = Math.max(0.1, domainMin);
  const xScale = scaleLog().domain([effectiveMin, domainMax]).range([padding, internalWidth - padding]);

  const liner = d3Ticks(domainMin, domainMax, ticks);
  const domainRange = domainMax - domainMin;
  const bandwidth = Math.max(domainRange / 8, 1e-3);
  const kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), liner);
  const density = kde(samples);
  const maxDens = d3Max(density.map((d) => d[1])) ?? 1;

  const yDensityScale = scaleLinear().domain([0, maxDens]).range([0, ((height - padding * 2) / 2) * 0.85]);

  const path = area<[number, number]>()
    .x((d) => xScale(Math.max(effectiveMin, d[0])))
    .y0((d) => centerY - yDensityScale(d[1]))
    .y1((d) => centerY + yDensityScale(d[1]))
    .curve(curveCatmullRom);

  const d = path(density as [number, number][]) ?? '';

  const median = computeMedian(samples);

  const medianX = xScale(median);
  const medianHalfH = yDensityScale(maxDens);

  return (
    <Tooltip
      label={(
        <Stack gap={4} align="center">
          <Text size="sm">{`Min ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(sampleMin)} • Median ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(median)} • Max ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(sampleMax)}`}</Text>
          {groupFilter && (
            <Text size="xs" fs="italic" c={groupFilter.color}>
              (Filter:
              {' '}
              {groupFilter.label}
              )
            </Text>
          )}
        </Stack>
      )}
      position="top"
      withArrow
    >
      <div style={{
        width: '100%',
        height,
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      }}
      >
        <svg viewBox={`0 0 ${internalWidth} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden>
          <path d={d} fill="#a6a6a6" stroke="#8c8c8c" strokeWidth={1} opacity={0.95} />
        </svg>

        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: `${(medianX / internalWidth) * 100}%`,
            transform: 'translateX(-50%)',
            top: `${centerY - medianHalfH}px`,
            height: `${medianHalfH * 2}px`,
            width: 1,
            background: '#8c8c8c',
            opacity: 0.95,
            pointerEvents: 'none',
          }}
        />
      </div>
    </Tooltip>
  );
}
// ---------- end DRG Violin helpers ----------

// Helper function to sort rows
function sortRows<T>(data: T[], getter: (item: T) => string | number | boolean | null | undefined | object): T[] {
  return [...data].sort((a, b) => {
    const valueA = getter(a);
    const valueB = getter(b);

    // Null / Equal checks
    if (valueA === valueB) return 0;
    if (valueA === null || valueA === undefined) return 1;
    if (valueB === null || valueB === undefined) return -1;

    // Numeric Sort
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      if (valueA < valueB) return -1;
      if (valueA > valueB) return 1;
      return 0;
    }

    // String sort
    const strA = String(valueA);
    const strB = String(valueB);
    if (strA < strB) return -1;
    if (strA > strB) return 1;
    return 0;
  });
}

// Compute histogram bins for a given set of values
const computeHistogramBins = (values: number[], bins = 10): HistogramBin[] => {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return [{
      binMin: min,
      binMax: min + (min === 0 ? 1 : Math.abs(min) * 0.1), // Ensure non-zero range
      count: values.length,
    }];
  }

  const binSize = (max - min) / bins;

  const result: HistogramBin[] = Array.from({ length: bins }, (_, i) => ({
    binMin: min + i * binSize,
    binMax: min + (i + 1) * binSize,
    count: 0,
  }));

  values.forEach((v) => {
    // Special handling for the maximum value
    if (v === max) {
      result[bins - 1].count += 1;
    } else {
      const idx = Math.floor((v - min) / binSize);
      if (idx >= 0 && idx < bins) result[idx].count += 1;
    }
  });

  return result;
};

// Cost Savings Palette
// 1. Pale Sand (Lowest/Background, FFP)
// 2. Soft Orange (Low-mid, Platelets)
// 3. Vivid Orange (Median)
// 4. Classic Red (High-mid, RBCs)
// 5. Deep Maroon (Peak/Maximum, Cryo)
const chartColors = ['#fdf5e6', '#ffb366', '#fb7e07', '#d0021b', '#67000d'];

function NumericBarCell({
  value, max, colVar, opts = {}, setHoveredValue, agg, rowLabel, columnLabel,
}: {
  value: number | null | undefined;
  max: number;
  colVar: string;
  setHoveredValue: SetHoveredValue;
  opts?: { padding?: string; cellHeight?: number; fillColor?: string; isSavings?: boolean; groupFilter?: { label: string; color: string } };
  agg?: string;
  rowLabel?: string;
  columnLabel?: string;
}) {
  // Default Options
  const {
    cellHeight = 21,
    fillColor = opts?.isSavings ? '#ffd43b' : '#8c8c8c',
    padding = '1px 1px 1px 1px',
    isSavings = false,
  } = opts || {};

  const isMissing = value === null || value === undefined;

  // Calculate the bar width as a percentage (0-100) of the maximum value
  const barWidthPercent = !isMissing && Number.isFinite(max) && max > 0
    ? Math.max(0, Math.min(100, (Number(value) / max) * 100))
    : 0;

  // Amount to clip from the right side to show only the filled portion
  const clipRightAmount = `${Math.max(0, 100 - barWidthPercent)}%`;

  // The actual numeric value to display
  const textValue = getFormattedValue(value, colVar, agg, false);
  const tooltipTextValue = getFormattedValue(value, colVar, agg, true);

  const hasValue = !isMissing;

  return (
    <Tooltip
      label={(
        <Stack gap={2} align="center">
          {columnLabel && <Text size="xs" fw={600}>{hasValue ? `${columnLabel}: ${tooltipTextValue}` : columnLabel}</Text>}
          {!columnLabel && <Text size="sm">{hasValue ? tooltipTextValue : 'No data'}</Text>}
          {!hasValue && <Text size="xs" c="dimmed">No data</Text>}
          {rowLabel && <Text size="xs" c="dimmed" fs="italic">{rowLabel}</Text>}
          {opts?.groupFilter && (
            <Text size="xs" fs="italic" c={opts.groupFilter.color}>
              (Filter:
              {' '}
              {opts.groupFilter.label}
              )
            </Text>
          )}
        </Stack>
      )}
      position="top"
      withArrow
    >
      <div
        className="numeric-bar-cell"
        style={{
          padding,
        }}
        onMouseEnter={() => !isMissing && setHoveredValue({ col: colVar, value })}
        onMouseLeave={() => setHoveredValue(null)}
      >
        <div className="numeric-bar-cell-inner" style={{ height: cellHeight, position: 'relative' }}>
          {/* Black Text (Underlay for standard, Overlay for savings) */}
          <div
            aria-hidden
            className="numeric-bar-cell-text-container"
            style={{
              zIndex: isSavings ? 2 : 0, // Force on top for savings
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
          >
            <p className="numeric-bar-cell-text" style={{ lineHeight: `${cellHeight}px` }}>
              {textValue}
            </p>
          </div>

          {/* Bar fill */}
          <div
            className="bar-fill numeric-bar-cell-fill"
            style={{
              width: `${barWidthPercent}%`,
              background: fillColor,
              zIndex: 1, // Bar is above standard text (0) but below savings text (2)
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
            }}
          />

          {/* White Text Overlay (Clipped) - Standard only */}
          {!isSavings && (
            <div
              aria-hidden
              className="numeric-bar-cell-text-overlay"
              style={{
                clipPath: `inset(0 ${clipRightAmount} 0 0)`,
                WebkitClipPath: `inset(0 ${clipRightAmount} 0 0)`,
                zIndex: 3, // Highest z-index for the white clipped text
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            >
              <p className="numeric-bar-cell-text" style={{ lineHeight: `${cellHeight}px` }}>
                {textValue}
              </p>
            </div>
          )}
        </div>
      </div>
    </Tooltip>
  );
}

function StackedBarCell({
  row, max, colVar, agg, groupFilter, rowLabel, columnLabel,
}: {
  row: ExploreTableRow;
  max: number;
  colVar: string;
  agg?: string;
  groupFilter?: { label: string; color: string };
  rowLabel?: string;
  columnLabel?: string;
}) {
  const parts = [
    {
      key: 'rbc_cost', label: 'RBC Cost', value: Number(row.rbc_cost ?? 0), color: chartColors[3], // Classic Red
    },
    {
      key: 'ffp_cost', label: 'FFP Cost', value: Number(row.ffp_cost ?? 0), color: chartColors[0], // Pale Sand
    },
    {
      key: 'plt_cost', label: 'Platelets Cost', value: Number(row.plt_cost ?? 0), color: chartColors[1], // Soft Orange
    },
    {
      key: 'whole_cost', label: 'Whole Blood Cost', value: Number(row.whole_cost ?? 0), color: chartColors[2], // Vivid Orange
    },
    {
      key: 'cryo_cost', label: 'Cryo Cost', value: Number(row.cryo_cost ?? 0), color: chartColors[4], // Deep Maroon
    },
  ];

  const total = Number(row.total_cost ?? 0);
  const textValue = getFormattedValue(total, colVar, agg, false);
  const tooltipTextValue = getFormattedValue(total, colVar, agg, true);

  return (
    <Tooltip
      label={(
        <Stack gap={4}>
          {columnLabel && <Text fz="xs" fw={700}>{columnLabel}</Text>}
          {parts.map((p) => (
            <Flex key={p.key} align="center" gap={6}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color,
              }}
              />
              <Text fz="xs" style={{ whiteSpace: 'nowrap' }}>
                {p.label}
                {': '}
                {getFormattedValue(p.value, colVar, agg, true)}
              </Text>
            </Flex>
          ))}
          <Box pt={4} style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <Text fz="xs" fw={700}>
              {'Total: '}
              {tooltipTextValue}
            </Text>
          </Box>
          {rowLabel && (
            <Text size="xs" c="dimmed" fs="italic">{rowLabel}</Text>
          )}
          {groupFilter && (
            <Box pt={0} style={{ display: 'flex', justifyContent: 'center' }}>
              <Text size="xs" fs="italic" c={groupFilter.color} ta="center">
                (Filter:
                {' '}
                {groupFilter.label}
                )
              </Text>
            </Box>
          )}
        </Stack>
      )}
      position="top"
      withArrow
    >
      <div style={{
        display: 'flex', alignItems: 'center', width: '100%', height: 21, gap: 8,
      }}
      >
        <div style={{
          display: 'flex', width: `${(total / max) * 100}%`, height: 18, overflow: 'hidden', borderRadius: 2,
        }}
        >
          {parts.map((p) => {
            const w = total > 0 ? (p.value / total) * 100 : 0;
            return (
              <div
                key={p.key}
                style={{
                  width: `${w}%`,
                  minWidth: p.value > 0 ? 1 : 0,
                  background: p.color,
                  display: p.value > 0 ? 'block' : 'none',
                }}
              />
            );
          })}
        </div>
        <div style={{
          fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
        }}
        >
          {textValue}
        </div>
      </div>
    </Tooltip>
  );
}

// MARK: - Components

function NumericFilterInput({
  filterState, onChange,
}: {
  filterState: NumericFilter;
  onChange: (val: Partial<NumericFilter>) => void;
}) {
  return (
    <TextInput
      placeholder="Filter value"
      size="xs"
      value={filterState.query}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ query: e.currentTarget.value })}
      leftSection={(
        <ActionIcon
          size="xs"
          onClick={() => onChange({ cmp: filterState.cmp === '>' ? '<' : '>' })}
        >
          {filterState.cmp === '>' ? <IconMathGreater size={12} /> : <IconMathLower size={12} />}
        </ActionIcon>
      )}
    />
  );
}

const HistogramFooter = observer(({
  values, colVar, agg, colorScale: _colorScale, hoverState,
}: {
  values: number[];
  colVar: string;
  agg?: string;
  type?: string;
  colorScale?: (val: number) => string;
  hoverState: { current: HoveredValue };
}) => {
  if (values.length === 0) return null;
  const bins = computeHistogramBins(values, 10);

  const histogramMinVal = bins[0]?.binMin ?? 0;
  const histogramMaxVal = bins[bins.length - 1]?.binMax ?? 0;

  // Check if this column is hovered
  const hoveredValStr = hoverState.current;
  const isHoveredCol = hoveredValStr?.col === colVar;
  const hoveredVal = hoveredValStr?.value;

  // Base colors
  const baseColors = bins.map(() => '#8c8c8c');

  // Final colors
  const colors = (!isHoveredCol || hoveredVal === undefined)
    ? baseColors
    : bins.map((bin, i) => {
      const isMatch = hoveredVal >= bin.binMin && hoveredVal <= bin.binMax;
      return isMatch ? smallHoverColor : baseColors[i];
    });

  const data = [{
    bin: 'all',
    ...Object.fromEntries(bins.map((bin, i) => [`bin${i}`, bin.count])),
  }];
  const series = bins.map((_, i) => ({ name: `bin${i}`, color: colors[i] }));
  const themeColor = '#6f6f6f';

  return (
    <div className="histogram-footer-container">
      <BarChart
        data={data}
        series={series}
        w="calc(126%)"
        h={25}
        dataKey="bin"
        barChartProps={{ barGap: '0.5%' }}
        withXAxis={false}
        withYAxis={false}
        gridAxis="none"
        className="histogram-footer-chart"
        withTooltip={false}
      />
      <div className="histogram-footer-line" style={{ borderTop: '1px solid #6f6f6f' }} />
      <div className="histogram-footer-ticks">
        <div className="histogram-footer-tick-min" style={{ color: themeColor }}>
          {colVar ? histogramMinVal.toFixed(getDecimals(colVar, agg)) : histogramMinVal}
        </div>
        <div className="histogram-footer-tick-max" style={{ color: themeColor }}>
          {colVar ? histogramMaxVal.toFixed(getDecimals(colVar, agg)) : histogramMaxVal}
        </div>
      </div>
    </div>
  );
});

// MARK: - ExploreTable

const ExploreTable = observer(({ chartConfig }: { chartConfig: ExploreTableConfig }) => {
  const store = useContext(Store);
  const chartData = store.exploreChartData[chartConfig.chartId] as ExploreTableData;

  // Filters
  const defaultNumericFilter: NumericFilter = useMemo(() => ({ query: '', cmp: '>' }), []);
  const [numericFilters, setNumericFilters] = useState<Record<string, NumericFilter>>({});
  const [textFilters, setTextFilters] = useState<Record<string, string>>({});

  // Interaction
  const hoverState = useLocalObservable(() => ({ current: null as HoveredValue }));
  const setHoveredValue = useCallback((val: HoveredValue) => { hoverState.current = val; }, [hoverState]);
  const [hoveredLegendGroup, setHoveredLegendGroup] = useState<string | null>(null);
  const [selectedLegendGroup, setSelectedLegendGroup] = useState<string | null>(null);

  // Syncing layout state
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setIsSyncing(true);
    const timeout = setTimeout(() => setIsSyncing(false), 2000);
    return () => clearTimeout(timeout);
  }, [chartConfig.groupByVar]);

  useEffect(() => {
    if (isSyncing) {
      const timeout = setTimeout(() => setIsSyncing(false), 300);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [isSyncing, chartData]);

  // Reset legend selections when groupByVar changes
  useEffect(() => {
    setHoveredLegendGroup(null);
    setSelectedLegendGroup(null);
  }, [chartConfig.groupByVar]);

  const getSubRowOpacity = useCallback((gVal: string) => {
    if (selectedLegendGroup !== null) {
      return String(selectedLegendGroup) === String(gVal) ? 1 : 0.25;
    }
    if (hoveredLegendGroup !== null) {
      return String(hoveredLegendGroup) === String(gVal) ? 1 : 0.25;
    }
    return 1;
  }, [hoveredLegendGroup, selectedLegendGroup]);

  // Sorting
  const defaultSortCol = chartConfig.columns[0]?.colVar || 'surgeon_prov_id';
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ExploreTableRow>>({
    columnAccessor: defaultSortCol,
    direction: 'asc',
  });

  // Apply filters and sorting ---
  const rows = useMemo(() => {
    if (!chartData || !Array.isArray(chartData)) {
      return [];
    }
    // Filter ---
    const filteredData = chartData.filter((row) => {
      // Text Filters
      const matchesText = (Object.entries(textFilters) as [string, string][]).every(([key, query]) => {
        const val = String(row[key] ?? '').toLowerCase();
        return val.includes(query.toLowerCase());
      });
      if (!matchesText) return false;

      // Numeric Filters
      const matchesNumeric = (Object.entries(numericFilters) as [string, NumericFilter][]).every(([key, filter]) => {
        const { query, cmp } = filter;
        if (!query) return true;
        const threshold = Number(query);
        const rawVal = row[key];
        const values = Array.isArray(rawVal) ? rawVal : [rawVal];

        return values.some((v) => {
          const n = Number(v);
          return cmp === '>' ? n > threshold : n < threshold;
        });
      });
      return matchesNumeric;
    });

    // Sort ---
    const accessor = sortStatus.columnAccessor as keyof ExploreTableRow;

    const getSortValue = (row: ExploreTableRow) => {
      const val = row[accessor];

      if (chartConfig.twoValsPerRow && Array.isArray(val) && typeof val[0] === 'number') {
        return (val as number[]).reduce((sum, n) => sum + n, 0);
      }

      // Check column config to see if we should force numeric sort or handle violin
      const colConfig = chartConfig.columns.find((c) => c.colVar === accessor);
      if (colConfig?.type === 'violin') {
        const raw = row[accessor];
        const samples = raw ? Array.from(raw as Iterable<number>, Number) : [];
        return computeMedian(samples);
      }
      if (colConfig?.type === 'numeric' || colConfig?.type === 'heatmap') {
        if (val === null || val === undefined) return val;
        // Force conversion to number for sorting
        return Number(val);
      }

      return val;
    };

    const sorted = sortRows(filteredData, getSortValue);
    return sortStatus.direction === 'desc' ? sorted.reverse() : sorted;
  }, [
    sortStatus,
    chartData,
    textFilters,
    numericFilters,
    chartConfig.twoValsPerRow,
    chartConfig.columns,
  ]);

  // Derive unique group values from data for both Legend and columns
  const groupValues = useMemo(() => {
    const { groupByVar } = chartConfig;
    if (!groupByVar) return [];
    const values = new Set<string>();
    rows.forEach((r) => {
      if (r._groups) {
        r._groups.forEach((g) => {
          const val = g._group_val;
          if (val !== undefined && val !== null && val !== '') {
            values.add(String(val));
          }
        });
      }
    });

    // Filter noise for boolean vars: keep only '0' and '1' or 'true' and 'false'
    let result = Array.from(values);
    if (groupByVar && ['death', 'stroke', 'vent', 'ecmo', 'b12', 'iron', 'antifibrinolytic'].includes(groupByVar)) {
      result = result.filter((v) => ['0', '1', 'true', 'false'].includes(v));
    }
    return result.sort().reverse(); // Show '1'/'true' on top, '0'/'false' on bottom
  }, [rows, chartConfig]);

  // Precompute filtered+sorted groups per row so column renderers don't repeat this work per cell
  const getFilteredGroups = useCallback((row: ExploreTableRow): ExploreTableRow[] => {
    if (!row._groups || row._groups.length === 0) return [];
    return row._groups
      .filter((g) => g._group_val !== undefined && g._group_val !== null && g._group_val !== '' && groupValues.includes(String(g._group_val)))
      .sort((a, b) => String(b._group_val).localeCompare(String(a._group_val)));
  }, [groupValues]);

  const buildGroupFilter = useCallback((filterValue: string, index: number) => ({
    label: getGroupLabel(chartConfig.groupByVar, filterValue),
    color: getGroupColor(chartConfig.groupByVar, filterValue, groupValues.indexOf(filterValue) !== -1 ? groupValues.indexOf(filterValue) : index),
  }), [chartConfig.groupByVar, groupValues]);

  // Cache filtered groups on each row so it's computed once per row instead of once per cell
  const rowsWithGroups = useMemo(() => {
    if (!chartConfig.groupByVar) return rows;
    return rows.map((row) => ({
      ...row,
      _filteredGroups: getFilteredGroups(row),
    }));
  }, [rows, chartConfig.groupByVar, getFilteredGroups]);

  const handleRowChange = (value: string | null) => {
    if (!value) return;

    const rowOptions = ExploreTableRowOptions.map((o) => o.value);
    // Keep the column if it's NOT a row option OR if it matches the NEW value
    let newColumns = chartConfig.columns.filter((c) => !rowOptions.includes(c.colVar) || c.colVar === value);

    // Ensure the new row variable is included as a column
    const isRowVarPresent = newColumns.some((c) => c.colVar === value);
    if (!isRowVarPresent) {
      const selectedOption = ExploreTableColumnOptions.find((o) => o.value === value);
      if (selectedOption) {
        // Create new column config
        const newCol: ExploreTableColumn = {
          colVar: selectedOption.value,
          aggregation: 'none', // Usually the grouping column shouldn't be aggregated or it's implicitly grouped
          type: inferColumnType(selectedOption.value, chartData),
          title: selectedOption.label,
        };
        // Prepend to columns
        newColumns = [newCol, ...newColumns];
      }
    }

    // Generate new title
    const groupLabel = ExploreTableRowOptions.find((o) => o.value === value)?.label || value;
    const aggLabel = chartConfig.aggregation === 'avg' ? 'Average' : 'Total';
    const newTitle = `${aggLabel} RBC Transfusions per ${groupLabel}`;

    let { groupByVar } = chartConfig;
    if (['year', 'quarter'].includes(value) && groupByVar === 'year') {
      groupByVar = undefined;
    }

    const updatedConfig: ExploreTableConfig = {
      ...chartConfig,
      rowVar: value,
      columns: newColumns,
      title: newTitle,
      groupByVar,
    };
    store.updateExploreChartConfig(updatedConfig);

    // If the new row variable is year or quarter, sort by it chronologically
    if (['year', 'quarter'].includes(value)) {
      setSortStatus({
        columnAccessor: value,
        direction: 'asc',
      });
    }
  };

  // Available columns for the multi-select (excludes the row variable)
  const availableColumnOptions = useMemo(() => {
    const rowOptions = ExploreTableRowOptions.map((o) => o.value);
    return ExploreTableColumnOptionsGrouped.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (rowOptions.includes(item.value)) {
          return item.value === chartConfig.rowVar;
        }
        return true;
      }),
    })).filter((group) => group.items.length > 0);
  }, [chartConfig.rowVar]);

  const handleColumnsChange = (newColValues: string[]) => {
    const currentCols = chartConfig.columns;
    const currentColVars = currentCols.map((c) => c.colVar);
    const selectedColValues = newColValues.includes(chartConfig.rowVar)
      ? newColValues
      : [chartConfig.rowVar, ...newColValues];

    // Identify added & prev columns
    const addedColVars = selectedColValues.filter((v) => !currentColVars.includes(v));
    const prevCols = currentCols.filter((c) => selectedColValues.includes(c.colVar));

    // Create objects for added columns
    const addedCols: ExploreTableColumn[] = [];
    addedColVars.forEach((v) => {
      const selected = ExploreTableColumnOptions.find((o) => o.value === v);
      if (!selected) return;

      addedCols.push({
        colVar: selected.value,
        aggregation: selected.value === chartConfig.rowVar
          ? 'none'
          : (chartConfig.aggregation ?? 'sum'),
        type: inferColumnType(selected.value, chartData),
        title: selected.label,
      });
    });

    // Add new cols to prev columns
    const newCols = [...addedCols, ...prevCols];

    // Update this chart's configuration with the new columns
    const updatedConfig: ExploreTableConfig = {
      ...chartConfig,
      columns: newCols,
    };
    store.updateExploreChartConfig(updatedConfig);
  };

  // Definitions of columns (their styles and values)
  const generateColumnDefs = useCallback((colConfigs: ExploreTableColumn[]): DataTableColumn<ExploreTableRow>[] => {
    // Compute global min/max for heatmap columns to normalize colors
    let heatmapMin = Infinity;
    let heatmapMax = -Infinity;
    const heatmapCols = colConfigs.filter((c) => c.type === 'heatmap');

    if (heatmapCols.length > 0) {
      rowsWithGroups.forEach((r: ExploreTableRow) => {
        heatmapCols.forEach((c) => {
          const val = r[c.colVar];
          const values = Array.isArray(val) ? val : [val];
          values.forEach((v) => {
            const n = Number(v ?? 0);
            if (n < heatmapMin) heatmapMin = n;
            if (n > heatmapMax) heatmapMax = n;
          });
        });
      });
    }

    if (heatmapMin === Infinity) heatmapMin = 0;
    if (heatmapMax === -Infinity) heatmapMax = 100;
    if (heatmapMin === heatmapMax) heatmapMax = heatmapMin + 1;

    // specific helpers
    const getNormalizedValue = (val: number) => {
      if (heatmapMax === heatmapMin) return 0;
      return Math.max(0, Math.min(1, (val - heatmapMin) / (heatmapMax - heatmapMin)));
    };
    const getHeatmapColor = (val: number) => interpolateReds(getNormalizedValue(val));

    const resultColumns = colConfigs.map((colConfig) => {
      const {
        colVar, type, title, numericTextVisible, aggregation: agg,
      } = colConfig;

      // Extract values for footer
      const rawValues = rowsWithGroups.map((r: ExploreTableRow) => r[colVar]);
      const values = chartConfig.twoValsPerRow
        ? rawValues.flat().map((v: unknown) => Number(v ?? 0))
        : rawValues.map((r: unknown) => Number(r ?? 0));
      const maxVal = values.length ? Math.max(...values) : 0;

      // Compute violin aggregate for footer when violin columns exist
      const violinAggregate = (() => {
        if (type !== 'violin') return null;
        const perRow = rowsWithGroups.map((r: ExploreTableRow) => {
          const raw = r[colVar];
          return raw ? Array.from(raw as Iterable<number>, Number) : [] as number[];
        });
        const allSamples = perRow.flat();
        if (allSamples.length === 0) return { samples: [] as number[], minAll: 0, maxAll: 0 };
        const minAll = allSamples.reduce((a, b) => Math.min(a, b), Infinity);
        const maxAll = allSamples.reduce((a, b) => Math.max(a, b), -Infinity);

        // Downsample for footer violin to avoid flat-line KDE on massive arrays
        const maxFooterSamples = 2000;
        let footerSamples = allSamples;
        if (allSamples.length > maxFooterSamples) {
          const step = allSamples.length / maxFooterSamples;
          footerSamples = Array.from({ length: maxFooterSamples }, (_, i) => allSamples[Math.floor(i * step)]);
        }
        return { samples: footerSamples, minAll, maxAll };
      })();

      // Filter component
      const filterComponent = (type === 'numeric' || type === 'heatmap') ? (
        <NumericFilterInput
          filterState={numericFilters[colVar] ?? defaultNumericFilter}
          onChange={(newVal) => setNumericFilters((prev: Record<string, NumericFilter>) => ({
            ...prev,
            [colVar]: { ...prev[colVar] ?? defaultNumericFilter, ...newVal },
          }))}
        />
      ) : type === 'violin' ? (
        <NumericFilterInput
          filterState={numericFilters[colVar] ?? defaultNumericFilter}
          onChange={(newVal) => setNumericFilters((prev: Record<string, NumericFilter>) => ({
            ...prev,
            [colVar]: { ...prev[colVar] ?? defaultNumericFilter, ...newVal },
          }))}
        />
      ) : (
        <TextInput
          placeholder="Search ..."
          size="xs"
          value={textFilters[colVar] ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTextFilters((prev: Record<string, string>) => ({ ...prev, [colVar]: e.currentTarget.value }))}
        />
      );

      // Violin footer
      const violinFooter = (type === 'violin' && violinAggregate) ? (
        <div style={{
          display: 'flex', justifyContent: 'center', paddingTop: 0, paddingBottom: 0,
        }}
        >
          <div style={{
            width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
          }}
          >
            <div style={{ width: '100%' }}>
              <ViolinCell samples={violinAggregate.samples} domain={[violinAggregate.minAll, violinAggregate.maxAll]} height={24} padding={0} />
            </div>
            <div style={{ width: '100%', marginTop: 2 }}>
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                  fontSize: 10,
                  fontWeight: 600,
                  opacity: 0.7,
                }}
              >
                <div style={{ paddingLeft: 4, color: '#6f6f6f' }}>{violinAggregate.minAll.toFixed(2)}</div>
                <div style={{ paddingRight: 4, color: '#6f6f6f' }}>{violinAggregate.maxAll.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      ) : undefined;

      let displayTitle = title;
      if (colVar === 'total_cost') {
        const titleMap: Record<string, string> = { sum: 'Total Cost', avg: 'Average Cost per Visit' };
        if (agg && titleMap[agg]) displayTitle = titleMap[agg];
      }
      if (colVar === 'salvage_savings') {
        const titleMap: Record<string, string> = { sum: 'Total Savings from Cell Salvage', avg: 'Savings from Cell Salvage per Visit' };
        if (agg && titleMap[agg]) displayTitle = titleMap[agg];
      }

      // Base column definition
      const column: DataTableColumn<ExploreTableRow> = {
        accessor: colVar,
        title: displayTitle,
        draggable: colVar !== 'cases' && !(colConfigs.filter((c) => c.type === 'text').length === 1 && colConfigs[0].colVar === colVar),
        resizable: false,
        sortable: true,
        noWrap: true,
        width: colVar === 'cases' ? 90 : colVar === 'salvage_savings' ? 250 : colVar === 'total_cost' ? 400 : (colVar === 'attending_provider' || (colConfigs.filter((c) => c.type === 'text').length === 1 && colConfigs[0].colVar === colVar)) ? 175 : undefined,
        filter: filterComponent,
        footer: type === 'violin' ? violinFooter : (type === 'numeric' || type === 'heatmap') ? (
          <HistogramFooter
            values={values}
            colVar={colVar}
            agg={agg}
            type={type}
            colorScale={type === 'heatmap' ? getHeatmapColor : undefined}
            hoverState={hoverState}
          />
        ) : undefined,
      };

      // Custom Render Logic
      if (type === 'stackedBar') {
        column.render = (row: ExploreTableRow) => {
          const rowLabel = String(row[chartConfig.rowVar] ?? '');
          const filteredGroups = (row._filteredGroups ?? []) as ExploreTableRow[];
          if (filteredGroups.length > 0) {
            return (
              <Stack gap={0} px={0} py={ROW_GAP / 2} h={Math.max(ROW_H_GROUPED, filteredGroups.length * SUB_ROW_H) + ROW_GAP} justify="center">
                {filteredGroups.map((g, i) => {
                  const filterValue = String(g._group_val);
                  const groupFilter = buildGroupFilter(filterValue, i);
                  return (
                    <Box key={i} h={SUB_ROW_H} display="flex" style={{ alignItems: 'center', opacity: getSubRowOpacity(filterValue), transition: 'opacity 0.2s' }}>
                      <StackedBarCell row={g} max={maxVal} colVar={colVar} agg={agg} groupFilter={groupFilter} rowLabel={rowLabel} columnLabel={displayTitle} />
                    </Box>
                  );
                })}
              </Stack>
            );
          }
          return <StackedBarCell row={row} max={maxVal} colVar={colVar} agg={agg} rowLabel={rowLabel} columnLabel={displayTitle} />;
        };
      } else if (type === 'numericBar') {
        column.render = (row: ExploreTableRow) => {
          const rowLabel = String(row[chartConfig.rowVar] ?? '');
          const filteredGroups = (row._filteredGroups ?? []) as ExploreTableRow[];
          if (filteredGroups.length > 0) {
            return (
              <Stack gap={0} px={0} py={ROW_GAP / 2} h={Math.max(ROW_H_GROUPED, filteredGroups.length * SUB_ROW_H) + ROW_GAP} justify="center">
                {filteredGroups.map((g, i) => {
                  const filterValue = String(g._group_val);
                  const groupFilter = buildGroupFilter(filterValue, i);
                  return (
                    <Box key={i} h={SUB_ROW_H} display="flex" style={{ alignItems: 'center', opacity: getSubRowOpacity(filterValue), transition: 'opacity 0.2s' }}>
                      <NumericBarCell
                        value={Number(g[colVar] ?? 0)}
                        max={maxVal}
                        colVar={colVar}
                        setHoveredValue={setHoveredValue}
                        agg={agg}
                        opts={{ isSavings: colVar === 'salvage_savings', cellHeight: 22, groupFilter }}
                        rowLabel={rowLabel}
                        columnLabel={displayTitle}
                      />
                    </Box>
                  );
                })}
              </Stack>
            );
          }
          const val = Number(row[colVar]);
          return (
            <NumericBarCell
              value={val}
              max={maxVal}
              colVar={colVar}
              setHoveredValue={setHoveredValue}
              agg={agg}
              opts={{ isSavings: colVar === 'salvage_savings' }}
              rowLabel={rowLabel}
              columnLabel={displayTitle}
            />
          );
        };
      } else if (type === 'heatmap') {
        column.render = (row: ExploreTableRow) => {
          const rowLabel = String(row[chartConfig.rowVar] ?? '');
          const renderHeatmapCell = (val: number, padding: string, height: number | string = '100%', groupFilter?: { label: string; color: string }) => {
            const normalizedVal = getNormalizedValue(val);
            const textVal = getFormattedValue(val, colVar, agg, false);
            const tooltipText = getFormattedValue(val, colVar, agg, true);

            const tooltipContent = (
              <Stack gap={2} align="center">
                {val === 0
                  ? <Text size="xs" fw={600}>{displayTitle}</Text>
                  : <Text size="xs" fw={600}>{`${displayTitle}: ${tooltipText}`}</Text>}
                {val === 0 && <Text size="xs" c="dimmed">No data</Text>}
                {rowLabel && <Text size="xs" c="dimmed" fs="italic">{rowLabel}</Text>}
                {groupFilter && (
                  <Text size="xs" fs="italic" c={groupFilter.color}>
                    (Filter:
                    {' '}
                    {groupFilter.label}
                    )
                  </Text>
                )}
              </Stack>
            );

            if (val === 0) {
              return (
                <Tooltip label={tooltipContent} withArrow position="top">
                  <div
                    onMouseEnter={() => setHoveredValue({ col: colVar, value: val })}
                    onMouseLeave={() => setHoveredValue(null)}
                    style={{
                      padding, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', height, color: '#8c8c8c',
                    }}
                  >
                    &mdash;
                  </div>
                </Tooltip>
              );
            }

            return (
              <Tooltip label={tooltipContent} withArrow position="top">
                <div
                  onMouseEnter={() => setHoveredValue({ col: colVar, value: val })}
                  onMouseLeave={() => setHoveredValue(null)}
                  style={{ padding, width: '100%', height }}
                >
                  <div
                    className="heatmap-cell"
                    data-visible={numericTextVisible}
                    style={{
                      backgroundColor: getHeatmapColor(val),
                      '--heatmap-text-color': normalizedVal > 0.5 ? 'white' : 'black',
                      height: '100%',
                    } as CSSProperties}
                  >
                    {textVal}
                  </div>
                </div>
              </Tooltip>
            );
          };

          const filteredGroups = (row._filteredGroups ?? []) as ExploreTableRow[];
          if (filteredGroups.length > 0) {
            return (
              <Stack gap={0} px={0} py={ROW_GAP / 2} h={Math.max(ROW_H_GROUPED, filteredGroups.length * SUB_ROW_H) + ROW_GAP} justify="center">
                {filteredGroups.map((g, i) => {
                  const filterValue = String(g._group_val);
                  const groupFilter = buildGroupFilter(filterValue, i);
                  return (
                    <Box key={i} h={SUB_ROW_H} style={{ opacity: getSubRowOpacity(filterValue), transition: 'opacity 0.2s' }}>
                      {renderHeatmapCell(Number(g[colVar] ?? 0), '0px', '100%', groupFilter)}
                    </Box>
                  );
                })}
              </Stack>
            );
          }

          if (chartConfig.twoValsPerRow) {
            const val = row[colVar] as [number, number] | undefined;
            return (
              <Stack gap={0} p={0} h={ROW_H_GROUPED}>
                <Box h={SUB_ROW_H}>{renderHeatmapCell(val?.[0] ?? 0, '1.5px 1px 0.5px 1px', '100%')}</Box>
                <Box h={SUB_ROW_H}>{renderHeatmapCell(val?.[1] ?? 0, '0.5px 1px 1.5px 1px', '100%')}</Box>
              </Stack>
            );
          }
          return renderHeatmapCell(Number(row[colVar] ?? 0), '1px 1px 1px 1px');
        };
      } else if (type === 'violin') {
        column.textAlign = 'center';
        column.render = (row: ExploreTableRow) => {
          const domain: [number, number] = violinAggregate
            ? [violinAggregate.minAll, violinAggregate.maxAll]
            : [0, 1];

          const filteredGroups = (row._filteredGroups ?? []) as ExploreTableRow[];
          if (filteredGroups.length > 0) {
            return (
              <Stack gap={0} px={0} py={ROW_GAP / 2} h={Math.max(ROW_H_GROUPED, filteredGroups.length * SUB_ROW_H) + ROW_GAP} justify="center">
                {filteredGroups.map((g, i) => {
                  const raw = g[colVar];
                  const samples = raw ? Array.from(raw as Iterable<number>, Number) : [];
                  const filterValue = String(g._group_val);
                  const groupFilter = buildGroupFilter(filterValue, i);
                  return (
                    <Box key={i} h={SUB_ROW_H} display="flex" style={{ alignItems: 'center', opacity: getSubRowOpacity(filterValue), transition: 'opacity 0.2s' }}>
                      <ViolinCell samples={samples} domain={domain} height={22} padding={0} groupFilter={groupFilter} />
                    </Box>
                  );
                })}
              </Stack>
            );
          }
          const raw = row[colVar];
          const samples = raw ? Array.from(raw as Iterable<number>, Number) : [];
          return <ViolinCell samples={samples} domain={domain} height={24} padding={0} />;
        };
      } else if (type === 'numeric') {
        column.render = (row: ExploreTableRow) => {
          const rowLabel = String(row[chartConfig.rowVar] ?? '');
          const filteredGroups = (row._filteredGroups ?? []) as ExploreTableRow[];
          if (filteredGroups.length > 0) {
            return (
              <Stack gap={0} px={0} py={ROW_GAP / 2} h={Math.max(ROW_H_GROUPED, filteredGroups.length * SUB_ROW_H) + ROW_GAP} justify="center">
                {filteredGroups.map((g, i) => {
                  const filterValue = String(g._group_val);
                  const groupFilter = buildGroupFilter(filterValue, i);
                  return (
                    <Box key={i} h={SUB_ROW_H} display="flex" style={{ alignItems: 'center', opacity: getSubRowOpacity(filterValue), transition: 'opacity 0.2s' }}>
                      <NumericBarCell
                        value={Number(g[colVar] ?? 0)}
                        max={maxVal}
                        colVar={colVar}
                        setHoveredValue={setHoveredValue}
                        agg={agg}
                        opts={{ cellHeight: 22, groupFilter }}
                        rowLabel={rowLabel}
                        columnLabel={displayTitle}
                      />
                    </Box>
                  );
                })}
              </Stack>
            );
          }
          if (chartConfig.twoValsPerRow) {
            const val = row[colVar] as [number, number] | undefined;
            return (
              <Stack gap={0} p={0} h={ROW_H_GROUPED}>
                <Box h={SUB_ROW_H} display="flex" style={{ alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10 }}>
                  <NumericBarCell value={val?.[0]} max={maxVal} colVar={colVar} opts={{ padding: '0px', cellHeight: 20 }} setHoveredValue={setHoveredValue} agg={agg} rowLabel={rowLabel} columnLabel={displayTitle} />
                </Box>
                <Box h={SUB_ROW_H} display="flex" style={{ alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10 }}>
                  <NumericBarCell value={val?.[1]} max={maxVal} colVar={colVar} opts={{ padding: '0px', cellHeight: 20 }} setHoveredValue={setHoveredValue} agg={agg} rowLabel={rowLabel} columnLabel={displayTitle} />
                </Box>
              </Stack>
            );
          }
          return <NumericBarCell value={row[colVar] as number} max={maxVal} colVar={colVar} setHoveredValue={setHoveredValue} agg={agg} rowLabel={rowLabel} columnLabel={displayTitle} />;
        };
      } else {
        column.render = (row: ExploreTableRow) => {
          const filteredGroups = (row._filteredGroups ?? []) as ExploreTableRow[];
          if (filteredGroups.length > 0) {
            return (
              <Box h={Math.max(ROW_H_GROUPED, filteredGroups.length * SUB_ROW_H) + ROW_GAP} py={ROW_GAP / 2} display="flex" style={{ alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10 }}>
                <div>{String(row[colVar] ?? '')}</div>
              </Box>
            );
          }
          return (
            <div style={{ marginRight: '10px', textAlign: 'right' }}>{String(row[colVar] ?? '')}</div>
          );
        };
      }

      return column;
    });

    if (chartConfig.groupByVar) {
      const groupOption = ExploreTableGroupByOptions.find((o) => o.value === chartConfig.groupByVar);

      resultColumns.unshift({
        accessor: '_group_val',
        title: groupOption?.label || 'Group',
        draggable: false,
        resizable: false,
        sortable: false,
        noWrap: true,
        width: 140,
        render: (row: ExploreTableRow) => {
          const filteredGroups = (row._filteredGroups ?? []) as ExploreTableRow[];
          if (filteredGroups.length > 0) {
            return (
              <Stack gap={0} px={0} py={ROW_GAP / 2} h={Math.max(ROW_H_GROUPED, filteredGroups.length * SUB_ROW_H) + ROW_GAP} justify="center" w="100%">
                {filteredGroups.map((g, i) => {
                  const val = String(g._group_val);
                  const colorIndex = groupValues.indexOf(val);
                  const color = getGroupColor(chartConfig.groupByVar, val, colorIndex !== -1 ? colorIndex : i);
                  return (
                    <Box
                      key={i}
                      h={SUB_ROW_H}
                      display="flex"
                      w="100%"
                      style={{
                        alignItems: 'center',
                        paddingLeft: 0,
                        paddingRight: 10,
                        gap: 12,
                        backgroundColor: `${color}1A`,
                        opacity: getSubRowOpacity(val),
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <svg width="6" height={SUB_ROW_H} viewBox={`0 0 6 ${SUB_ROW_H}`} style={{ flexShrink: 0 }}>
                        <polygon points={`0,0 6,${SUB_ROW_H / 2} 0,${SUB_ROW_H}`} fill={color} />
                      </svg>
                      <Text size="xs" fw={600} style={{ whiteSpace: 'nowrap', color }}>
                        {getGroupLabel(chartConfig.groupByVar, val)}
                      </Text>
                    </Box>
                  );
                })}
              </Stack>
            );
          }
          return null;
        },
      });
    }

    return resultColumns;
  }, [rowsWithGroups, chartConfig.twoValsPerRow, chartConfig.rowVar, numericFilters, defaultNumericFilter, textFilters, hoverState, setHoveredValue, chartConfig.groupByVar, getSubRowOpacity, buildGroupFilter, groupValues]);

  // Data Table Columns -------
  const columnDefs = useMemo(
    () => generateColumnDefs(chartConfig.columns),
    [generateColumnDefs, chartConfig.columns],
  );
  const { effectiveColumns, resetColumnsOrder } = useDataTableColumns<ExploreTableRow>({
    key: `ExploreTable-${chartConfig.chartId}`,
    columns: columnDefs,
  });

  // Reset column order when columns change
  const columnVars = `${chartConfig.columns.map((c) => c.colVar).join(',')}|${chartConfig.groupByVar || ''}`;
  const prevColumnVars = useRef(columnVars);

  useEffect(() => {
    if (columnVars !== prevColumnVars.current) {
      resetColumnsOrder();
      prevColumnVars.current = columnVars;
    }
  }, [columnVars, resetColumnsOrder]);

  // -------------------------------------------------------
  // Data Table -------
  return (
    <Stack style={{ height: '100%', width: '100%' }}>
      <Flex direction="row" justify="space-between" align="center" pl="md">
        <Flex direction="row" align="center" gap="md" ml={-12}>
          {/** Chart Grip */}
          <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
          {/** Chart Title */}
          <Title order={4}>{chartConfig.title}</Title>
        </Flex>

        <Flex direction="row" align="center" gap="sm">
          {/** Aggregation Toggle */}
          <ExploreTableLegend
            groupByVar={chartConfig.groupByVar}
            groupValues={groupValues}
            hoveredLegendGroup={hoveredLegendGroup}
            setHoveredLegendGroup={setHoveredLegendGroup}
            selectedLegendGroup={selectedLegendGroup}
            setSelectedLegendGroup={setSelectedLegendGroup}
          />
          <Tooltip label={`Change values to ${chartConfig.aggregation === 'sum' ? 'average' : 'sum'}`}>
            <ActionIcon
              variant="subtle"
              onClick={() => {
                const newAgg = chartConfig.aggregation === 'sum' ? 'avg' : 'sum';
                const newCols = chartConfig.columns.map((c) => ({
                  ...c,
                  aggregation: (c.type === 'text' || c.aggregation === 'none') ? c.aggregation : newAgg,
                }));

                store.updateExploreChartConfig({
                  ...chartConfig,
                  aggregation: newAgg,
                  columns: newCols,
                });
              }}
            >
              <IconPercentage size={18} />
            </ActionIcon>
          </Tooltip>
          {/** Group By Selection */}
          <Select
            leftSection={(
              <Tooltip label="Sub-group comparison" position="top" withArrow>
                <IconCircles size={18} style={{ opacity: 0.6 }} />
              </Tooltip>
            )}
            searchable
            placeholder="Group by"
            data={['year', 'quarter'].includes(chartConfig.rowVar) ? ExploreTableGroupByOptions.filter((o) => o.value !== 'year') : ExploreTableGroupByOptions}
            value={chartConfig.groupByVar || null}
            onChange={(val) => {
              store.updateExploreChartConfig({
                ...chartConfig,
                groupByVar: val || undefined,
              });
            }}
            w={140}
            clearable
          />
          {/** Row Selection */}
          <Select
            leftSection={(
              <Tooltip label="Row grouping variable" position="top" withArrow>
                <IconColumns3 size={18} style={{ transform: 'rotate(90deg)', opacity: 0.6 }} />
              </Tooltip>
            )}
            leftSectionWidth={40}
            data={ExploreTableRowOptions}
            value={chartConfig.rowVar}
            onChange={handleRowChange}
            allowDeselect={false}
            w={140}
          />
          {/** Add Column */}
          <MultiSelect
            leftSection={(
              <Flex gap={8} ml={8} align="center" style={{ whiteSpace: 'nowrap' }}>
                <Tooltip label="Measures for columns" position="top" withArrow>
                  <IconColumns3 size={18} style={{ opacity: 0.6 }} />
                </Tooltip>
                <Text size="sm">{`${chartConfig.columns.length} Selected`}</Text>
              </Flex>
            )}
            leftSectionWidth={100}
            searchable
            clearable={false}
            nothingFoundMessage="No options"
            data={availableColumnOptions}
            onChange={handleColumnsChange}
            value={chartConfig.columns.map((c) => c.colVar)}
            w={160}
            styles={{
              pill: { display: 'none' },
              input: { paddingLeft: 100 },
            }}
          />
          {/** Close Chart */}
          <CloseButton onClick={() => { store.removeExploreChart(chartConfig.chartId); }} />
        </Flex>
      </Flex>

      {/** Data Table */}
      <Box style={{ minHeight: 0, width: '100%', position: 'relative' }}>
        <LoadingOverlay
          visible={isSyncing}
          zIndex={100}
          overlayProps={{ radius: 'sm', blur: 3 }}
          loaderProps={{
            children: (
              <Stack align="center" gap={8} mt={100}>
                <Loader color="blue" size="md" />
                <Text size="sm" fw={600} c="dimmed">Restructuring table...</Text>
              </Stack>
            ),
          }}
        />
        <DataTable<ExploreTableRow>
          className="explore-table-data-table"
          rowClassName={() => (chartConfig.groupByVar ? 'fat-row' : '')}
          borderRadius="sm"
          pinFirstColumn
          striped
          withTableBorder={false}
          highlightOnHover
          withRowBorders={false}
          highlightOnHoverColor={backgroundHoverColor}
          records={rowsWithGroups}
          idAccessor="_row_key"
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          storeColumnsKey={`ExploreTable-${chartConfig.chartId}`}
          columns={effectiveColumns}
          style={useMemo(() => ({ fontStyle: 'italic' }), [])}
          onRowClick={undefined}
        />
      </Box>
    </Stack>
  );
});

export default ExploreTable;
