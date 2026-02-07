import {
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

// When adding column, infer column type from attribute
const inferColumnType = (key: string, data: ExploreTableData): ExploreTableColumn['type'] => {
  // Always treat year and quarter as text
  if (['year', 'quarter', 'attending_provider'].includes(key)) {
    return 'text';
  }

  const sample = data[0]?.[key];

  if (typeof sample !== 'string') {
    if (['percent_1_rbc', 'percent_2_rbc', 'percent_3_rbc', 'percent_4_rbc', 'percent_above_5_rbc'].includes(key)) {
      return 'heatmap';
    }
    return 'numeric';
  }
  return 'text';
};

// Helper function to sort rows
function sortRows<T>(data: T[], getter: (item: T) => string | number | boolean | null | undefined | object): T[] {
  return [...data].sort((a, b) => {
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
  });
}

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

  return result;
};

function NumericBarCell({
  value, max, colVar, opts = {}, setHoveredValue, agg,
}: {
  value: number | null | undefined;
  max: number;
  colVar: string;
  setHoveredValue: SetHoveredValue;

  opts?: { padding?: string; cellHeight?: number; fillColor?: string };
  agg?: string;
}) {
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
  const unitConfig = ExploreTableColumnOptions.find((opt) => opt.value === colVar)?.units;
  const aggKey = (agg === 'avg') ? 'avg' : 'sum';
  const shortKey = (agg === 'avg') ? 'avgShort' : 'sumShort';

  const unitString = unitConfig?.[shortKey] ?? unitConfig?.[aggKey] ?? '';
  const tooltipUnitString = unitConfig?.[aggKey] ?? unitConfig?.[shortKey] ?? '';

  const type = unitConfig?.type ?? 'suffix';
  const prefix = type === 'prefix' ? unitString : '';

  const tooltipPrefix = type === 'prefix' ? tooltipUnitString : '';
  const tooltipSuffix = type === 'suffix' ? tooltipUnitString : '';

  const decimals = getDecimals(colVar, agg);
  const formattedValue = isMissing ? '-' : Number(value).toFixed(decimals);

  const space = tooltipSuffix.trim().startsWith('%') ? '' : ' ';
  const textValue = isMissing ? '-' : `${prefix}${formattedValue}${space}${tooltipSuffix}`;
  const tooltipTextValue = isMissing ? '-' : `${tooltipPrefix}${formattedValue}${space}${tooltipSuffix}`;

  const hasValue = !isMissing && Number(value) !== 0;

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
}

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
      const matchesText = Object.entries(textFilters).every(([key, query]) => {
        const val = String(row[key] ?? '').toLowerCase();
        return val.includes(query.toLowerCase());
      });
      if (!matchesText) return false;

      // Numeric Filters
      const matchesNumeric = Object.entries(numericFilters).every(([key, filter]) => {
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
    const newTitle = `RBC Transfusions per ${groupLabel}`;

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
    // Filter out any option that is a row variable BUT NOT the current row variable
    return ExploreTableColumnOptionsGrouped.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        // If it's a potential row var, it must equal the current chartConfig.rowVar
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
      rows.forEach((r) => {
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

    return colConfigs.map((colConfig) => {
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
        noWrap: true,
      };

      // If accessor is 'cases', different size
      if (colVar === 'cases') {
        column.width = 90;
        column.draggable = false;
      }

      // Primary text column (e.g. surgeon) has max width & no dragging
      const textColumns = colConfigs.filter((c) => c.type === 'text');
      if (textColumns.length === 1 && textColumns[0].colVar === colVar) {
        column.width = 175;
        column.draggable = false;
      }

      // Extract values
      const rawValues = rows.map((r) => r[colVar]);
      const values = chartConfig.twoValsPerRow
        ? rawValues.flat().map((v) => Number(v ?? 0))
        : rawValues.map((r) => Number(r ?? 0));

      const maxVal = values.length ? Math.max(...values) : 0;

      // Helper for color scale
      const getNormalizedValue = (val: number) => {
        if (heatmapMax === heatmapMin) return 0;
        return Math.max(0, Math.min(1, (val - heatmapMin) / (heatmapMax - heatmapMin)));
      };

      const getHeatmapColor = (val: number) => interpolateReds(getNormalizedValue(val));

      // Helper to create histogram footer
      const createHistogramFooter = () => {
        if (values.length === 0) return undefined;
        const bins = computeHistogramBins(values, 10);

        return (
          <Observer>
            {() => {
              const histogramMinVal = bins[0]?.binMin ?? 0;
              const histogramMaxVal = bins[bins.length - 1]?.binMax ?? 0;

              // Check if this column is hovered
              const hoveredValStr = hoverState.current;
              const isHoveredCol = hoveredValStr?.col === colVar;
              const hoveredVal = hoveredValStr?.value;

              const colorScale = type === 'heatmap' ? getHeatmapColor : undefined;
              const agg = colConfig.aggregation;

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
                    style={{ angle: 25 }}
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
            }}
          </Observer>
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

      // Heatmap columns ---
      if (type === 'heatmap') {
        column.render = (row: ExploreTableRow) => {
          const decimals = getDecimals(colVar, colConfig.aggregation);

          const unitConfig = ExploreTableColumnOptions.find((opt) => opt.value === colVar)?.units;
          const aggKey = (colConfig.aggregation === 'avg') ? 'avg' : 'sum';

          const tooltipSuffix = unitConfig?.[aggKey] ?? '';
          const space = tooltipSuffix.trim().startsWith('%') ? '' : ' ';

          const renderHeatmapCell = (val: number, padding: string, isSplit: boolean) => {
            const formattedVal = Number(val ?? 0).toFixed(decimals);
            // Normalize value for color scale
            const normalizedVal = getNormalizedValue(val);

            const tooltipText = `${formattedVal}${space}${tooltipSuffix}`;

            if (val === 0) {
              return (
                <Tooltip label={tooltipText} withArrow>
                  <div
                    onMouseEnter={() => setHoveredValue({ col: colVar, value: val })}
                    onMouseLeave={() => setHoveredValue(null)}
                    style={{
                      padding,
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%',
                      color: '#8c8c8c', // Greyish color for dash
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
                    className={`heatmap-cell heatmap-cell-${isSplit ? 'split' : 'full'}`}
                    data-visible={numericTextVisible}
                    style={{
                      backgroundColor: getHeatmapColor(val),
                      '--heatmap-text-color': normalizedVal > 0.5 ? 'white' : 'black', // Switch text color based on background darkness
                    } as CSSProperties}
                  >
                    {formattedVal}
                    {tooltipSuffix.includes('%') ? '%' : ''}
                  </div>
                </div>
              </Tooltip>
            );
          };

          // Render two values per row if enabled
          if (chartConfig.twoValsPerRow) {
            const val = row[colVar] as [number, number] | undefined;
            const v1 = val?.[0] ?? 0;
            const v2 = val?.[1] ?? 0;
            return (
              <Stack gap={0} p={0}>
                {renderHeatmapCell(v1, '1.5px 1px 0.5px 1px', true)}
                {renderHeatmapCell(v2, '0.5px 1px 1.5px 1px', true)}
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
            const v1 = val?.[0] ?? null;
            const v2 = val?.[1] ?? null;
            return (
              <Stack gap={0} p={0}>
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
              value={row[colVar] as number | null | undefined}
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
          onRowClick={useCallback(() => { }, [])}
        />
      </Box>
    </Stack>
  );
});

export default ExploreTable;
