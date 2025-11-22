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


type NumericFilter = { query: string; cmp: '>' | '<' };
type HoveredValue = { col: string; value: number } | null;

// Context to pass hovered value to footers without re-rendering columns
const HoverContext = createContext<HoveredValue>(null);

// Compute histogram bins for a given set of values
type HistogramBin = { min: number; max: number; count: number };
const computeHistogramBins = (values: number[], bins = 10): HistogramBin[] => {
  if (values.length === 0) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  // Handle case where all values are the same
  if (min === max) {
    return [{
      min: min,
      max: min + (min === 0 ? 1 : Math.abs(min) * 0.1), // Ensure non-zero range
      count: values.length,
    }];
  }

  const range = max - min;
  const binSize = range / bins;

  const result: HistogramBin[] = Array.from({ length: bins }, (_, i) => ({
    min: min + i * binSize,
    max: min + (i + 1) * binSize,
    count: 0,
  }));

  values.forEach((v) => {
    const n = Number(v);
    if (Number.isNaN(n)) {
      return;
    }

    // Special handling for the maximum value
    if (n === max) {
      result[bins - 1].count += 1;
      return;
    }

    const idx = Math.floor((n - min) / binSize);
    const binIdx = Math.min(Math.max(0, idx), bins - 1); // Clamp index to valid range
    result[binIdx].count += 1;
  });


  console.log("Bins:", result);
  return result;
};

