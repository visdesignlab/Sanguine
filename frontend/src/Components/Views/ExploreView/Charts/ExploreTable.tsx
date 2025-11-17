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
  IconGripVertical, IconPlus,
} from '@tabler/icons-react';
import { DataTable, useDataTableColumns, type DataTableSortStatus } from 'mantine-datatable';
import sortBy from 'lodash/sortBy';
import { BarChart } from '@mantine/charts';
import { interpolateReds } from 'd3';
import { Store } from '../../../../Store/Store';
import {
  ExploreTableRow, ExploreTableData, ExploreTableConfig, ExploreTableColumn,
} from '../../../../Types/application';
import { backgroundHoverColor } from '../../../../Theme/mantineTheme';
import './ExploreTable.css';
import { ViolinCell, makeFakeSamplesForRow, computeMedian } from './ViolinPlot';

export default function ExploreTable({ chartConfig }: { chartConfig: ExploreTableConfig }) {
  const store = useContext(Store);
  const chartData = store.exploreStore.chartData[chartConfig.chartId] as ExploreTableData;

  const [drgMedianQuery, setDrgMedianQuery] = useState('');

  // min / max DRG weight filters (strings so empty = no filter)
  const [drgMinQuery] = useState('');
  const [drgMaxQuery] = useState('');

  // comparator toggles for each input ('>' or '<')
  const [drgMinCmp] = useState<'>' | '<'>('>');
  const [drgMedianCmp] = useState<'>' | '<'>('>');
  const [drgMaxCmp] = useState<'>' | '<'>('<');

  // enable per-chart persistent column resizing / reordering
  const colKey = `ExploreTable-${chartConfig.chartId}`;

  // sorting state + derived records (sort chartData when sort status changes)
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ExploreTableRow>>({
    columnAccessor: 'surgeon_prov_id',
    direction: 'asc',
  });

  // surgeon search state
  const [surgeonQuery, setSurgeonQuery] = useState('');
  const [_showSurgeonFilter, _setShowSurgeonFilter] = useState(false);

  const [records, setRecords] = useState<ExploreTableRow[]>(() => sortBy(chartData, 'surgeon_prov_id') as ExploreTableRow[]);

  useEffect(() => {
    // apply surgeon filter first
    let filtered = chartData.filter((r) => (surgeonQuery.trim() === ''
      ? true
      : String(r.surgeon_prov_id).toLowerCase().includes(surgeonQuery.trim().toLowerCase())));

    if (drgMinQuery.trim() !== '') {
      const minVal = Number(drgMinQuery);
      if (!Number.isNaN(minVal)) {
        if (drgMinCmp === '>') {
          filtered = filtered.filter((r) => Number(r.drg_weight) >= minVal);
        } else {
          filtered = filtered.filter((r) => Number(r.drg_weight) <= minVal);
        }
      }
    }
    if (drgMaxQuery.trim() !== '') {
      const maxVal = Number(drgMaxQuery);
      if (!Number.isNaN(maxVal)) {
        if (drgMaxCmp === '>') {
          filtered = filtered.filter((r) => Number(r.drg_weight) >= maxVal);
        } else {
          filtered = filtered.filter((r) => Number(r.drg_weight) <= maxVal);
        }
      }
    }

    // Apply DRG median filter
    if (drgMedianQuery.trim() !== '') {
      const pivot = Number(drgMedianQuery);
      if (!Number.isNaN(pivot)) {
        filtered = filtered.filter((r) => {
          const samples = makeFakeSamplesForRow(r, 40);
          const med = computeMedian(samples);
          return drgMedianCmp === '>' ? med >= pivot : med <= pivot;
        });
      }
    }

    const accessor = sortStatus.columnAccessor as keyof ExploreTableRow;
    let sorted: ExploreTableRow[] = [];

    if (accessor === 'drg_weight') {
      sorted = sortBy(filtered, (r: ExploreTableRow) => {
        const samples = makeFakeSamplesForRow(r, 40);
        return computeMedian(samples);
      }) as ExploreTableRow[];
    } else {
      sorted = sortBy(filtered, accessor) as ExploreTableRow[];
    }

    setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
  }, [
    sortStatus,
    surgeonQuery,
    drgMedianQuery,
    drgMinQuery,
    drgMaxQuery,
    drgMinCmp,
    drgMedianCmp,
    drgMaxCmp,
    chartData,
  ]);

  const getHeatColor = (percent: number) => {
    const t = Math.max(0, Math.min(1, percent / 100));
    // create interpolator once

    return interpolateReds(t);
  };

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

  // Define column types and their configurations
  type ColumnType = 'HeatMapColumn' | 'textColumn' | 'numericColumn' | 'violinColumn';

  interface ColumnConfig {
    accessor: keyof ExploreTableRow;
    title: string | JSX.Element;
    type: ColumnType;
  }

  // Function to generate columns dynamically (derive values from records internally)
  const generateColumns = (configs: ExploreTableColumn[]): any[] => configs.map((config) => {
    console.log('Column config:', config);
    const {
      colVar, aggregation, type, title,
    } = config;

    const column: any = {
      accessor: colVar,
      title,
      sortable: true,
      resizable: true,
      render: (row: ExploreTableRow) => <div>{String(row[colVar] ?? '')}</div>,
    };

    // derive values for histograms
    const values = records.map((r) => Number(r[colVar] ?? 0));
    const maxFromValues = (vals: number[]) => (vals.length ? Math.max(...vals) : 0);

    if (type === 'heatmap') {
      const valueValues = values;
      column.render = (row: ExploreTableRow) => {
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
    }

    if (type === 'numeric') {
      column.render = (row: ExploreTableRow) => renderBar(Number(row[colVar]), 100, { suffix: '%' });
      if (values.length) {
        const max = maxFromValues(values);
        const bins = computeBins(values, 10, 0, max);
        column.footer = renderHistogramFooter(bins, false, 0, max);
      }
    }

    if (type === 'text') {
      if (colVar === 'surgeon_prov_id') {
        column.filter = (
          <TextInput
            placeholder="Filter surgeon"
            size="xs"
            value={surgeonQuery}
            onChange={(e) => setSurgeonQuery(e.currentTarget.value)}
          />
        );
      }
    }

    if (type === 'violin') {
      column.render = (row: ExploreTableRow) => {
        const samples = makeFakeSamplesForRow(row, 40);
        return <ViolinCell samples={samples} domain={[drgAggregate.minAll, drgAggregate.maxAll]} />;
      };
      column.filter = (
        <TextInput
          placeholder="Filter by median"
          size="xs"
          value={drgMedianQuery}
          onChange={(e) => setDrgMedianQuery(e.currentTarget.value)}
        />
      );
      column.sortFunction = (a: ExploreTableRow, b: ExploreTableRow) => (
        computeMedian(makeFakeSamplesForRow(a, 40)) - computeMedian(makeFakeSamplesForRow(b, 40))
      );
      column.footer = (
        <ViolinCell
          samples={drgAggregate.samples}
          domain={[drgAggregate.minAll, drgAggregate.maxAll]}
          height={24}
          padding={0}
        />
      );
    }

    return column;
  });

  // Column configurations (no inline values now)
  const columnConfigs: ColumnConfig[] = [
    { accessor: 'drg_weight', title: 'DRG Weight', type: 'violinColumn' },
    { accessor: 'surgeon_prov_id', title: 'Surgeon', type: 'textColumn' },
    { accessor: 'cases', title: 'Cases', type: 'numericColumn' },
    { accessor: 'percent_1_rbc', title: '1 RBC', type: 'HeatMapColumn' },
    { accessor: 'percent_2_rbc', title: '2 RBCs', type: 'HeatMapColumn' },
    { accessor: 'percent_3_rbc', title: '3 RBCs', type: 'HeatMapColumn' },
    { accessor: 'percent_4_rbc', title: '4 RBCs', type: 'HeatMapColumn' },
    { accessor: 'percent_5_rbc', title: '5 RBCs', type: 'HeatMapColumn' },
  ];

  console.log('Chart Data in ExploreTable:', chartData);
  // Generate columns dynamically
  const { effectiveColumns } = useDataTableColumns<ExploreTableRow>({
    key: colKey,
    columns: generateColumns(chartConfig.columns),
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
        {console.log('ExploreTable records:', records)}

        {console.log('ExploreTable columns:', effectiveColumns)}
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
