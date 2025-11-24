import {
  useContext, useEffect, useState, useMemo, useRef, createContext, memo, useCallback,
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
import { BarChart } from '@mantine/charts';
import { interpolateReds } from 'd3';
import { Store } from '../../../../Store/Store';
import {
  ExploreTableRow, ExploreTableData, ExploreTableConfig, ExploreTableColumn, ExploreTableColumnOptions,
} from '../../../../Types/application';
import { backgroundHoverColor, smallHoverColor } from '../../../../Theme/mantineTheme';
import './ExploreTable.css';

// Types
type NumericFilter = { query: string; cmp: '>' | '<' };
type HoveredValue = { col: string; value: number } | null;
type HistogramBin = { binMin: number; binMax: number; count: number };
type SetHoveredValue = (val: HoveredValue) => void;


// Context to pass hovered value to footers without re-rendering columns
const HoverContext = createContext<HoveredValue>(null);

// When adding column, infer column type from attribute
const inferColumnType = (key: string, data: ExploreTableData): ExploreTableColumn['type'] => {
  const sample = data[0]?.[key];

  if (typeof sample !== 'string') {
    if (key.includes('adherent') || ['rbc', 'ffp', 'cryo', 'plt'].includes(key)) {
      return 'heatmap';
    }
    return 'numeric';
  }
  return 'text';
};

// Helper function to sort rows
const sortRows = <T,>(data: T[], getter: (item: T) => any): T[] => {
  return [...data].sort((a, b) => {
    const valueA = getter(a);
    const valueB = getter(b);
    if (valueA < valueB) return -1;
    if (valueA > valueB) return 1;
    return 0;
  });
};

// Compute histogram bins for a given set of values
const computeHistogramBins = (values: number[], bins = 10): HistogramBin[] => {
  if (values.length === 0) {
    return [];
  }

  const histMinVal = Math.min(...values);
  const histMaxVal = Math.max(...values);

  // Handle case where all values are the same
  if (histMinVal === histMaxVal) {
    return [{
      binMin: histMinVal,
      binMax: histMinVal + (histMinVal === 0 ? 1 : Math.abs(histMinVal) * 0.1), // Ensure non-zero range
      count: values.length,
    }];
  }

  const range = histMaxVal - histMinVal;
  const binSize = range / bins;

  const result: HistogramBin[] = Array.from({ length: bins }, (_, i) => ({
    binMin: histMinVal + i * binSize,
    binMax: histMinVal + (i + 1) * binSize,
    count: 0,
  }));

  values.forEach((v) => {
    const n = Number(v);
    if (Number.isNaN(n)) {
      return;
    }

    // Special handling for the maximum value
    if (n === histMaxVal) {
      result[bins - 1].count += 1;
      return;
    }

    const idx = Math.floor((n - histMinVal) / binSize);
    const binIdx = Math.min(Math.max(0, idx), bins - 1); // Clamp index to valid range
    result[binIdx].count += 1;
  });


  console.log("Bins:", result);
  return result;
};

// Histogram footer component
const HistogramFooter = ({
  bins, colorInterpolator, colVar,
}: {
  bins: HistogramBin[];
  colorInterpolator?: (t: number) => string;
  colVar?: string;
}) => {
  if (!bins || bins.length === 0) {
    return null;
  }

  const minVal = bins[0]?.binMin ?? 0;
  const maxVal = bins[bins.length - 1]?.binMax ?? 0;

  // Check if this column is hovered
  const hoveredValue = useContext(HoverContext);
  const isHoveredCol = hoveredValue?.col === colVar;
  const hoveredVal = hoveredValue?.value;

  // Base colors of histogram
  const baseColors = useMemo(() => bins.map((bin, i) => {
    if (colorInterpolator) {
      const base = bins.length > 1 ? i / (bins.length - 1) : 0;
      const scaledMax = Math.max(0, Math.min(1, maxVal / 100));
      const t = Math.min(1, base * scaledMax);
      return colorInterpolator(t);
    }
    return '#8c8c8c';
  }), [bins, colorInterpolator, maxVal]);

  // Final colors, coloring hovered bin
  const colors = useMemo(() => {
    if (!isHoveredCol || hoveredVal === undefined) {
      return baseColors;
    }

    return bins.map((bin, i) => {
      const isMatch = hoveredVal >= bin.binMin && hoveredVal <= bin.binMax;
      if (isMatch) {
        return smallHoverColor;
      }
      return baseColors[i];
    });
  }, [bins, isHoveredCol, hoveredVal, baseColors]);

  // Data for histogram, colored by bin ---
  const data = useMemo(() => [
    Object.fromEntries(bins.map((bin, i) => [`bin${i}`, bin.count]))
  ], [bins]);

  const series = useMemo(() => bins.map((_, i) => ({
    name: `bin${i}`,
    color: colors[i]
  })), [bins, colors]);

  // Render histogram ----
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
        style={{
          angle: 25,
        }}
        withTooltip={false}
      />

      {/* Bottom line of histogram */}
      <div
        className="histogram-footer-line"
        style={{
          borderTop: `1px solid ${colorInterpolator ? colorInterpolator(0.4) : '#6f6f6f'}`,
        }}
      />

      {/* Min / Max ticks under the histogram */}
      <div className="histogram-footer-ticks">
        <div className="histogram-footer-tick-min" style={{ color: colorInterpolator ? colorInterpolator(0.5) : '#6f6f6f' }}>{minVal}</div>
        <div className="histogram-footer-tick-max" style={{ color: colorInterpolator ? colorInterpolator(0.5) : '#6f6f6f' }}>{maxVal}</div>
      </div>
    </div>
  );
};