const inferColumnType = (key: string, data: ExploreTableData, config: ExploreTableConfig): ExploreTableColumn['type'] => {
  const sample = data[0]?.[key];

  if (config.twoValsPerRow) {
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

const sortRecords = <T,>(data: T[], getter: (item: T) => any): T[] => {
  return [...data].sort((a, b) => {
    const valueA = getter(a);
    const valueB = getter(b);
    if (valueA < valueB) return -1;
    if (valueA > valueB) return 1;
    return 0;
  });
};


const HistogramFooter = ({
  bins, colorInterpolator, colVar,
}: {
  bins: HistogramBin[];
  colorInterpolator?: (t: number) => string;
  colVar?: string;
}) => {
  const hoveredValue = useContext(HoverContext);

  if (!bins || bins.length === 0) {
    return null;
  }

  const minVal = bins[0]?.min ?? 0;
  const maxVal = bins[bins.length - 1]?.max ?? 0;

  // Check if this column is hovered
  const isHoveredCol = hoveredValue?.col === colVar;
  const hoveredVal = hoveredValue?.value;

  // Colors of histogram
  const baseColors = useMemo(() => bins.map((bin, i) => {
    if (colorInterpolator) {
      const base = bins.length > 1 ? i / (bins.length - 1) : 0;
      const scaledMax = Math.max(0, Math.min(1, maxVal / 100));
      const t = Math.min(1, base * scaledMax);
      return colorInterpolator(t);
    }
    return '#8c8c8c';
  }), [bins, colorInterpolator, maxVal]);

  // Add hovered color bins
  const colors = useMemo(() => {
    if (!isHoveredCol || hoveredVal === undefined) {
      return baseColors;
    }

    return bins.map((bin, i) => {
      const isMatch = hoveredVal >= bin.min && hoveredVal <= bin.max;
      if (isMatch) {
        return smallHoverColor;
      }
      return baseColors[i];
    });
  }, [bins, isHoveredCol, hoveredVal, baseColors]);

  // Data for histogram
  const data = useMemo(() => [
    bins.reduce((acc, bin, i) => {
      acc[`bin${i}`] = bin.count;
      return acc;
    }, {} as Record<string, number>),
  ], [bins]);

  const series = useMemo(() => bins.map((_, i) => ({ name: `bin${i}`, color: colors[i] })), [bins, colors]);

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
        withTooltip={false}
      />

      {/* Bottom of histogram */}
      <div
        style={{
          width: '100%',
          height: 1,
          borderTop: `1px solid ${colorInterpolator ? colorInterpolator(0.4) : '#6f6f6f'}`,
          opacity: 0.5,
        }}
      />

      {/* Min / Max ticks under the histogram */}
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
        <div style={{ paddingLeft: 0, color: colorInterpolator ? colorInterpolator(0.5) : '#6f6f6f' }}>{minVal}</div>
        <div style={{ paddingRight: 0, color: colorInterpolator ? colorInterpolator(0.5) : '#6f6f6f' }}>{maxVal}</div>
      </div>
    </div>
  );
};

type SetHoveredValue = (val: HoveredValue) => void;

const NumericBarCell = ({
  value, max, colVar, opts = {}, setHoveredValue,
}: {
  value: number;
  max: number;
  colVar: string;
  setHoveredValue: SetHoveredValue;
  opts?: { suffix?: string; padding?: string; cellHeight?: number; fillColor?: string };
}) => {
  // Default Options
  const {
    cellHeight = 21,
    fillColor = '#8c8c8c',
    padding = '2.25px 2px',
    suffix,
  } = opts;

  // Calculate the bar width as a percentage (0-100) of the maximum value
  const barWidthPercent = Number.isFinite(max) && max > 0
    ? Math.max(0, Math.min(100, (Number(value ?? 0) / max) * 100))
    : 0;

  // Amount to clip from the right side to show only the filled portion
  const clipRightAmount = `${Math.max(0, 100 - barWidthPercent)}%`;

  // The actual numeric value to display
  const displayValue = Number(value ?? 0);
  const hasValue = displayValue !== 0;

  return (
    <Tooltip
      label={hasValue ? `${displayValue}% of cases` : 'No data'}
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
          {/* Black Text */}
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
              {typeof suffix === 'string' ? `${value}${suffix}` : value}
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
              width: `${barWidthPercent}%`,
              maxWidth: '100%',
              background: fillColor,
              borderRadius: 2,
              zIndex: 1,
            }}
          />
          {/* White Text */}
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
              clipPath: `inset(0 ${clipRightAmount} 0 0)`,
              WebkitClipPath: `inset(0 ${clipRightAmount} 0 0)`,
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

  // Get filters
  const getNumericFilter = (key: string): NumericFilter => numericFilters[key] ?? defaultNumericFilter;
  const getTextFilter = (key: string) => textFilters[key] ?? '';

  // Update filters
  const updateNumericFilter = (key: string, patch: Partial<NumericFilter>) => {
    setNumericFilters((prev) => {
      const curr = prev[key] ?? defaultNumericFilter;
      return { ...prev, [key]: { ...curr, ...patch } };
    });
  };
  const updateTextFilter = (key: string, value: string) => {
    setTextFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Interaction
  const [hoveredValue, setHoveredValue] = useState<HoveredValue>(null);

  // Sorting
  const defaultSortCol = chartConfig.columns[0]?.colVar || 'surgeon_prov_id';
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ExploreTableRow>>({
    columnAccessor: defaultSortCol,
    direction: 'asc',
  });

  // Apply filters and sorting
  const records = useMemo(() => {
    // Filter
    const filteredData = chartData.filter((row) => {
      // Text Filters
      const matchesText = Object.entries(textFilters).every(([key, query]) => {
        const val = String(row[key] ?? '').toLowerCase();
        return val.includes(query.toLowerCase());
      });
      if (!matchesText) return false;

      // Numeric Filters
      const matchesNumeric = Object.entries(numericFilters).every(([key, { query, cmp }]) => {
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

    // Sort
    const accessor = sortStatus.columnAccessor as keyof ExploreTableRow;

    const getSortValue = (row: ExploreTableRow) => {
      const val = row[accessor];
      if (chartConfig.twoValsPerRow && Array.isArray(val) && typeof val[0] === 'number') {
        return (val as number[]).reduce((sum, n) => sum + n, 0);
      }
      return val;
    };

    const sorted = sortRecords(filteredData, getSortValue) as ExploreTableRow[];
    return sortStatus.direction === 'desc' ? sorted.reverse() : sorted;
  }, [
    sortStatus,
    chartData,
    textFilters,
    numericFilters,
    chartConfig.twoValsPerRow,
  ]);

  const handleColumnsChange = (newColValues: string[]) => {

    // Create new column objects
    const newCols: ExploreTableColumn[] = [];
    newColValues.forEach((v) => {
      const selected = ExploreTableColumnOptions.find((o) => o.value === v);
      if (!selected) return;

      newCols.push({
        colVar: selected.value,
        aggregation: 'none',
        type: inferColumnType(selected.value, chartData, chartConfig),
        title: selected.label,
      });
    });

    // Update this chart's configuration with the new columns
    const updatedConfig: ExploreTableConfig = {
      ...chartConfig,
      columns: newCols,
    };
    store.exploreStore.updateChartConfig(updatedConfig);
  };

  const generateColumnDefs = (configs: ExploreTableColumn[]): DataTableColumn<ExploreTableRow>[] => configs.map((config) => {
    const {
      colVar, type, title, numericTextVisible,
    } = config;

    // Base column definition
    const column: DataTableColumn<ExploreTableRow> = {
      accessor: colVar,
      title,
      draggable: true,
      resizable: false,
      sortable: true,
      render: (row: ExploreTableRow) => <div>{String(row[colVar] ?? '')}</div>,
    };

    // Extract values for histograms and max value calculation
    const rawValues = records.map((r) => r[colVar]);
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
    const createNumericFilter = () => {
      const filterState = getNumericFilter(colVar);
      return (
        <TextInput
          placeholder="Filter value"
          size="xs"
          value={filterState.query}
          onChange={(e) => updateNumericFilter(colVar, { query: e.currentTarget.value })}
          leftSection={(
            <ActionIcon
              size="xs"
              onClick={() => updateNumericFilter(colVar, { cmp: filterState.cmp === '>' ? '<' : '>' })}
            >
              {filterState.cmp === '>' ? <IconMathGreater size={12} /> : <IconMathLower size={12} />}
            </ActionIcon>
          )}
        />
      );
    };

    // --- Column Type Specific Logic ---

    if (type === 'heatmap') {
      column.render = (row: ExploreTableRow) => {
        const renderCell = (val: number, padding: string) => (
          <Tooltip label={`${val}% of cases`} withArrow>
            <div
              onMouseEnter={() => setHoveredValue({ col: colVar, value: val })}
              onMouseLeave={() => setHoveredValue(null)}
              style={{ padding, width: '100%' }}
            >
              <div
                className={`heatmap-cell ${numericTextVisible ? 'heatmap-cell-visible' : ''}`}
                style={{
                  backgroundColor: interpolateReds(val / 100),
                  color: numericTextVisible ? (val > 50 ? 'white' : 'black') : 'transparent',
                  padding: '2px 4px',
                  borderRadius: 2,
                  textAlign: 'center',
                  fontSize: 11,
                }}
              >
                {val}
                %
              </div>
            </div>
          </Tooltip>
        );

        if (chartConfig.twoValsPerRow) {
          const val = row[colVar] as [number, number] | undefined;
          const v1 = val?.[0] ?? 0;
          const v2 = val?.[1] ?? 0;
          return (
            <Stack gap={0}>
              {renderCell(v1, '2.25px 2px 1px 2px')}
              {renderCell(v2, '1px 2px 2.25px 2px')}
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
                  backgroundColor: interpolateReds(val / 100),
                  color: numericTextVisible ? (val > 50 ? 'white' : 'black') : 'transparent',
                  padding: '4px 8px',
                  borderRadius: 4,
                  textAlign: 'center',
                }}
              >
                {val}
                %
              </div>
            </div>
          </Tooltip>
        );
      };

      column.footer = createHistogramFooter();
      column.filter = createNumericFilter();
    } else if (type === 'numeric') {
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
                opts={{ padding: '2.25px 2px 1px 2px' }}
                setHoveredValue={setHoveredValue}
              />
              <NumericBarCell
                value={v2}
                max={maxVal}
                colVar={colVar}
                opts={{ padding: '1px 2px 2.25px 2px' }}
                setHoveredValue={setHoveredValue}
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
          />
        );
      };

      column.footer = createHistogramFooter();
      column.filter = createNumericFilter();
    } else if (type === 'text') {
      column.render = (row: ExploreTableRow) => (
        <div style={{ marginLeft: '10px' }}>{String(row[colVar] ?? '')}</div>
      );

      const textFilterValue = getTextFilter(colVar);
      column.filter = (
        <TextInput
          placeholder="Search ..."
          size="xs"
          value={textFilterValue}
          onChange={(e) => updateTextFilter(colVar, e.currentTarget.value)}
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
      records,
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
            records={records}
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
