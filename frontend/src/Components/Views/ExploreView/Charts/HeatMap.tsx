import {
  useContext, useEffect, useState, useMemo,
} from 'react';
import {
  CloseButton,
  Flex,
  Title,
  Stack,
  ActionIcon,
  Box,
  Tooltip,
  TextInput,
  Text,
} from '@mantine/core';
import {
  IconGripVertical, IconPlus, IconSearch, IconX, IconMathGreater, IconMathLower,
} from '@tabler/icons-react';
import { DataTable, useDataTableColumns, type DataTableSortStatus } from 'mantine-datatable';
import sortBy from 'lodash/sortBy';
import { useDebouncedValue } from '@mantine/hooks';
import { BarChart, ChartTooltipProps } from '@mantine/charts';
import { interpolateReds } from 'd3';
import { area, curveCatmullRom } from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import { mean as d3Mean, max as d3Max } from 'd3-array';
import { Store } from '../../../../Store/Store';
import { ExploreChartConfig } from '../../../../Types/application';
import { backgroundHoverColor } from '../../../../Theme/mantineTheme';
import './HeatMap.css';
import { dummyData, Row } from './dummyData';

function FooterHistogramTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: 6,
      background: 'rgba(255,255,255,0.95)',
      borderRadius: 4,
      minWidth: 40,
      zIndex: 1000,
    }}
    >
      {payload.map((item: any) => (
        <Text key={item.name} style={{ lineHeight: 1 }} fz={10}>
          {item.name}
          :
          {item.value}
        </Text>
      ))}
    </div>
  );
}

// ---------- Violin helpers & small violin cell component ----------
function kernelEpanechnikov(k: number) {
  return function (v: number) {
    // Epanechnikov kernel
    v /= k;
    return Math.abs(v) <= 1 ? (0.75 * (1 - v * v)) / k : 0;
  };
}

function kernelDensityEstimator(kernel: (v: number) => number, X: number[]) {
  return function (V: number[]) {
    return X.map((x) => [x, d3Mean(V, (v) => kernel(x - v)) ?? 0] as [number, number]);
  };
}