const NumericBarCell = ({
  value, max, colVar, opts = {}, setHoveredValue, agg,
}: {
  value: number;
  max: number;
  colVar: string;
  setHoveredValue: SetHoveredValue;
  opts?: { suffix?: string; padding?: string; cellHeight?: number; fillColor?: string };
  agg?: string;
}) => {
  // Default Options
  const {
    cellHeight = 21,
    fillColor = '#8c8c8c',
    padding = '1px 1px 1px 1px',
    suffix,
  } = opts;

  // Calculate the bar width as a percentage (0-100) of the maximum value
  const barWidthPercent = Number.isFinite(max) && max > 0
    ? Math.max(0, Math.min(100, (Number(value ?? 0) / max) * 100))
    : 0;

  // Amount to clip from the right side to show only the filled portion
  const clipRightAmount = `${Math.max(0, 100 - barWidthPercent)}%`;

  // The actual numeric value to display
  const unitKey = (agg === 'avg') ? 'avg' : 'sum';
  const valueUnit = ExploreTableColumnOptions.find((opt) => opt.value === colVar)?.units?.[unitKey];
  const displayValue = `${value} ${valueUnit}`;
  const hasValue = Number(value ?? 0) !== 0;

  return (
    <Tooltip
      label={hasValue ? `${displayValue}` : 'No data'}
      position="top"
      withArrow
    >
      <div
        className="numeric-bar-cell"
        style={{
          padding,
        }}
        onMouseEnter={() => setHoveredValue({ col: colVar, value })}
        onMouseLeave={() => setHoveredValue(null)}
      >
        <div className="numeric-bar-cell-inner" style={{ height: cellHeight }}>
          {/* Black Text */}
          <div
            aria-hidden
            className="numeric-bar-cell-text-container"
          >
            <p className="numeric-bar-cell-text" style={{ lineHeight: `${cellHeight}px` }}>
              {typeof suffix === 'string' ? `${value}${suffix}` : value}
            </p>
          </div>
          {/* Bar fill */}
          <div
            className="bar-fill numeric-bar-cell-fill"
            style={{
              width: `${barWidthPercent}%`,
              background: fillColor,
            }}
          />
          {/* White Text */}
          <div
            aria-hidden
            className="numeric-bar-cell-text-overlay"
            style={{
              clipPath: `inset(0 ${clipRightAmount} 0 0)`,
              WebkitClipPath: `inset(0 ${clipRightAmount} 0 0)`,
            }}
          >
            <p className="numeric-bar-cell-text" style={{ lineHeight: `${cellHeight}px` }}>
              {typeof suffix === 'string' ? `${value}${suffix}` : value}
            </p>
          </div>
        </div>
      </div>
    </Tooltip>
  );
};

