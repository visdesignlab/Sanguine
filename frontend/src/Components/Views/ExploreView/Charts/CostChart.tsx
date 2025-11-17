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
  TextInput,
  Tooltip,
  Text,
} from '@mantine/core';
import {
  IconGripVertical, IconPlus, IconSearch, IconX, IconMathGreater, IconMathLower,
} from '@tabler/icons-react';
import { DataTable, useDataTableColumns, type DataTableSortStatus } from 'mantine-datatable';
import sortBy from 'lodash/sortBy';
import { useDebouncedValue } from '@mantine/hooks';
import { area, curveCatmullRom } from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import { mean as d3Mean, max as d3Max } from 'd3-array';
import { BarChart } from '@mantine/charts';
import { Store } from '../../../../Store/Store';
import { ExploreChartConfig, chartColors } from '../../../../Types/application';
import { backgroundHoverColor } from '../../../../Theme/mantineTheme';
import { dummyData, type Row } from './dummyData';

export default function CostChart({ chartConfig }: { chartConfig: ExploreChartConfig }) {
  const store = useContext(Store);

  const colKey = `costchart-${chartConfig.chartId}`;
  const colProps = { resizable: true, draggable: true, toggleable: true };

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Row>>({
    columnAccessor: 'surgeon',
    direction: 'asc',
  });

  const [surgeonQuery, setSurgeonQuery] = useState('');
  const [debouncedSurgeonQuery] = useDebouncedValue(surgeonQuery, 200);

  // ---------- DRG filter states (copied from ExploreTable for parity) ----------
  const [drgMedianQuery, setDrgMedianQuery] = useState('');
  const [debouncedDrgMedianQuery] = useDebouncedValue(drgMedianQuery, 200);

  const [drgMinQuery, setDrgMinQuery] = useState('');
  const [drgMaxQuery, setDrgMaxQuery] = useState('');
  const [debouncedDrgMinQuery, setDebouncedDrgMinQuery] = useDebouncedValue(drgMinQuery, 200);
  const [debouncedDrgMaxQuery, setDebouncedDrgMaxQuery] = useDebouncedValue(drgMaxQuery, 200);

  const [drgMinCmp, setDrgMinCmp] = useState<'>' | '<'>('>');
  const [drgMedianCmp, setDrgMedianCmp] = useState<'>' | '<'>('>');
  const [drgMaxCmp, setDrgMaxCmp] = useState<'>' | '<'>('<');
  // -----------------------------------------------------------------------

  const [records, setRecords] = useState<Row[]>(() => sortBy(dummyData, 'surgeon') as Row[]);

  // ---------- helpers copied from ExploreTable for DRG violin rendering ----------
  function kernelEpanechnikov(k: number) {
    return function (v: number) {
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
    const seedStr = `${row.surgeon ?? ''}:${row.cases ?? 0}`;
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
    }
    const rnd = mulberry32(h);
    const samples = new Array(count).fill(0).map(() => {
      const v = rnd() ** 1.3 * 1.5 + 0.2 + (Number(row.cases ?? 0) % 5) * 0.05;
      return Math.round(v * 100) / 100;
    });
    return samples;
  }

  function ViolinCell({
    samples, domain, height = 25, padding = 0,
  }: { samples: number[]; domain?: [number, number]; height?: number; padding?: number }) {
    const internalWidth = 120;
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

    const domainMin = (domain && typeof domain[0] === 'number') ? domain[0] : sampleMin;
    const domainMax = (domain && typeof domain[1] === 'number') ? domain[1] : sampleMax;
    const domainRange = Math.max(1e-6, domainMax - domainMin);

    const ticks = 20;
    const centerY = height / 2;

    const xScale = scaleLinear().domain([domainMin, domainMax]).range([padding, internalWidth - padding]);

    const liner = Array.from({ length: ticks }).map((_, i) => domainMin + (i * domainRange) / Math.max(1, ticks - 1));
    const bandwidth = Math.max((domainRange) / 8, 1e-3);
    const kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), liner);
    const density = kde(samples);
    const maxDens = d3Max(density.map((d) => d[1])) ?? 1;

    const yDensityScale = scaleLinear().domain([0, maxDens]).range([0, (height - padding * 2) / 2 * 0.85]);

    const path = area<[number, number]>()
      .x((d) => xScale(d[0]))
      .y0((d) => centerY - yDensityScale(d[1]))
      .y1((d) => centerY + yDensityScale(d[1]))
      .curve(curveCatmullRom);

    const d = path(density as any) ?? '';

    const median = (() => {
      const sorted = [...samples].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    })();

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
  // ---------- end DRG helpers ----------

  useEffect(() => {
    let filtered = dummyData.filter((r) => (debouncedSurgeonQuery.trim() === ''
      ? true
      : String(r.surgeon).toLowerCase().includes(debouncedSurgeonQuery.trim().toLowerCase())));

    // apply DRG min / max filters (copied from ExploreTable)
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

    // DRG median filter (uses fake samples)
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

    const accessor = sortStatus.columnAccessor as string;

    let sorted: Row[] = [];

    if (accessor === 'net_cost') {
      sorted = sortBy(filtered, (r: Row) => (Number(r.rbc_cost ?? 0)
          + Number(r.ffp_cost ?? 0)
          + Number(r.platelets_cost ?? 0)
          + Number(r.cryo_cost ?? 0)
          - Number(r.salvage_savings ?? 0))) as Row[];
    } else if (accessor === 'drg_weight') {
      // sort by computed median drg weight
      sorted = sortBy(filtered, (r: Row) => {
        const samples = makeFakeSamplesForRow(r, 40);
        return computeMedian(samples);
      }) as Row[];
    } else {
      sorted = sortBy(filtered, accessor as any) as Row[];
    }

    setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
  }, [debouncedSurgeonQuery, sortStatus, debouncedDrgMedianQuery, debouncedDrgMinQuery, debouncedDrgMaxQuery, drgMinCmp, drgMedianCmp, drgMaxCmp]);

  // compute drg aggregate for footer (copied)
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

  // ---------- added: small histogram/bar helpers + cases footer (copied/adapted from ExploreTable) ----------
  const computeBins = (values: number[], bins = 10, min = 0, max = 100) => {
    const counts = new Array(bins).fill(0);
    const range = Math.max(1, max - min);
    const binSize = range / bins;
    values.forEach((v) => {
      const n = Number(v) || 0;
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

  const { maxCases } = useMemo(() => {
    const maxCasesVal = Math.max(1, ...records.map((r) => r.cases));
    return { maxCases: maxCasesVal };
  }, [records]);

  const casesBins = useMemo(() => computeBins(records.map((r) => r.cases), 10, 0, Math.max(1, maxCases)), [records, maxCases]);

  const renderHistogramFooter = (bins: number[], useReds?: boolean, minVal = 0, maxVal = 100, tickCount = 2) => {
    if (!bins || bins.length === 0) {
      return null;
    }

    const scaledMax = Math.max(0, Math.min(1, maxVal / 100));

    const colors = bins.map((_, i) => {
      return '#8c8c8c';
    });

    const data = [
      bins.reduce((acc, count, i) => {
        acc[`bin${i}`] = count;
        return acc;
      }, {} as Record<string, any>),
    ];

    const series = bins.map((_, i) => ({ name: `bin${i}`, color: colors[i] }));

    const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    // generate tick values
    const ticks: number[] = [];
    const range = Math.max(1, maxVal - minVal);
    for (let i = 0; i < Math.max(2, tickCount); i++) {
      const v = minVal + (i * range) / (Math.max(2, tickCount) - 1);
      ticks.push(v);
    }

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

        <div
          style={{
            width: '100%',
            height: 1,
            borderTop: `1px solid ${ '#6f6f6f'}`,
            opacity: 0.5,
          }}
        />

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
            opacity: 0.9,
          }}
        >
          {ticks.map((t, i) => (
            <div key={i} style={{ paddingLeft: 0, paddingRight: 0, color:  '#6f6f6f' }}>
              {formatter.format(Math.round(t))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBar = (value: number, max: number, opts?: { suffix?: string; color?: string }) => {
    const pct = Number.isFinite(max) && max > 0 ? Math.max(0, Math.min(100, (Number(value ?? 0) / max) * 100)) : 0;
    const percent = Number(value ?? 0);
    const hasValue = percent !== 0;
    const fillColor = opts?.color ?? '#8c8c8c';
    const cellHeight = 21;
    const clipRightPercent = `${Math.max(0, 100 - pct)}%`;

    return (
      <Tooltip
        label={hasValue ? `${percent}${opts?.suffix ?? ''}` : 'No data'}
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
  // ---------- end added helpers ----------
  
  // compute max total for scaling stacked bars
  const maxCost = useMemo(() => {
    if (!records || records.length === 0) return 1;
    const totals = records.map((r) => (
      (Number(r.rbc_cost ?? 0)
        + Number(r.ffp_cost ?? 0)
        + Number(r.platelets_cost ?? 0)
        + Number(r.cryo_cost ?? 0)
        - Number(r.salvage_savings ?? 0))
    ));
    return Math.max(1, ...totals);
  }, [records]);

  // bins and range for average cost per visit (net) histogram footer
  const { netMin, netMax, netBins } = useMemo(() => {
    const totals = records.map((r) => (
      (Number(r.rbc_cost ?? 0)
        + Number(r.ffp_cost ?? 0)
        + Number(r.platelets_cost ?? 0)
        + Number(r.cryo_cost ?? 0)
        - Number(r.salvage_savings ?? 0))
    ));
    const min = totals.length ? Math.min(...totals) : 0;
    const max = totals.length ? Math.max(...totals) : 0;
    const safeMax = Math.max(min + 1, max);
    const bins = computeBins(totals, 10, Math.floor(min), Math.ceil(safeMax));
    return { netMin: Math.floor(min), netMax: Math.ceil(safeMax), netBins: bins };
  }, [records]);

  function renderCosts(row: Row) {
    const parts = [
      {
        key: 'rbc_cost', label: 'RBC Cost', value: Number(row.rbc_cost ?? 0), color: chartColors[4],
      },
      {
        key: 'ffp_cost', label: 'FFP Cost', value: Number(row.ffp_cost ?? 0), color: chartColors[2],
      },
      {
        key: 'platelets_cost', label: 'Platelets Cost', value: Number(row.platelets_cost ?? 0), color: chartColors[0],
      },
      {
        key: 'cryo_cost', label: 'Cryo Cost', value: Number(row.cryo_cost ?? 0), color: chartColors[1],
      },
      {
        key: 'salvage_savings', label: 'Costs Saved Due to Cell Salvage', value: Number(row.salvage_savings ?? 0), color: chartColors[3],
      },
    ];

    const totalNet = parts[0].value + parts[1].value + parts[2].value + parts[3].value - parts[4].value;
    const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    return (
      <Tooltip
        position="top"
        withArrow
        label={(
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {parts.map((p) => (
              <Text key={p.key} fz="xs" style={{ whiteSpace: 'nowrap' }}>
                {p.label}
                :
                {' '}
                {formatter.format(p.value)}
              </Text>
            ))}
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 4, paddingTop: 4 }}>
              <Text fz="xs" weight={700}>
                Net Cost:
                {' '}
                {formatter.format(totalNet)}
              </Text>
            </div>
          </div>
        )}
      >
        <div style={{
          display: 'flex',
          width: '100%',
          height: 22,
          overflow: 'hidden',
        }}
        >
          {parts.map((p) => {
            const w = maxCost > 0 ? (p.value / maxCost) * 100 : 0;

            // Special rendering for salvage_savings: light yellow fill + dashed yellow stroke
            if (p.key === 'salvage_savings') {
              return (
                <div
                  key={p.key}
                  title={`${p.label}: ${p.value}`}
                  style={{
                    width: `${w}%`,
                    minWidth: p.value > 0 ? 1 : 0,
                    display: p.value > 0 ? 'block' : 'none',
                    background: '#fff8d6', // light yellow fill
                    boxSizing: 'border-box',
                    border: p.value > 0 ? '1px dashed #f2c94c' : 'none', // dashed yellow stroke
                    borderRadius: 2,
                    // keep the dashed stroke visible against adjacent segments
                    marginLeft: 0,
                  }}
                />
              );
            }

            return (
              <div
                key={p.key}
                title={`${p.label}: ${p.value}`}
                style={{
                  width: `${w}%`,
                  minWidth: p.value > 0 ? 1 : 0,
                  background: p.color,
                  display: p.value > 0 ? 'block' : 'none',
                }}
              />
            );
          })}
          <div style={{ marginLeft: 5 }}>
            {formatter.format(totalNet)}
          </div>
        </div>
      </Tooltip>
    );
  }

  const { effectiveColumns } = useDataTableColumns<Row>({
    key: colKey,
    columns: [
      // ---------- DRG Weight column (copied from ExploreTable) ----------
      {
        accessor: 'drg_weight',
        title: 'DRG Weight',
        textAlign: 'center',
        render: (row: Row) => {
          const samples = makeFakeSamplesForRow(row, 40);
          return <ViolinCell samples={samples} domain={[drgAggregate.minAll, drgAggregate.maxAll]} />;
        },
        sortable: true,
        filter: (
          <Stack>
            <TextInput
              placeholder="Min"
              size="xs"
              value={drgMinQuery}
              onChange={(e) => setDrgMinQuery(e.currentTarget.value)}
              rightSection={(
                <div style={{
                  display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap', marginRight: 20,
                }}
                >

                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    c="dimmed"
                    onClick={() => setDrgMinCmp((p) => (p === '>' ? '<' : '>'))}
                    title="Toggle comparator"
                  >
                    {drgMinCmp === '>' ? <IconMathGreater size={12} /> : <IconMathLower size={12} />}
                  </ActionIcon>
                  <ActionIcon size="xs" variant="transparent" c="dimmed" onClick={() => setDrgMinQuery('')}>
                    <IconX size={12} />
                  </ActionIcon>
                </div>
              )}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
            />
            <TextInput
              placeholder="Median"
              size="xs"
              value={drgMedianQuery}
              onChange={(e) => setDrgMedianQuery(e.currentTarget.value)}
              rightSection={(
                <div style={{
                  display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap', marginRight: 20,
                }}
                >
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    c="dimmed"
                    onClick={() => setDrgMedianCmp((p) => (p === '>' ? '<' : '>'))}
                    title="Toggle comparator"
                  >
                    {drgMedianCmp === '>' ? <IconMathGreater size={12} /> : <IconMathLower size={12} />}
                  </ActionIcon>
                  <ActionIcon size="xs" variant="transparent" c="dimmed" onClick={() => setDrgMedianQuery('')}>
                    <IconX size={12} />
                  </ActionIcon>
                </div>

              )}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
            />
            <TextInput
              placeholder="Max"
              size="xs"
              value={drgMaxQuery}
              onChange={(e) => setDrgMaxQuery(e.currentTarget.value)}
              rightSection={(
                <div style={{
                  display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap', marginRight: 20,
                }}
                >
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    c="dimmed"
                    onClick={() => setDrgMaxCmp((p) => (p === '>' ? '<' : '>'))}
                    title="Toggle comparator"
                  >
                    {drgMaxCmp === '>' ? <IconMathGreater size={12} /> : <IconMathLower size={12} />}
                  </ActionIcon>
                  <ActionIcon size="xs" variant="transparent" c="dimmed" onClick={() => setDrgMaxQuery('')}>
                    <IconX size={12} />
                  </ActionIcon>
                </div>
              )}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
            />
          </Stack>
        ),
        footer: (
          <div style={{
            display: 'flex', justifyContent: 'center', paddingTop: 0, paddingBottom: 0,
          }}
          >
            <div style={{
              width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
            }}
            >
              <div style={{ width: '100%' }}>
                <ViolinCell samples={drgAggregate.samples} domain={[drgAggregate.minAll, drgAggregate.maxAll]} height={24} padding={0} />
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
                  <div style={{ paddingLeft: 4, color: '#6f6f6f' }}>{drgAggregate.minAll}</div>
                  <div style={{ paddingRight: 4, color: '#6f6f6f' }}>{drgAggregate.maxAll}</div>
                </div>
              </div>
            </div>

          </div>
        ),
        ...colProps,
      },
      // ---------- existing Surgeon column ----------
      {
        accessor: 'surgeon',
        title: 'Surgeon',
        resizable: true,
        sortable: true,
        filter: (
          <TextInput
            placeholder="Search surgeons..."
            leftSection={<IconSearch size={16} />}
            rightSection={(
              <ActionIcon size="sm" variant="transparent" c="dimmed" onClick={() => setSurgeonQuery('')}>
                <IconX size={14} />
              </ActionIcon>
            )}
            value={surgeonQuery}
            onChange={(e) => setSurgeonQuery(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
          />
        ),
        render: ({ surgeon }) => (
          <div
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              width: '100%',
            }}
            title={String(surgeon)}
          >
            {surgeon}
          </div>
        ),
        ...colProps,
      },
      // ---------- added Cases column (same as ExploreTable) ----------
      {
        accessor: 'cases',
        title: 'Cases',
        width: 120,
        textAlign: 'right',
        resizable: true,
        sortable: true,
        render: ({ cases }) => renderBar(cases, maxCases, { color: '#6f6f6f'}),
        footer: renderHistogramFooter(casesBins, false, 0, maxCases),
        ...colProps,
      },
      {
        accessor: 'net_cost',
        title: 'Average Cost per Visit',
        sortable: true,
        width: 1400,
        render: (row: Row) => renderCosts(row),
        footer: renderHistogramFooter(netBins, true, netMin, netMax, 10),
        ...colProps,
      },
    ],
  });

  return (
    <Stack style={{ height: '100%', width: '100%' }}>
      <Flex direction="row" justify="space-between" align="center" pl="md">
        <Flex direction="row" align="center" gap="md" ml={-12}>
          <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
          <Title order={4}>Cost Chart</Title>
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
          className="ExploreTable-data-table"
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
