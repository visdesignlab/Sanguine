import {
  useContext, useEffect, useState, useMemo,
} from 'react';
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
} from '@mantine/core';
import {
  IconGripVertical, IconMathGreater, IconMathLower,
} from '@tabler/icons-react';
import {
  DataTable, DataTableColumn, useDataTableColumns, type DataTableSortStatus,
} from 'mantine-datatable';
import sortBy from 'lodash/sortBy';
import { BarChart } from '@mantine/charts';
import { interpolateReds } from 'd3';
import { Store } from '../../../../Store/Store';
import {
  ExploreTableRow, ExploreTableData, ExploreTableConfig, ExploreTableColumn, ExploreTableColumnOptions,
} from '../../../../Types/application';
import { backgroundHoverColor, smallHoverColor } from '../../../../Theme/mantineTheme';
import './ExploreTable.css';

export default function ExploreTable({ chartConfig }: { chartConfig: ExploreTableConfig }) {
  const store = useContext(Store);
  const chartData = store.exploreStore.chartData[chartConfig.chartId] as ExploreTableData;

  // Numeric filters per column (unlimited)
  type Comparator = '>' | '<';
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

  // Hover state for cross-component highlighting
  const [hoveredValue, setHoveredValue] = useState<{ col: string; value: number } | null>(null);

  // Column Resizing
  const colKey = `ExploreTable-${chartConfig.chartId}`;

  // Sorting
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ExploreTableRow>>({
    columnAccessor: 'surgeon_prov_id',
    direction: 'asc',
  });

  // Sorting base data
  const [records, setRecords] = useState<ExploreTableRow[]>(() => sortBy(chartData, 'surgeon_prov_id') as ExploreTableRow[]);

  // map accessor
  const typeMap = useMemo(() => new Map(chartConfig.columns.map((c) => [c.colVar, c.type])), [chartConfig.columns]);

  // helper to get samples from a row for a given accessor
  const getSamples = (r: ExploreTableRow, key: string) => {
    const raw = (r as Record<string, unknown>)[key];
    // Handle twoValsPerRow: if it's an array of arrays, flatten it for sorting/filtering context
    if (chartConfig.twoValsPerRow && Array.isArray(raw) && Array.isArray(raw[0])) {
      return (raw as number[][]).flat();
    }
    return Array.isArray(raw) ? raw : typeof raw === 'number' ? [raw] : [];
  };

  // apply all filters and sorting
  useEffect(() => {
    let filtered = chartData;

    // text filters (AND across columns)
    if (Object.keys(textFilters).length) {
      filtered = filtered.filter((r) => Object.entries(textFilters).every(([k, query]) => {
        const val = r[k];
        return String(val).toLowerCase().includes(query.toLowerCase());
      }));
    }

    // numeric filters (AND across columns)
    if (Object.keys(numericFilters).length) {
      filtered = filtered.filter((r) => Object.entries(numericFilters).every(([k, { query, cmp }]) => {
        if (!query) return true;
        const threshold = Number(query);
        const raw = r[k];

        // Handle twoValsPerRow: check if ANY value meets criteria
        if (chartConfig.twoValsPerRow && Array.isArray(raw) && typeof raw[0] === 'number') {
          const vals = raw as number[];
          if (cmp === '>') return vals.some((v) => v > threshold);
          if (cmp === '<') return vals.some((v) => v < threshold);
        }

        const val = Number(raw);
        return cmp === '>' ? val > threshold : val < threshold;
      }));
    }

    // sort
    const accessor = sortStatus.columnAccessor as keyof ExploreTableRow;
    let sorted: ExploreTableRow[] = [];

    const getSortValue = (r: ExploreTableRow) => {
      const val = r[accessor as string];

      if (chartConfig.twoValsPerRow && Array.isArray(val)) {
        // Numeric tuple: sort by sum
        if (typeof val[0] === 'number') {
          return (val as number[]).reduce((a, b) => a + b, 0);
        }
      }
      return val;
    };

    sorted = sortBy(filtered, getSortValue) as ExploreTableRow[];

    setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
  }, [
    sortStatus,
    chartData,
    textFilters,
    numericFilters,
    typeMap,
    chartConfig.twoValsPerRow,
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


  const renderHistogramFooter = (bins: number[], useReds?: boolean, minVal = 0, maxVal = 100, colVar?: string) => {
    if (!bins || bins.length === 0) {
      return null;
    }

    const scaledMax = Math.max(0, Math.min(1, maxVal / 100));

    const colors = bins.map((_, i) => {
      // Check if this bin should be highlighted based on hoveredValue
      if (hoveredValue && colVar && hoveredValue.col === colVar) {
        const range = Math.max(1, maxVal - minVal);
        const binSize = range / bins.length;
        const binStart = minVal + (i * binSize);
        const binEnd = minVal + ((i + 1) * binSize);
        const val = hoveredValue.value;

        // Check if hovered value falls in this bin
        // Special case for last bin to include max value
        if (i === bins.length - 1) {
          if (val >= binStart && val <= maxVal) return smallHoverColor;
        } else if (val >= binStart && val < binEnd) {
          return smallHoverColor;
        }
      }

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
  const numericBarCell = (value: number, max: number, colVar: string, opts?: { suffix?: string; color?: string; percentColor?: boolean; padding?: string }) => {
    const pct = Number.isFinite(max) && max > 0
      ? Math.max(0, Math.min(100, (Number(value ?? 0) / max) * 100))
      : 0;
    const percent = Number(value ?? 0);
    const hasValue = percent !== 0;
    const fillColor = '#8c8c8c';
    const cellHeight = 21;
    const clipRightPercent = `${Math.max(0, 100 - pct)}%`;
    const padding = opts?.padding ?? '2.25px 2px';

    return (
      <Tooltip
        label={hasValue ? `${percent}% of cases` : 'No data'}
        position="top"
        withArrow
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            display: 'block',
            boxSizing: 'border-box',
            overflow: 'hidden',
            padding,
          }}
          onMouseEnter={() => setHoveredValue({ col: colVar, value })}
          onMouseLeave={() => setHoveredValue(null)}
          className="numeric-bar-cell"
        >
          <div style={{ position: 'relative', width: '100%', height: cellHeight }}>
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
            <div
              className="bar-fill"
              style={{
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
        </div>
      </Tooltip>
    );
  };

  const inferColumnType = (key: string): ExploreTableColumn['type'] => {
    const sample = chartData[0]?.[key];

    if (chartConfig.twoValsPerRow) {
      if (Array.isArray(sample)) {
        // [number, number] -> numeric or heatmap
        if (typeof sample[0] === 'number') {
          if (key.includes('adherent') || ['rbc', 'ffp', 'cryo'].includes(key)) return 'heatmap';
          return 'numeric';
        }
      }
      return 'text';
    }

    if (typeof sample === 'number') {
      // heuristics for heatmap (% style)
      if (key.includes('adherent') || ['rbc', 'ffp', 'cryo'].includes(key)) return 'heatmap';
    }
    return 'text'; // default to text if not numeric/array
  };

  const handleColumnsChange = (values: string[]) => {
    // values is the full set of currently selected option values from the MultiSelect
    const optionSet = new Set(ExploreTableColumnOptions.map((o) => o.value));
    const selectedSet = new Set(values);

    // Keep columns not controlled by the MultiSelect, plus selected ones
    const retained = chartConfig.columns.filter(
      (c) => !optionSet.has(c.colVar) || selectedSet.has(c.colVar),
    );
    const retainedSet = new Set(retained.map((c) => c.colVar));

    // Add any newly selected columns not already retained
    const toAdd: ExploreTableColumn[] = [];
    values.forEach((v) => {
      if (!v || retainedSet.has(v)) return;
      const selected = ExploreTableColumnOptions.find((o) => o.value === v);
      if (!selected) return;

      toAdd.push({
        colVar: selected.value,
        aggregation: 'none',
        type: inferColumnType(selected.value),
        title: selected.label, // FIX: label is a string, not { base }
      });
    });

    const nextColumns = [...toAdd, ...retained];

    // No-op if columns didn’t change
    const unchanged = nextColumns.length === chartConfig.columns.length
      && chartConfig.columns.every((c, i) => c.colVar === nextColumns[i].colVar);
    if (unchanged) return;

    const updatedConfig: ExploreTableConfig = {
      ...chartConfig,
      columns: nextColumns,
    };

    store.exploreStore.updateChartConfig(updatedConfig);
  };

  // Column Definitions Generator ----
  const generateColumnDefs = (configs: ExploreTableColumn[]): DataTableColumn<ExploreTableRow>[] => configs.map((config) => {
    const {
      colVar, type, title, numericTextVisible,
    } = config;

    const column: DataTableColumn<ExploreTableRow> = {
      accessor: colVar,
      title,
      sortable: true,
      resizable: true,
      render: (row: ExploreTableRow, _index: number) => <div>{String(row[colVar] ?? '')}</div>,
    };

    // derive values for histograms
    const rawValues = records.map((r) => r[colVar]);
    let values: number[] = [];

    if (chartConfig.twoValsPerRow) {
      // flatten [ [v1, v2], [v3, v4] ] -> [v1, v2, v3, v4]
      // Filter out non-numeric if mixed, but dummy data is consistent
      values = rawValues.flat().map((v) => Number(v ?? 0));
    } else {
      values = rawValues.map((r) => Number(r ?? 0));
    }

    const maxFromValues = (vals: number[]) => (vals.length ? Math.max(...vals) : 0);

    if (type === 'heatmap') {
      const valueValues = values;
      column.render = (row: ExploreTableRow, _index: number) => {
        if (chartConfig.twoValsPerRow) {
          const val = row[colVar] as [number, number] | undefined;
          const v1 = val?.[0] ?? 0;
          const v2 = val?.[1] ?? 0;
          return (
            <Stack gap={0}>
              <Tooltip label={`${v1}% of cases`} withArrow>
                <div
                  onMouseEnter={() => setHoveredValue({ col: colVar, value: v1 })}
                  onMouseLeave={() => setHoveredValue(null)}
                  style={{ padding: '2.25px 2px 1px 2px', width: '100%' }}
                >
                  <div
                    className={`heatmap-cell ${numericTextVisible ? 'heatmap-cell-visible' : ''}`}
                    style={{
                      backgroundColor: getHeatColor(v1), color: numericTextVisible ? (v1 > 50 ? 'white' : 'black') : 'transparent', padding: '2px 4px', borderRadius: 2, textAlign: 'center', fontSize: 11,
                    }}
                  >
                    {v1}
                    %
                  </div>
                </div>
              </Tooltip>
              <Tooltip label={`${v2}% of cases`} withArrow>
                <div
                  onMouseEnter={() => setHoveredValue({ col: colVar, value: v2 })}
                  onMouseLeave={() => setHoveredValue(null)}
                  style={{ padding: '1px 2px 2.25px 2px', width: '100%' }}
                >
                  <div
                    className={`heatmap-cell ${numericTextVisible ? 'heatmap-cell-visible' : ''}`}
                    style={{
                      backgroundColor: getHeatColor(v2), color: numericTextVisible ? (v2 > 50 ? 'white' : 'black') : 'transparent', padding: '2px 4px', borderRadius: 2, textAlign: 'center', fontSize: 11,
                    }}
                  >
                    {v2}
                    %
                  </div>
                </div>
              </Tooltip>
            </Stack>
          );
        }

        const val = Number(row[colVar] ?? 0);
        return (
          <Tooltip label={`${val}% of cases`} withArrow>
            <div
              onMouseEnter={() => setHoveredValue({ col: colVar, value: val })}
              onMouseLeave={() => setHoveredValue(null)}
              style={{ padding: '2.25px 2px', width: '100%' }}
            >
              <div
                className={`heatmap-cell ${numericTextVisible ? 'heatmap-cell-visible' : ''}`}
                style={{
                  backgroundColor: getHeatColor(val), color: numericTextVisible ? (val > 50 ? 'white' : 'black') : 'transparent', padding: '4px 8px', borderRadius: 4, textAlign: 'center',
                }}
              >
                {val}
                %
              </div>
            </div>
          </Tooltip>
        );
      };

      if (valueValues.length) {
        const max = maxFromValues(valueValues);
        const bins = computeBins(valueValues, 10, 0, max);
        column.footer = renderHistogramFooter(bins, true, 0, max, colVar);
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
      const maxVal = maxFromValues(values);

      column.render = (row: ExploreTableRow, _index: number) => {
        if (chartConfig.twoValsPerRow) {
          const val = row[colVar] as [number, number] | undefined;
          const v1 = val?.[0] ?? 0;
          const v2 = val?.[1] ?? 0;
          return (
            <Stack gap={0}>
              {numericBarCell(v1, maxVal, colVar, { padding: '2.25px 2px 1px 2px' })}
              {numericBarCell(v2, maxVal, colVar, { padding: '1px 2px 2.25px 2px' })}
            </Stack>
          );
        }
        return numericBarCell(Number(row[colVar]), maxVal, colVar);
      };

      if (values.length) {
        const max = maxFromValues(values);
        const bins = computeBins(values, 10, 0, max);
        column.footer = renderHistogramFooter(bins, false, 0, max, colVar);
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

    // TODO: Type of ViolinPlot in separate PR

    return column;
  });

  // Generate columns dynamically from chart configuration ----
  const { effectiveColumns } = useDataTableColumns<ExploreTableRow>({
    key: colKey,
    columns: generateColumnDefs(chartConfig.columns),
  });

  const multiSelectDefaultValues = useMemo(() => {
    const optionSet = new Set(ExploreTableColumnOptions.map((o) => o.value));
    return chartConfig.columns.filter((c) => optionSet.has(c.colVar)).map((c) => c.colVar);
  }, [chartConfig.columns]);

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
          <MultiSelect
            placeholder="Columns"
            searchable
            clearable
            nothingFoundMessage="No options"
            data={ExploreTableColumnOptions.map((opt) => ({
              value: opt.value,
              label: opt.label, // FIX: use string label
            }))}
            onChange={handleColumnsChange}
            defaultValue={multiSelectDefaultValues}
            styles={{
              pill: { display: 'none' },
            }}
          />
          <CloseButton onClick={() => { store.exploreStore.removeChart(chartConfig.chartId); }} />
        </Flex>
      </Flex>

      {/** Data Table */}
      <Box style={{ minHeight: 0, width: '100%' }}>
        <DataTable<ExploreTableRow>
          className="explore-table-data-table"
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
          onRowClick={() => { }}
        />
      </Box>
    </Stack>
  );
}