// MARK: - ExploreTable

export default function ExploreTable({ chartConfig }: { chartConfig: ExploreTableConfig }) {
  const store = useContext(Store);
  const chartData = store.exploreStore.chartData[chartConfig.chartId] as ExploreTableData;

  // Filters
  const defaultNumericFilter: NumericFilter = { query: '', cmp: '>' };
  const [numericFilters, setNumericFilters] = useState<Record<string, NumericFilter>>({});
  const [textFilters, setTextFilters] = useState<Record<string, string>>({});

  // Interaction
  const [hoveredValue, setHoveredValue] = useState<HoveredValue>(null);

  // Sorting
  const defaultSortCol = chartConfig.columns[0]?.colVar || 'surgeon_prov_id';
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ExploreTableRow>>({
    columnAccessor: defaultSortCol,
    direction: 'asc',
  });

  // Apply filters and sorting ---
  const rows = useMemo(() => {
    // Filter ---
    const filteredData = chartData.filter((row) => {
      // Text Filters
      const matchesText = Object.entries(textFilters).every(([key, query]) => {
        const val = String(row[key] ?? '').toLowerCase();
        return val.includes((query as string).toLowerCase());
      });
      if (!matchesText) return false;

      // Numeric Filters
      const matchesNumeric = Object.entries(numericFilters).every(([key, filter]) => {
        const { query, cmp } = filter as NumericFilter;
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
      return val;
    };

    const sorted = sortRows(filteredData, getSortValue) as ExploreTableRow[];
    return sortStatus.direction === 'desc' ? sorted.reverse() : sorted;
  }, [
    sortStatus,
    chartData,
    textFilters,
    numericFilters,
    chartConfig.twoValsPerRow,
  ]);

  const handleColumnsChange = (newColValues: string[]) => {
    const currentCols = chartConfig.columns;
    const currentColVars = currentCols.map((c) => c.colVar);

    // Identify added & prev columns
    const addedColVars = newColValues.filter((v) => !currentColVars.includes(v));
    const prevCols = currentCols.filter((c) => newColValues.includes(c.colVar));

    // Create objects for added columns
    const addedCols: ExploreTableColumn[] = [];
    addedColVars.forEach((v) => {
      const selected = ExploreTableColumnOptions.find((o) => o.value === v);
      if (!selected) return;

      addedCols.push({
        colVar: selected.value,
        aggregation: 'none',
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
    store.exploreStore.updateChartConfig(updatedConfig);
  };

  const generateColumnDefs = (colConfigs: ExploreTableColumn[]): DataTableColumn<ExploreTableRow>[] => colConfigs.map((colConfig) => {
    const {
      colVar, type, title, numericTextVisible,
    } = colConfig;

    // Base column definition
    const column: DataTableColumn<ExploreTableRow> = {
      accessor: colVar,
      title,
      draggable: true,
      resizable: false,
      sortable: true,
      render: (row: ExploreTableRow) => <div>{String(row[colVar] ?? '')}</div>,
    };

    // If accessor is 'cases', different size
    if (colVar === 'cases') {
      column.width = 90;
      column.draggable = false;
    }

    // Primary text column (e.g. surgeon) has max width & no dragging
    const textColumns = colConfigs.filter((c) => c.type === 'text');
    if (textColumns.length === 1 && textColumns[0].colVar === colVar) {
      column.width = 120;
      column.draggable = false;
    }

    // Extract values
    const rawValues = rows.map((r) => r[colVar]);
    const values = chartConfig.twoValsPerRow
      ? rawValues.flat().map((v) => Number(v ?? 0))
      : rawValues.map((r) => Number(r ?? 0));

    const maxVal = values.length ? Math.max(...values) : 0;

    // Helper to create histogram footer
    const createHistogramFooter = () => {
      if (values.length === 0) return undefined;
      const bins = computeHistogramBins(values, 10);
      return (
        <HistogramFooter
          bins={bins}
          colorInterpolator={type === 'heatmap' ? interpolateReds : undefined}
          colVar={colVar}
        />
      );
    };

    // Helper to create numeric filter input
    const createNumericFilterBtn = () => {
      const filterState = numericFilters[colVar] ?? defaultNumericFilter;
      return (
        <TextInput
          placeholder="Filter value"
          size="xs"
          value={filterState.query}
          onChange={(e) => {
            const val = e.currentTarget.value;
            setNumericFilters((prev: Record<string, NumericFilter>) => {
              const curr = prev[colVar] ?? defaultNumericFilter;
              return { ...prev, [colVar]: { ...curr, query: val } };
            });
          }}
          leftSection={(
            <ActionIcon
              size="xs"
              onClick={() => {
                const newCmp = filterState.cmp === '>' ? '<' : '>';
                setNumericFilters((prev: Record<string, NumericFilter>) => {
                  const curr = prev[colVar] ?? defaultNumericFilter;
                  return { ...prev, [colVar]: { ...curr, cmp: newCmp } };
                });
              }}
            >
              {filterState.cmp === '>' ? <IconMathGreater size={12} /> : <IconMathLower size={12} />}
            </ActionIcon>
          )}
        />
      );
    };

    // --- Column Type Specific Logic ---


    // Heatmap columns ---
    if (type === 'heatmap') {
      column.render = (row: ExploreTableRow) => {
        const renderHeatmapCell = (val: number, padding: string, isSplit: boolean) => (
          <Tooltip label={`${val}% of cases`} withArrow>
            <div
              onMouseEnter={() => setHoveredValue({ col: colVar, value: val })}
              onMouseLeave={() => setHoveredValue(null)}
              style={{ padding, width: '100%' }}
            >
              <div
                className={`heatmap-cell heatmap-cell-${isSplit ? 'split' : 'full'}`}
                data-visible={numericTextVisible}
                style={{
                  backgroundColor: interpolateReds(val / 100),
                  '--heatmap-text-color': val > 50 ? 'white' : 'black',
                }}
              >
                {val}
                %
              </div>
            </div>
          </Tooltip>
        );

        // Render two values per row if enabled
        if (chartConfig.twoValsPerRow) {
          const val = row[colVar] as [number, number] | undefined;
          const v1 = val?.[0] ?? 0;
          const v2 = val?.[1] ?? 0;
          return (
            <Stack gap={0}>
              {renderHeatmapCell(v1, '1px 1px 0.5px 1px', true)}
              {renderHeatmapCell(v2, '0.5px 1px 1px 1px', true)}
            </Stack>
          );
        }

        // Otherwise, render a single heatmap cell
        const val = Number(row[colVar] ?? 0);
        return renderHeatmapCell(val, '1px 1px 1px 1px', false);
      };

      column.footer = createHistogramFooter();
      column.filter = createNumericFilterBtn();
    } else if (type === 'numeric') {
      // Numeric columns ---
      column.render = (row: ExploreTableRow) => {
        if (chartConfig.twoValsPerRow) {
          const val = row[colVar] as [number, number] | undefined;
          const v1 = val?.[0] ?? 0;
          const v2 = val?.[1] ?? 0;
          return (
            <Stack gap={0}>
              <NumericBarCell
                value={v1}
                max={maxVal}
                colVar={colVar}
                opts={{ padding: '1px 1px 0.5px 1px' }}
                setHoveredValue={setHoveredValue}
                agg={colConfig.aggregation}
              />
              <NumericBarCell
                value={v2}
                max={maxVal}
                colVar={colVar}
                opts={{ padding: '0.5px 1px 1px 1px' }}
                setHoveredValue={setHoveredValue}
                agg={colConfig.aggregation}
              />
            </Stack>
          );
        }
        return (
          <NumericBarCell
            value={Number(row[colVar])}
            max={maxVal}
            colVar={colVar}
            setHoveredValue={setHoveredValue}
            agg={colConfig.aggregation}
          />
        );
      };

      column.footer = createHistogramFooter();
      column.filter = createNumericFilterBtn();
    } else if (type === 'text') {
      // Text columns ---
      column.render = (row: ExploreTableRow) => (
        <div style={{ marginRight: '10px', textAlign: 'right' }}>{String(row[colVar] ?? '')}</div>
      );

      const textFilterValue = textFilters[colVar] ?? '';
      column.filter = (
        <TextInput
          placeholder="Search ..."
          size="xs"
          value={textFilterValue}
          onChange={(e) => {
            const val = e.currentTarget.value;
            setTextFilters((prev: Record<string, string>) => ({ ...prev, [colVar]: val }));
          }}
        />
      );
    }

    return column;
  });

  // Data Table Columns -------
  const columnDefs = useMemo(
    () => generateColumnDefs(chartConfig.columns),
    [
      chartConfig.columns,
      chartConfig.twoValsPerRow,
      rows,
      numericFilters,
      textFilters,
    ],
  );
  const { effectiveColumns, resetColumnsOrder } = useDataTableColumns<ExploreTableRow>({
    key: `ExploreTable-${chartConfig.chartId}`,
    columns: columnDefs,
  });

  // Reset column order when columns change
  const prevColumnVars = useRef(chartConfig.columns.map((c) => c.colVar).join(','));
  useEffect(() => {
    const currentColumnVars = chartConfig.columns.map((c) => c.colVar).join(',');
    if (currentColumnVars !== prevColumnVars.current) {
      resetColumnsOrder();
      prevColumnVars.current = currentColumnVars;
    }
  }, [chartConfig.columns, resetColumnsOrder]);

  // Currently selected column variables
  const selectedColumnVars = chartConfig.columns
    .filter((c) => ExploreTableColumnOptions.some((o) => o.value === c.colVar))
    .map((c) => c.colVar);

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
          {/** Add Column */}
          <MultiSelect
            placeholder="Columns"
            searchable
            clearable
            nothingFoundMessage="No options"
            data={ExploreTableColumnOptions.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
            onChange={handleColumnsChange}
            value={selectedColumnVars}
            styles={{
              pill: { display: 'none' },
            }}
          />
          {/** Close Chart */}
          <CloseButton onClick={() => { store.exploreStore.removeChart(chartConfig.chartId); }} />
        </Flex>
      </Flex>

      {/** Data Table */}
      <Box style={{ minHeight: 0, width: '100%' }}>
        <HoverContext.Provider value={hoveredValue}>
          <DataTable<ExploreTableRow>
            className="explore-table-data-table"
            borderRadius="sm"
            striped
            withTableBorder={false}
            highlightOnHover
            withRowBorders={false}
            highlightOnHoverColor={backgroundHoverColor}
            records={rows}
            sortStatus={sortStatus}
            onSortStatusChange={setSortStatus}
            storeColumnsKey={`ExploreTable-${chartConfig.chartId}`}
            columns={effectiveColumns}
            style={useMemo(() => ({ fontStyle: 'italic' }), [])}
            onRowClick={useCallback(() => { }, [])}
          />
        </HoverContext.Provider>
      </Box>
    </Stack>
  );
}
