import React, {
  useContext, useEffect, useState, useMemo, useRef, useCallback, CSSProperties,
} from 'react';
import { observer, useLocalObservable, Observer } from 'mobx-react-lite';
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
} from '@mantine/core';
import {
  IconGripVertical, IconMathGreater, IconMathLower, IconPercentage,
} from '@tabler/icons-react';
import {
  DataTable, DataTableColumn, useDataTableColumns, type DataTableSortStatus,
} from 'mantine-datatable';
import { BarChart } from '@mantine/charts';
import { interpolateReds } from 'd3';
import { Store } from '../../../../Store/Store';
import {
  ExploreTableRow, ExploreTableData, ExploreTableConfig, ExploreTableColumn, ExploreTableColumnOptions, ExploreTableColumnOptionsGrouped, ExploreTableRowOptions,
} from '../../../../Types/application';
import { backgroundHoverColor, smallHoverColor } from '../../../../Theme/mantineTheme';
import './ExploreTable.css';

// Types
type NumericFilter = { query: string; cmp: '>' | '<' };
type HoveredValue = { col: string; value: number } | null;
type HistogramBin = { binMin: number; binMax: number; count: number };
type SetHoveredValue = (val: HoveredValue) => void;

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

  const space = (suffix && !suffix.trim().startsWith('%')) ? ' ' : '';

  return `${prefix}${formattedValue}${space}${suffix}`;
};

const HEATMAP_COLS = ['percent_1_rbc', 'percent_2_rbc', 'percent_3_rbc', 'percent_4_rbc', 'percent_above_5_rbc'];

