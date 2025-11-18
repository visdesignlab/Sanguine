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
} from '@mantine/core';
import {
  IconGripVertical, IconPlus, IconMathGreater, IconMathLower,
} from '@tabler/icons-react';
import {
  DataTable, DataTableColumn, useDataTableColumns, type DataTableSortStatus,
} from 'mantine-datatable';
import sortBy from 'lodash/sortBy';
import { BarChart } from '@mantine/charts';
import { interpolateReds } from 'd3';
import { Store } from '../../../../Store/Store';
import {
  ExploreTableRow, ExploreTableData, ExploreTableConfig, ExploreTableColumn,
} from '../../../../Types/application';
import { backgroundHoverColor } from '../../../../Theme/mantineTheme';
import './ExploreTable.css';
import { ViolinCell, computeMedian } from './ViolinPlot';

export default function ExploreTable({ chartConfig }: { chartConfig: ExploreTableConfig }) {
  const store = useContext(Store);
  const chartData = store.exploreStore.chartData[chartConfig.chartId] as ExploreTableData;

  // Violin filters per column (unlimited)
  type Comparator = '>' | '<';
  type ViolinFilter = {
    minQuery: string;
    minCmp: Comparator;
    medianQuery: string;
    medianCmp: Comparator;
    maxQuery: string;
    maxCmp: Comparator;
  };
  const defaultViolinFilter: ViolinFilter = {
    minQuery: '',
    minCmp: '>',
    medianQuery: '',
    medianCmp: '>',
    maxQuery: '',
    maxCmp: '<',
  };
  const [violinFilters, setViolinFilters] = useState<Record<string, ViolinFilter>>({});
  const getViolinFilter = (key: string): ViolinFilter => violinFilters[key] ?? defaultViolinFilter;
  const patchViolinFilter = (key: string, patch: Partial<ViolinFilter>) => {
    setViolinFilters((prev) => {
      const curr = prev[key] ?? defaultViolinFilter;
      return { ...prev, [key]: { ...curr, ...patch } };
    });
  };

  // Numeric filters per column (unlimited)
  type NumericFilter = { query: string; cmp: Comparator };
  const defaultNumericFilter: NumericFilter = { query: '', cmp: '>' };
  const [numericFilters, setNumericFilters] = useState<Record<string, NumericFilter>>({});
  const getNumericFilter = (key: string): NumericFilter => numericFilters[key] ?? defaultNumericFilter;
  const patchNumericFilter = (key: string, patch: Partial<NumericFilter>) => {
    setNumericFilters((prev) => {
      const curr = prev[key] ?? defaultNumericFilter;
      return { ...prev, [key]: { ...curr, ...patch } };
    });
  };

  // Text filters per column (unlimited)
  const [textFilters, setTextFilters] = useState<Record<string, string>>({});
  const getTextFilter = (key: string) => textFilters[key] ?? '';
  const patchTextFilter = (key: string, value: string) => {
    setTextFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Column Resizing
  const colKey = `ExploreTable-${chartConfig.chartId}`;

  // Sorting
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ExploreTableRow>>({
    columnAccessor: 'surgeon_prov_id',
    direction: 'asc',
  });

  // Sorting base data
  const [records, setRecords] = useState<ExploreTableRow[]>(() => sortBy(chartData, 'surgeon_prov_id') as ExploreTableRow[]);

  // map accessor -> type to generalize violin-specific sorting
  const typeMap = useMemo(() => new Map(chartConfig.columns.map((c) => [c.colVar, c.type])), [chartConfig.columns]);

  // helper to get samples from a row for a given accessor
  const getSamples = (r: ExploreTableRow, key: string) => {
    const raw = (r as any)[key] as number[] | number | undefined;
    return Array.isArray(raw) ? raw : typeof raw === 'number' ? [raw] : [];
  };

  // apply all filters and sorting
  useEffect(() => {
    let filtered = chartData;

    // text filters (AND across columns)
    if (Object.keys(textFilters).length) {
      filtered = filtered.filter((r) => {
        for (const [key, q] of Object.entries(textFilters)) {
          const qq = String(q ?? '').trim().toLowerCase();
          if (!qq) continue;
          const val = String((r as any)[key] ?? '').toLowerCase();
          if (!val.includes(qq)) return false;
        }
        return true;
      });
    }

    // numeric filters (AND across columns)
    if (Object.keys(numericFilters).length) {
      filtered = filtered.filter((r) => {
        for (const [key, nf] of Object.entries(numericFilters)) {
          const q = nf.query?.trim();
          if (!q) continue;
          const pivot = Number(q);
          if (Number.isNaN(pivot)) continue;
          const v = Number((r as any)[key]);
          if (Number.isNaN(v)) return false;
          if (nf.cmp === '>' ? !(v >= pivot) : !(v <= pivot)) return false;
        }
        return true;
      });
    }

    // violin filters (AND across columns)
    filtered = filtered.filter((r) => {
      for (const [key, vf] of Object.entries(violinFilters)) {
        const samples = getSamples(r, key);
        const hasAnyQuery = !!(vf.minQuery.trim() || vf.medianQuery.trim() || vf.maxQuery.trim());
        if (!hasAnyQuery) continue;
        if (samples.length === 0) return false;

        if (vf.minQuery.trim() !== '') {
          const pivot = Number(vf.minQuery);
          if (!Number.isNaN(pivot)) {
            const minVal = Math.min(...samples);
            if (vf.minCmp === '>' ? !(minVal >= pivot) : !(minVal <= pivot)) return false;
          }
        }
        if (vf.medianQuery.trim() !== '') {
          const pivot = Number(vf.medianQuery);
          if (!Number.isNaN(pivot)) {
            const med = computeMedian(samples);
            if (vf.medianCmp === '>' ? !(med >= pivot) : !(med <= pivot)) return false;
          }
        }
        if (vf.maxQuery.trim() !== '') {
          const pivot = Number(vf.maxQuery);
          if (!Number.isNaN(pivot)) {
            const maxVal = Math.max(...samples);
            if (vf.maxCmp === '>' ? !(maxVal >= pivot) : !(maxVal <= pivot)) return false;
          }
        }
      }
      return true;
    });

    // sort
    const accessor = sortStatus.columnAccessor as keyof ExploreTableRow;
    let sorted: ExploreTableRow[] = [];

    if (typeMap.get(accessor as string) === 'violin') {
      sorted = sortBy(filtered, (r: ExploreTableRow) => computeMedian(getSamples(r, accessor as string))) as ExploreTableRow[];
    } else {
      sorted = sortBy(filtered, accessor) as ExploreTableRow[];
    }

    setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
  }, [
    sortStatus,
    chartData,
    textFilters,
    numericFilters,
    violinFilters,
    typeMap,
  ]);

  const getHeatColor = (percent: number) => {
    const t = Math.max(0, Math.min(1, percent / 100));
    // create interpolator once

    return interpolateReds(t);
  };

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

  // compute aggregates for a violin column (domain and footer)
  const computeViolinAggregate = (col: string) => {
    if (!records || records.length === 0) {
      return {
        samples: [] as number[], minAll: 0, maxAll: 0, avgAvg: 0,
      };
    }
    const perRow = records.map((r) => getSamples(r, col));
    const samples = perRow.flat();
    const mins = perRow.map((s) => (s.length ? Math.min(...s) : 0));
    const maxs = perRow.map((s) => (s.length ? Math.max(...s) : 0));
    const avgs = perRow.map((s) => (s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0));
    const minAll = mins.length ? Math.min(...mins) : 0;
    const maxAll = maxs.length ? Math.max(...maxs) : 0;
    const avgAvg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : 0;
    return {
      samples, minAll, maxAll, avgAvg,
    };
  };

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

  // Numeric Horizontal Bar Cell Renderer ----
  const numericBarCell = (value: number, max: number, opts?: { suffix?: string; color?: string; percentColor?: boolean }) => {
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

  // Column Definitions Generator ----
  const generateColumnDefs = (configs: ExploreTableColumn[]): DataTableColumn<ExploreTableRow>[] => configs.map((config) => {
    const {
      colVar, type, title,
    } = config;

    const column: DataTableColumn<ExploreTableRow> = {
      accessor: colVar,
      title,
      sortable: true,
      resizable: true,
      render: (row: ExploreTableRow, _index: number) => <div>{String(row[colVar] ?? '')}</div>,
    };

    // derive values for histograms
    const values = records.map((r) => Number(r[colVar] ?? 0));
    const maxFromValues = (vals: number[]) => (vals.length ? Math.max(...vals) : 0);

    if (type === 'heatmap') {
      const valueValues = values;
      column.render = (row: ExploreTableRow, _index: number) => {
        const value = Number(row[colVar] ?? 0);
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
      if (valueValues.length) {
        const max = maxFromValues(valueValues);
        const bins = computeBins(valueValues, 10, 0, max);
        column.footer = renderHistogramFooter(bins, true, 0, max);
      }

      // numeric-style filter for heatmap values
      const nf = getNumericFilter(colVar);
      column.filter = (
        <TextInput
          placeholder="Filter value"
          size="xs"
          value={nf.query}
          onChange={(e) => patchNumericFilter(colVar, { query: e.currentTarget.value })}
          leftSection={(
            <ActionIcon
              size="xs"
              onClick={() => patchNumericFilter(colVar, { cmp: nf.cmp === '>' ? '<' : '>' })}
            >
              {nf.cmp === '>' ? <IconMathGreater size={12} /> : <IconMathLower size={12} />}
            </ActionIcon>
          )}
        />
      );
    }

    if (type === 'numeric') {
      column.render = (row: ExploreTableRow, _index: number) => {
        const suffix = colVar === 'cases' ? '' : '%';
        return numericBarCell(Number(row[colVar]), 100, { suffix });
      };
      if (values.length) {
        const max = maxFromValues(values);
        const bins = computeBins(values, 10, 0, max);
        column.footer = renderHistogramFooter(bins, false, 0, max);
      }

      // per-column numeric filter
      const nf = getNumericFilter(colVar);
      column.filter = (
        <TextInput
          placeholder="Filter value"
          size="xs"
          value={nf.query}
          onChange={(e) => patchNumericFilter(colVar, { query: e.currentTarget.value })}
          leftSection={(
            <ActionIcon
              size="xs"
              onClick={() => patchNumericFilter(colVar, { cmp: nf.cmp === '>' ? '<' : '>' })}
            >
              {nf.cmp === '>' ? <IconMathGreater size={12} /> : <IconMathLower size={12} />}
            </ActionIcon>
          )}
        />
      );
    }

    if (type === 'text') {
      const tv = getTextFilter(colVar);
      column.filter = (
        <TextInput
          placeholder="Search ..."
          size="xs"
          value={tv}
          onChange={(e) => patchTextFilter(colVar, e.currentTarget.value)}
        />
      );
    }

    if (type === 'violin') {
      const agg = computeViolinAggregate(colVar);
      const vf = getViolinFilter(colVar);

      column.render = (row: ExploreTableRow, _index: number) => {
        const samples = getSamples(row, colVar);
        return <ViolinCell samples={samples} domain={[agg.minAll, agg.maxAll]} />;
      };

      column.filter = (
        <Stack>
          <TextInput
            placeholder="Filter by Median Value"
            size="xs"
            value={vf.medianQuery}
            onChange={(e) => patchViolinFilter(colVar, { medianQuery: e.currentTarget.value })}
            leftSection={(
              <ActionIcon
                size="xs"
                onClick={() => patchViolinFilter(colVar, { medianCmp: vf.medianCmp === '>' ? '<' : '>' })}
              >
                {vf.medianCmp === '>' ? <IconMathGreater size={12} /> : <IconMathLower size={12} />}
              </ActionIcon>
            )}
          />
          <TextInput
            placeholder="Filter by Min Value"
            size="xs"
            value={vf.minQuery}
            onChange={(e) => patchViolinFilter(colVar, { minQuery: e.currentTarget.value })}
            leftSection={(
              <ActionIcon
                size="xs"
                onClick={() => patchViolinFilter(colVar, { minCmp: vf.minCmp === '>' ? '<' : '>' })}
              >
                {vf.minCmp === '>' ? <IconMathGreater size={12} /> : <IconMathLower size={12} />}
              </ActionIcon>
            )}
          />
          <TextInput
            placeholder="Filter by Max Value"
            size="xs"
            value={vf.maxQuery}
            onChange={(e) => patchViolinFilter(colVar, { maxQuery: e.currentTarget.value })}
            leftSection={(
              <ActionIcon
                size="xs"
                onClick={() => patchViolinFilter(colVar, { maxCmp: vf.maxCmp === '>' ? '<' : '>' })}
              >
                {vf.maxCmp === '>' ? <IconMathGreater size={12} /> : <IconMathLower size={12} />}
              </ActionIcon>
            )}
          />
        </Stack>
      );

      column.sortFunction = (a: ExploreTableRow, b: ExploreTableRow) => {
        const sa = getSamples(a, colVar);
        const sb = getSamples(b, colVar);
        return computeMedian(sa) - computeMedian(sb);
      };

      column.footer = (
        <ViolinCell
          samples={agg.samples}
          domain={[agg.minAll, agg.maxAll]}
          height={24}
          padding={0}
        />
      );
    }

    return column;
  });

  // Generate columns dynamically from chart configuration ----
  const { effectiveColumns } = useDataTableColumns<ExploreTableRow>({
    key: colKey,
    columns: generateColumnDefs(chartConfig.columns),
  });

  // Render the DataTable with columns ----
  return (
    <Stack style={{ height: '100%', width: '100%' }}>
      {/** Title, Add Column, Close Chart */}
      <Flex direction="row" justify="space-between" align="center" pl="md">
        <Flex direction="row" align="center" gap="md" ml={-12}>
          <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
          <Title order={4}>RBC Units Transfused Per Surgeon</Title>
        </Flex>

        <Flex direction="row" align="center" gap="sm">
          <ActionIcon
            variant="subtle"
            onClick={() => {}}
            title="Add Column"
          >
            <IconPlus size={18} />
          </ActionIcon>
          <CloseButton onClick={() => { store.exploreStore.removeChart(chartConfig.chartId); }} />
        </Flex>
      </Flex>

      {/** Data Table */}
      <Box style={{ minHeight: 0, width: '100%' }}>
        <DataTable<ExploreTableRow>
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