function computeMedian(arr: number[]) {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// deterministic pseudo-random generator to make "fake" samples reproducible per-row
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeFakeSamplesForRow(row: Row, count = 40) {
  // base seed derived from surgeon name + cases so it's stable
  const seedStr = `${row.surgeon ?? ''}:${row.cases ?? 0}`;
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  const rnd = mulberry32(h);
  // produce samples in range ~[0.2 .. 1.8] scaled by cases (fake)
  const samples = new Array(count).fill(0).map(() => {
    // use a simple skewed distribution
    const v = rnd() ** 1.3 * 1.5 + 0.2 + (Number(row.cases ?? 0) % 5) * 0.05;
    return Math.round(v * 100) / 100;
  });
  return samples;
}

function ViolinCell({
  samples, domain, height = 25, padding = 0,
}: { samples: number[]; domain?: [number, number]; height?: number; padding?: number }) {
  const internalWidth = 120; // internal coordinate width for the svg path
  if (!samples || samples.length === 0) {
    return (
      <div style={{ width: '100%', height }}>
        <div style={{
          width: '30%', height: 6, background: '#ddd', margin: '0 auto', borderRadius: 3,
        }}
        />
      </div>
    );
  }

  const sampleMin = Math.min(...samples);
  const sampleMax = Math.max(...samples);

  // use provided global domain (for visual comparability) or fall back to per-sample domain
  const domainMin = (domain && typeof domain[0] === 'number') ? domain[0] : sampleMin;
  const domainMax = (domain && typeof domain[1] === 'number') ? domain[1] : sampleMax;
  // guard against zero-range domain
  const domainRange = Math.max(1e-6, domainMax - domainMin);

  const ticks = 20;
  // center line for horizontal violin (vertical center of svg)
  const centerY = height / 2;

  // x scale maps value to horizontal position inside svg (horizontal violin)
  // use internalWidth for path coordinate system; svg will stretch to fill cell
  const xScale = scaleLinear().domain([domainMin, domainMax]).range([padding, internalWidth - padding]);

  // compute density over domain values (use domain for the liner so all violins share same axis)
  const liner = Array.from({ length: ticks }).map((_, i) => domainMin + (i * domainRange) / Math.max(1, ticks - 1));
  // choose bandwidth relative to domain range (not per-sample range) for consistent smoothing
  const bandwidth = Math.max((domainRange) / 8, 1e-3);
  const kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), liner);
  const density = kde(samples);
  const maxDens = d3Max(density.map((d) => d[1])) ?? 1;

  // yDensityScale maps density -> vertical half-width of the violin
  const yDensityScale = scaleLinear().domain([0, maxDens]).range([0, (height - padding * 2) / 2 * 0.85]);

  // build a horizontal-area shape: x = value, y0 = center - dens, y1 = center + dens
  const path = area<[number, number]>()
    .x((d) => xScale(d[0]))
    .y0((d) => centerY - yDensityScale(d[1]))
    .y1((d) => centerY + yDensityScale(d[1]))
    .curve(curveCatmullRom);

  const d = path(density) ?? '';

  const median = (() => {
    const sorted = [...samples].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  })();

  // median x position and violin half-height for vertical line
  const medianX = xScale(median);
  const medianHalfH = yDensityScale(maxDens);

  return (
    <Tooltip
      label={`Min ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(sampleMin)} • Median ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(median)} • Max ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(sampleMax)}`}
      position="top"
      withArrow
    >
      <div style={{
        width: '100%',
        height,
        flex: 1,
        position: 'relative', // make a stacking context so we can overlay the median line as a DOM element
        display: 'flex',
        alignItems: 'center',
      }}
      >
        {/* svg uses a fixed internal coordinate width but stretches to fill the cell */}
        <svg viewBox={`0 0 ${internalWidth} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden>
          <path d={d} fill="#a6a6a6" stroke="#8c8c8c" strokeWidth={1} opacity={0.95} />
        </svg>

        {/* median line as a DOM overlay so it does not horizontally stretch with the SVG */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: `${(medianX / internalWidth) * 100}%`,
            transform: 'translateX(-50%)',
            top: `${centerY - medianHalfH}px`,
            height: `${medianHalfH * 2}px`,
            width: 1, // constant pixel width — does not scale with SVG
            background: '#8c8c8c',
            opacity: 0.95,
            pointerEvents: 'none',
          }}
        />
      </div>
    </Tooltip>
  );
}
// ---------- end violin helpers ----------

export default function HeatMap({ chartConfig }: { chartConfig: ExploreChartConfig }) {
  const store = useContext(Store);
  const [drgMedianQuery, setDrgMedianQuery] = useState('');
  const [debouncedDrgMedianQuery] = useDebouncedValue(drgMedianQuery, 200);

  // NEW: min / max DRG weight filters (strings so empty = no filter)
  const [drgMinQuery, setDrgMinQuery] = useState('');
  const [drgMaxQuery, setDrgMaxQuery] = useState('');
  const [debouncedDrgMinQuery, setDebouncedDrgMinQuery] = useDebouncedValue(drgMinQuery, 200);
  const [debouncedDrgMaxQuery, setDebouncedDrgMaxQuery] = useDebouncedValue(drgMaxQuery, 200);

  // NEW: comparator toggles for each input ('>' or '<')
  const [drgMinCmp, setDrgMinCmp] = useState<'>' | '<'>('>');
  const [drgMedianCmp, setDrgMedianCmp] = useState<'>' | '<'>('>');
  const [drgMaxCmp, setDrgMaxCmp] = useState<'>' | '<'>('<');

  // enable per-chart persistent column resizing / reordering
  const colKey = `heatmap-${chartConfig.chartId}`;
  const colProps = { resizable: true, draggable: true, toggleable: true };

  // sorting state + derived records (sort dummyData when sort status changes)
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Row>>({
    columnAccessor: 'surgeon',
    direction: 'asc',
  });

  // surgeon search state (debounced)
  const [surgeonQuery, setSurgeonQuery] = useState('');
  const [debouncedSurgeonQuery, setDebouncedSurgeonQuery] = useDebouncedValue(surgeonQuery, 200);
  const [_showSurgeonFilter, _setShowSurgeonFilter] = useState(false);

  const [records, setRecords] = useState<Row[]>(() => sortBy(dummyData, 'surgeon') as Row[]);

  useEffect(() => {
    // apply surgeon filter first
    let filtered = dummyData.filter((r) => (debouncedSurgeonQuery.trim() === ''
      ? true
      : String(r.surgeon).toLowerCase().includes(debouncedSurgeonQuery.trim().toLowerCase())));

    if (debouncedDrgMinQuery.trim() !== '') {
      const minVal = Number(debouncedDrgMinQuery);
      if (!Number.isNaN(minVal)) {
        if (drgMinCmp === '>') {
          filtered = filtered.filter((r) => Number(r.drg_weight) >= minVal);
        } else {
          filtered = filtered.filter((r) => Number(r.drg_weight) <= minVal);
        }
      }
    }
    if (debouncedDrgMaxQuery.trim() !== '') {
      const maxVal = Number(debouncedDrgMaxQuery);
      if (!Number.isNaN(maxVal)) {
        if (drgMaxCmp === '>') {
          filtered = filtered.filter((r) => Number(r.drg_weight) >= maxVal);
        } else {
          filtered = filtered.filter((r) => Number(r.drg_weight) <= maxVal);
        }
      }
    }

    // Apply DRG median filter
    if (debouncedDrgMedianQuery.trim() !== '') {
      const pivot = Number(debouncedDrgMedianQuery);
      if (!Number.isNaN(pivot)) {
        filtered = filtered.filter((r) => {
          const samples = makeFakeSamplesForRow(r, 40);
          const med = computeMedian(samples);
          return drgMedianCmp === '>' ? med >= pivot : med <= pivot;
        });
      }
    }

    const accessor = sortStatus.columnAccessor as keyof Row;
    let sorted: Row[] = [];

    if (accessor === 'drg_weight') {
      sorted = sortBy(filtered, (r: Row) => {
        const samples = makeFakeSamplesForRow(r, 40);
        return computeMedian(samples);
      }) as Row[];
    } else {
      sorted = sortBy(filtered, accessor) as Row[];
    }

    setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
  }, [
    sortStatus,
    debouncedSurgeonQuery,
    debouncedDrgMedianQuery,
    debouncedDrgMinQuery,
    debouncedDrgMaxQuery,
    drgMinCmp,
    drgMedianCmp,
    drgMaxCmp,
  ]);

  const getHeatColor = (percent: number) => {
    const t = Math.max(0, Math.min(1, percent / 100));
    // create interpolator once

    return interpolateReds(t);
  };

  const { maxVent, maxB12, maxCases } = useMemo(() => {
    const maxVentVal = Math.max(100, ...records.map((r) => r.vent));
    const maxB12Val = Math.max(100, ...records.map((r) => r.b12));
    const maxCasesVal = Math.max(1, ...records.map((r) => r.cases));
    return { maxVent: maxVentVal, maxB12: maxB12Val, maxCases: maxCasesVal };
  }, [records]);

  const NUM_RBC_BUCKETS = 5;

  const computeBins = (values: number[], bins = 10, min = 0, max = 100) => {
    const counts = new Array(bins).fill(0);
    const range = Math.max(1, max - min);
    const binSize = range / bins;
    values.forEach((v) => {
      const n = Number(v) || 0;
      // clamp
      const clamped = Math.max(min, Math.min(max, n));
      if (clamped === max) {
        counts[bins - 1] += 1;
        return;
      }
      const idx = Math.floor((clamped - min) / binSize);
      counts[Math.min(Math.max(0, idx), bins - 1)] += 1;
    });
    return counts;
  };

  const ventBins = useMemo(() => computeBins(records.map((r) => r.vent), 10, 0, maxVent), [records, maxVent]);
  const b12Bins = useMemo(() => computeBins(records.map((r) => r.b12), 10, 0, maxB12), [records, maxB12]);
  const casesBins = useMemo(() => computeBins(records.map((r) => r.cases), 10, 0, maxCases), [records, maxCases]);

  const rbcBins = useMemo(() => Array.from({ length: NUM_RBC_BUCKETS }).map((_, idx) => {
    const key = `percent_${idx + 1}_rbc` as keyof Row;
    const values = records.map((r) => Number(r[key] ?? 0));
    const maxVal = values.length ? Math.max(...values) : 0;
    return { bins: computeBins(values, 10, 0, maxVal), max: maxVal };
  }), [records]);
  const drgAggregate = useMemo(() => {
    if (!records || records.length === 0) {
      return {
        samples: [] as number[], minAll: 0, maxAll: 0, avgAvg: 0,
      };
    }
    const perRow = records.map((r) => makeFakeSamplesForRow(r, 40));
    const samples = perRow.flat();
    const mins = perRow.map((s) => Math.min(...s));
    const maxs = perRow.map((s) => Math.max(...s));
    const avgs = perRow.map((s) => s.reduce((a, b) => a + b, 0) / Math.max(1, s.length));
    const minAll = Math.min(...mins);
    const maxAll = Math.max(...maxs);
    const avgAvg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
    return {
      samples, minAll, maxAll, avgAvg,
    };
  }, [records]);

  const renderHistogramFooter = (bins: number[], useReds?: boolean, minVal = 0, maxVal = 100) => {
    if (!bins || bins.length === 0) {
      return null;
    }

    const scaledMax = Math.max(0, Math.min(1, maxVal / 100));

    const colors = bins.map((_, i) => {
      if (useReds) {
        const base = bins.length > 1 ? i / (bins.length - 1) : 0;
        const t = Math.min(1, base * scaledMax);
        return interpolateReds(t);
      }
      return '#8c8c8c';
    });

    const data = [
      bins.reduce((acc, count, i) => {
        acc[`bin${i}`] = count;
        return acc;
      }, {} as Record<string, number>),
    ];

    const series = bins.map((_, i) => ({ name: `bin${i}`, color: colors[i] }));

    return (
      <div style={{
        width: 'calc(100% - 3px)',
        overflow: 'visible',
        position: 'relative',
        zIndex: 0,
      }}
      >
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
          style={{
            marginLeft: '-12%',
            angle: 25,
            marginBottom: 0,
            overflow: 'visible',
          }}
        />

        {/* Bottom of histogram */}
        <div
          style={{
            width: '100%',
            height: 1,
            borderTop: `1px solid ${useReds ? interpolateReds(0.4) : '#6f6f6f'}`,
            opacity: 0.5,
          }}
        />

        {/* min / max ticks under the histogram */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 0,
            paddingBottom: 0,
            boxSizing: 'border-box',
            fontSize: 10,
            color: '#6f6f6f',
            fontWeight: 600,
            opacity: 0.7,
          }}
        >
          <div style={{ paddingLeft: 0, color: useReds ? interpolateReds(0.5) : '#6f6f6f' }}>{minVal}</div>
          <div style={{ paddingRight: 0, color: useReds ? interpolateReds(0.5) : '#6f6f6f' }}>{maxVal}</div>
        </div>
      </div>
    );
  };

  // Horizontal bar
  const renderBar = (value: number, max: number, opts?: { suffix?: string; color?: string; percentColor?: boolean }) => {
    const pct = Number.isFinite(max) && max > 0
      ? Math.max(0, Math.min(100, (Number(value ?? 0) / max) * 100))
      : 0;
    const percent = Number(value ?? 0);
    const hasValue = percent !== 0;
    const fillColor = '#8c8c8c';
    const cellHeight = 21;
    const clipRightPercent = `${Math.max(0, 100 - pct)}%`;

    return (
      <Tooltip
        label={hasValue ? `${percent}% of cases` : 'No data'}
        position="top"
        withArrow
      >
        <div style={{
          position: 'relative',
          width: '100%',
          height: cellHeight,
          minHeight: cellHeight,
          display: 'block',
          boxSizing: 'border-box',
          overflow: 'hidden',
          paddingLeft: 0,
          paddingRight: 0,
        }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 0,
              pointerEvents: 'none',
              color: '#000',
            }}
          >
            <p style={{
              margin: 0,
              padding: 0,
              fontStyle: 'italic',
              fontSize: '14px',
              lineHeight: `${cellHeight}px`,
              whiteSpace: 'nowrap',
            }}
            >
              {typeof opts?.suffix === 'string' ? `${value}${opts.suffix}` : value}
            </p>
          </div>

          {/* Bar fill */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${pct}%`,
            maxWidth: '100%',
            background: fillColor,
            borderRadius: 2,
            zIndex: 1,
          }}
          />

          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              zIndex: 2,
              pointerEvents: 'none',
              color: '#fff',
              clipPath: `inset(0 ${clipRightPercent} 0 0)`,
              WebkitClipPath: `inset(0 ${clipRightPercent} 0 0)`,
            }}
          >
            <p style={{
              margin: 0,
              padding: 0,
              fontStyle: 'italic',
              fontSize: '14px',
              lineHeight: `${cellHeight}px`,
              whiteSpace: 'nowrap',
            }}
            >
              {typeof opts?.suffix === 'string' ? `${value}${opts.suffix}` : value}
            </p>
          </div>
        </div>
      </Tooltip>
    );
  };

  // Rbc unit columns
  const rbcUnitColumns = Array.from({ length: NUM_RBC_BUCKETS }).map((_, idx) => {
    const unitIndex = idx; // 0-based index into percent_*_rbc fields
    const titleText = (idx + 1) === 5 ? '5+ RBCs' : `${idx + 1} ${idx === 0 ? 'RBC' : 'RBCs'}`;
    const accessor = `rbc_${idx + 1}`;
    const percentKey = `percent_${idx + 1}_rbc` as keyof Row;

    return {
      accessor,
      title: (
        <Tooltip
          label={(idx + 1) === 5
            ? '5+ RBCs Transfused Intraoperatively'
            : `${idx + 1} ${idx === 0 ? 'RBC' : 'RBCs'} Transfused Intraoperatively`}
          position="top"
          withArrow
        >
          <div style={{ display: 'inline-block', cursor: 'help' }}>{titleText}</div>
        </Tooltip>
      ),
      render: (row: Row) => {
        const percent = Number(row[percentKey] ?? 0);
        const hasValue = percent !== 0;
        return (
          <Tooltip
            label={hasValue ? `${percent}% of cases` : 'No data'}
            position="top"
            withArrow
          >
            <Box
              style={{
                height: 21,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: hasValue ? getHeatColor(percent) : 'transparent',
                color: percent > 30 ? '#fff' : '#000',
                fontSize: 14,
                padding: 0,
              }}
            >
              {hasValue
                ? `${percent}%`
                : (
                  <div style={{
                    width: '30%',
                    height: 1,
                    background: '#bbb',
                    borderRadius: 2,
                  }}
                  />
                )}
            </Box>
          </Tooltip>
        );
      },
      sortable: true,
      footer: renderHistogramFooter((rbcBins[unitIndex]?.bins) ?? new Array(10).fill(0), true, 0, rbcBins[unitIndex]?.max ?? 100),
      ...{ ...colProps, draggable: false },
    };
  });

  // Define column types and their configurations
  type ColumnType = 'heatmapColumn' | 'textColumn' | 'numericColumn' | 'violinColumn';

  interface ColumnConfig {
    accessor: string;
    title: string | JSX.Element;
    type: ColumnType;
    sortable?: boolean;
    filterable?: boolean;
    resizable?: boolean;
    render?: (row: Row) => JSX.Element;
    sortFunction?: (a: Row, b: Row) => number;
    filterFunction?: (row: Row, query: string) => boolean;
    footer?: JSX.Element;
    width?: number;
    textAlign?: 'left' | 'center' | 'right';
  }

  // Function to generate columns dynamically
  const generateColumns = (configs: ColumnConfig[]): any[] => configs.map((config) => {
    const {
      accessor, title, type, sortable, filterable, resizable, render, sortFunction, filterFunction, footer, width, textAlign,
    } = config;

    const column: any = {
      accessor,
      title,
      sortable,
      resizable,
      width,
      textAlign,
      footer,
      render: render || ((row: Row) => <div>{row[accessor]}</div>), // Default render
    };

    if (sortable && sortFunction) {
      column.sortFunction = sortFunction;
    }

    if (filterable && filterFunction) {
      column.filter = (
        <TextInput
          placeholder={`Filter ${accessor}`}
          size="xs"
          onChange={(e) => {
            const query = e.currentTarget.value;
            setRecords((prevRecords) => prevRecords.filter((row) => filterFunction(row, query)));
          }}
        />
      );
    }

    // Add specific rendering logic for each column type
    if (type === 'heatmapColumn') {
      column.render = (row: Row) => {
        const value = Number(row[accessor] ?? 0);
        const hasValue = value !== 0;
        return (
          <Box
            style={{
              height: 21,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: hasValue ? getHeatColor(value) : 'transparent',
              color: value > 30 ? '#fff' : '#000',
              fontSize: 14,
              padding: 0,
            }}
          >
            {hasValue ? `${value}%` : 'No data'}
          </Box>
        );
      };
    } else if (type === 'violinColumn') {
      column.render = (row: Row) => {
        const samples = makeFakeSamplesForRow(row, 40);
        return <ViolinCell samples={samples} domain={[drgAggregate.minAll, drgAggregate.maxAll]} />;
      };
    } else if (type === 'numericColumn') {
      column.render = (row: Row) => renderBar(Number(row[accessor]), 100, { suffix: '%' });
    }

    return column;
  });

  // Example column configurations
  const columnConfigs: ColumnConfig[] = [
    {
      accessor: 'drg_weight',
      title: 'DRG Weight',
      type: 'violinColumn',
      sortable: true,
      filterable: true,
      resizable: true,
      sortFunction: (a, b) => computeMedian(makeFakeSamplesForRow(a, 40)) - computeMedian(makeFakeSamplesForRow(b, 40)),
      filterFunction: (row, query) => {
        const samples = makeFakeSamplesForRow(row, 40);
        const median = computeMedian(samples);
        return median.toString().includes(query);
      },
      footer: (
        <ViolinCell samples={drgAggregate.samples} domain={[drgAggregate.minAll, drgAggregate.maxAll]} height={24} padding={0} />
      ),
    },
    {
      accessor: 'vent',
      title: 'Vent',
      type: 'numericColumn',
      sortable: true,
      resizable: true,
      footer: renderHistogramFooter(ventBins, false, 0, maxVent),
    },
    {
      accessor: 'b12',
      title: 'B12',
      type: 'numericColumn',
      sortable: true,
      resizable: true,
      footer: renderHistogramFooter(b12Bins, false, 0, maxB12),
    },
    {
      accessor: 'surgeon',
      title: 'Surgeon',
      type: 'textColumn',
      sortable: true,
      filterable: true,
      resizable: true,
      filterFunction: (row, query) => String(row.surgeon).toLowerCase().includes(query.toLowerCase()),
    },
    {
      accessor: 'cases',
      title: 'Cases',
      type: 'numericColumn',
      sortable: true,
      resizable: true,
      footer: renderHistogramFooter(casesBins, false, 0, maxCases),
    },
    ...Array.from({ length: NUM_RBC_BUCKETS }).map((_, idx) => ({
      accessor: `rbc_${idx + 1}`,
      title: `${idx + 1} RBC`,
      type: 'heatmapColumn',
      sortable: true,
      resizable: true,
      footer: renderHistogramFooter((rbcBins[idx]?.bins) ?? new Array(10).fill(0), true, 0, rbcBins[idx]?.max ?? 100),
    })),
  ];

  // Generate columns dynamically
  const { effectiveColumns } = useDataTableColumns<Row>({
    key: colKey,
    columns: generateColumns(columnConfigs),
  });

  return (
    <Stack style={{ height: '100%', width: '100%' }}>
      <Flex direction="row" justify="space-between" align="center" pl="md">
        <Flex direction="row" align="center" gap="md" ml={-12}>
          <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
          <Title order={4}>RBC Units Transfused Per Surgeon</Title>
        </Flex>

        <Flex direction="row" align="center" gap="sm">
          <ActionIcon
            variant="subtle"
            onClick={() => {}}
            title="Toggle sort by total cost"
          >
            <IconPlus size={18} />
          </ActionIcon>
          <CloseButton onClick={() => { store.exploreStore.removeChart(chartConfig.chartId); }} />
        </Flex>
      </Flex>
      <Box style={{ minHeight: 0, width: '100%' }}>
        <DataTable
          className="heatmap-data-table"
          borderRadius="sm"
          striped
          withTableBorder={false}
          highlightOnHover
          withRowBorders={false}
          highlightOnHoverColor={backgroundHoverColor}
          records={records}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          storeColumnsKey={colKey}
          columns={effectiveColumns}
          style={{
            fontStyle: 'italic',
          }}
          onRowClick={() => {}}
        />
      </Box>
    </Stack>
  );
}