// When adding column, infer column type from attribute
const inferColumnType = (key: string, data: ExploreTableData): ExploreTableColumn['type'] => {
  // Always treat year and quarter as text
  if (['year', 'quarter', 'attending_provider'].includes(key)) {
    return 'text';
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

// Helper function to sort rows
const sortRows = <T,>(data: T[], getter: (item: T) => string | number | boolean | null | undefined | object): T[] => (
  [...data].sort((a, b) => {
    const valueA = getter(a);
    const valueB = getter(b);

    if (valueA === valueB) return 0;
    if (valueA === null || valueA === undefined) return 1;
    if (valueB === null || valueB === undefined) return -1;

    if (typeof valueA === 'number' && typeof valueB === 'number') {
      if (valueA < valueB) return -1;
      if (valueA > valueB) return 1;
      return 0;
    }

    const strA = String(valueA);
    const strB = String(valueB);
    if (strA < strB) return -1;
    if (strA > strB) return 1;
    return 0;
  })
);

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

const NumericBarCell = ({
  value, max, colVar, opts = {}, setHoveredValue, agg,
}: {
  value: number | null | undefined;
  max: number;
  colVar: string;
  setHoveredValue: SetHoveredValue;

  opts?: { padding?: string; cellHeight?: number; fillColor?: string };
  agg?: string;
}) => {
  // Default Options
  const {
    cellHeight = 21,
    fillColor = '#8c8c8c',
    padding = '1px 1px 1px 1px',
  } = opts;

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
      label={hasValue ? tooltipTextValue : 'No data'}
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
        <div className="numeric-bar-cell-inner" style={{ height: cellHeight }}>
          {/* Black Text */}
          <div
            aria-hidden
            className="numeric-bar-cell-text-container"
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
              {textValue}
            </p>
          </div>
        </div>
      </div>
    </Tooltip>
  );
};

// MARK: - Components

const NumericFilterInput = ({
  filterState, onChange,
}: {
  filterState: NumericFilter;
  onChange: (val: Partial<NumericFilter>) => void;
}) => (
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

const HistogramFooter = observer(({
  values, colVar, agg, type, colorScale, hoverState,
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
  const baseColors = bins.map((bin) => {
    if (colorScale) return colorScale((bin.binMin + bin.binMax) / 2);
    return '#8c8c8c';
  });

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
  const themeColor = colorScale ? '#ef6548' : '#6f6f6f';

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
        style={{ angle: 25 }} // Note: checking if angle is a valid style property for this lib or CSS? Assuming it's passed to charts.
        withTooltip={false}
      />
      <div className="histogram-footer-line" style={{ borderTop: `1px solid ${colorScale ? '#fc8d59' : '#6f6f6f'}` }} />
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
  const defaultNumericFilter: NumericFilter = { query: '', cmp: '>' };
  const [numericFilters, setNumericFilters] = useState<Record<string, NumericFilter>>({});
  const [textFilters, setTextFilters] = useState<Record<string, string>>({});

  // Interaction
  const hoverState = useLocalObservable(() => ({ current: null as HoveredValue }));
  const setHoveredValue = (val: HoveredValue) => { hoverState.current = val; };

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

      // Check column config to see if we should force numeric sort
      const colConfig = chartConfig.columns.find((c) => c.colVar === accessor);
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

    const updatedConfig: ExploreTableConfig = {
      ...chartConfig,
      rowVar: value,
      columns: newColumns,
      title: newTitle,
    };
    store.updateExploreChartConfig(updatedConfig);
  };

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
        aggregation: 'avg',
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

  const generateColumnDefs = (colConfigs: ExploreTableColumn[]): DataTableColumn<ExploreTableRow>[] => {
    // Compute global min/max for heatmap columns to normalize colors
    let heatmapMin = Infinity;
    let heatmapMax = -Infinity;
    const heatmapCols = colConfigs.filter((c) => c.type === 'heatmap');

    if (heatmapCols.length > 0) {
      rows.forEach((r: ExploreTableRow) => {
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

    return colConfigs.map((colConfig) => {
      const {
        colVar, type, title, numericTextVisible, aggregation: agg,
      } = colConfig;

      // Extract values for footer
      const rawValues = rows.map((r: ExploreTableRow) => r[colVar]);
      const values = chartConfig.twoValsPerRow
        ? rawValues.flat().map((v: unknown) => Number(v ?? 0))
        : rawValues.map((r: unknown) => Number(r ?? 0));
      const maxVal = values.length ? Math.max(...values) : 0;

      // Filter component
      const filterComponent = (type === 'numeric' || type === 'heatmap') ? (
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

      // Base column definition
      const column: DataTableColumn<ExploreTableRow> = {
        accessor: colVar,
        title,
        draggable: colVar !== 'cases' && !(colConfigs.filter((c) => c.type === 'text').length === 1 && colConfigs[0].colVar === colVar),
        resizable: false,
        sortable: true,
        noWrap: true,
        width: colVar === 'cases' ? 90 : (colConfigs.filter((c) => c.type === 'text').length === 1 && colConfigs[0].colVar === colVar) ? 175 : undefined,
        filter: filterComponent,
        footer: (type === 'numeric' || type === 'heatmap') ? (
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
      if (type === 'heatmap') {
        column.render = (row: ExploreTableRow) => {
          const renderHeatmapCell = (val: number, padding: string) => {
            const normalizedVal = getNormalizedValue(val);
            const textVal = getFormattedValue(val, colVar, agg, false);
            const tooltipText = getFormattedValue(val, colVar, agg, true);

            if (val === 0) {
              return (
                <Tooltip label={tooltipText} withArrow>
                  <div
                    onMouseEnter={() => setHoveredValue({ col: colVar, value: val })}
                    onMouseLeave={() => setHoveredValue(null)}
                    style={{
                      padding, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#8c8c8c',
                    }}
                  >
                    &mdash;
                  </div>
                </Tooltip>
              );
            }

            return (
              <Tooltip label={tooltipText} withArrow>
                <div
                  onMouseEnter={() => setHoveredValue({ col: colVar, value: val })}
                  onMouseLeave={() => setHoveredValue(null)}
                  style={{ padding, width: '100%' }}
                >
                  <div
                    className="heatmap-cell"
                    data-visible={numericTextVisible}
                    style={{
                      backgroundColor: getHeatmapColor(val),
                      '--heatmap-text-color': normalizedVal > 0.5 ? 'white' : 'black',
                    } as CSSProperties}
                  >
                    {textVal}
                  </div>
                </div>
              </Tooltip>
            );
          };

          if (chartConfig.twoValsPerRow) {
            const val = row[colVar] as [number, number] | undefined;
            return (
              <Stack gap={0} p={0}>
                {renderHeatmapCell(val?.[0] ?? 0, '1.5px 1px 0.5px 1px')}
                {renderHeatmapCell(val?.[1] ?? 0, '0.5px 1px 1.5px 1px')}
              </Stack>
            );
          }
          return renderHeatmapCell(Number(row[colVar] ?? 0), '1px 1px 1px 1px');
        };
      } else if (type === 'numeric') {
        column.render = (row: ExploreTableRow) => {
          if (chartConfig.twoValsPerRow) {
            const val = row[colVar] as [number, number] | undefined;
            return (
              <Stack gap={0} p={0}>
                <NumericBarCell value={val?.[0]} max={maxVal} colVar={colVar} opts={{ padding: '1px 1px 0.5px 1px' }} setHoveredValue={setHoveredValue} agg={agg} />
                <NumericBarCell value={val?.[1]} max={maxVal} colVar={colVar} opts={{ padding: '0.5px 1px 1px 1px' }} setHoveredValue={setHoveredValue} agg={agg} />
              </Stack>
            );
          }
          return <NumericBarCell value={row[colVar] as number} max={maxVal} colVar={colVar} setHoveredValue={setHoveredValue} agg={agg} />;
        };
      } else {
        column.render = (row: ExploreTableRow) => (
          <div style={{ marginRight: '10px', textAlign: 'right' }}>{String(row[colVar] ?? '')}</div>
        );
      }

      return column;
    });
  };

  // Data Table Columns -------
  const columnDefs = useMemo(
    () => generateColumnDefs(chartConfig.columns),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const columnVars = chartConfig.columns.map((c) => c.colVar).join(',');
  const prevColumnVars = useRef(columnVars);

  useEffect(() => {
    if (columnVars !== prevColumnVars.current) {
      resetColumnsOrder();
      prevColumnVars.current = columnVars;
    }
  }, [columnVars, resetColumnsOrder]);

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
          {/** Row Selection */}
          <Select
            placeholder="Rows"
            data={ExploreTableRowOptions}
            value={chartConfig.rowVar}
            onChange={handleRowChange}
            allowDeselect={false}
            w={120}
          />
          {/** Add Column */}
          <MultiSelect
            placeholder="Columns"
            searchable
            clearable={false}
            nothingFoundMessage="No options"
            data={availableColumnOptions}
            onChange={handleColumnsChange}
            value={chartConfig.columns.map((c) => c.colVar)}
            styles={{
              pill: { display: 'none' },
            }}
          />
          {/** Close Chart */}
          <CloseButton onClick={() => { store.removeExploreChart(chartConfig.chartId); }} />
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
          records={rows}
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
