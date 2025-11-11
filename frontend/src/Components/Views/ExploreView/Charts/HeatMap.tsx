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
  Grid,
  TextInput,
} from '@mantine/core';
import {
  IconGripVertical, IconPlus, IconSearch, IconX,
} from '@tabler/icons-react';
import { DataTable, useDataTableColumns, type DataTableSortStatus } from 'mantine-datatable';
import sortBy from 'lodash/sortBy';
import { useDebouncedValue } from '@mantine/hooks';
import { BarChart } from '@mantine/charts';
import { Store } from '../../../../Store/Store';
import { ExploreChartConfig } from '../../../../Types/application';
import { backgroundHoverColor } from '../../../../Theme/mantineTheme';
import './HeatMap.css';

type Row = {
  id: number;
  vent: number; // percent
  b12: number; // percent
  surgeon: string; // array
  cases: number;
  rbcTransfused: {rbc_units: number, percentCases: number}[]; // array of datapoints
};

const dummyData = [
  {
    id: 1, vent: 0, b12: 72, surgeon: 'Dr. Smith', cases: 42, stretch: 0, rbcTransfused: [{ rbc_units: 4, percentCases: 40 }, { rbc_units: 3, percentCases: 30 }, { rbc_units: 4, percentCases: 20 }, { rbc_units: 2, percentCases: 7 }, { rbc_units: 1, percentCases: 3 }],
  },
  {
    id: 2, vent: 85, b12: 72, surgeon: 'Dr. Lee', cases: 42, stretch: 0, rbcTransfused: [{ rbc_units: 3, percentCases: 30 }, { rbc_units: 3, percentCases: 25 }, { rbc_units: 2, percentCases: 20 }, { rbc_units: 2, percentCases: 15 }, { rbc_units: 1, percentCases: 10 }],
  },
  {
    id: 3, vent: 12, b12: 8, surgeon: 'Dr. Patel', cases: 5, stretch: 0, rbcTransfused: [{ rbc_units: 0, percentCases: 0 }, { rbc_units: 1, percentCases: 50 }, { rbc_units: 0, percentCases: 0 }, { rbc_units: 1, percentCases: 50 }, { rbc_units: 0, percentCases: 0 }],
  },
  {
    id: 4, vent: 55, b12: 60, surgeon: 'Dr. Gomez', cases: 18, stretch: 0, rbcTransfused: [{ rbc_units: 2, percentCases: 20 }, { rbc_units: 2, percentCases: 20 }, { rbc_units: 1, percentCases: 10 }, { rbc_units: 1, percentCases: 10 }, { rbc_units: 0, percentCases: 0 }],
  },
  {
    id: 5, vent: 55, b12: 60, surgeon: 'Dr. Park', cases: 18, stretch: 0, rbcTransfused: [{ rbc_units: 2, percentCases: 18 }, { rbc_units: 3, percentCases: 25 }, { rbc_units: 2, percentCases: 18 }, { rbc_units: 1, percentCases: 10 }, { rbc_units: 1, percentCases: 9 }],
  },
  {
    id: 6, vent: 55, b12: 60, surgeon: 'Dr. Huang', cases: 18, stretch: 0, rbcTransfused: [{ rbc_units: 1, percentCases: 33 }, { rbc_units: 1, percentCases: 33 }, { rbc_units: 1, percentCases: 34 }, { rbc_units: 0, percentCases: 0 }, { rbc_units: 0, percentCases: 0 }],
  },
  {
    id: 7, vent: 98, b12: 93, surgeon: 'Dr. Nguyen', cases: 120, stretch: 0, rbcTransfused: [{ rbc_units: 4, percentCases: 28 }, { rbc_units: 4, percentCases: 28 }, { rbc_units: 4, percentCases: 22 }, { rbc_units: 3, percentCases: 12 }, { rbc_units: 4, percentCases: 10 }],
  },
  {
    id: 8, vent: 30, b12: 40, surgeon: 'Dr. Alvarez', cases: 9, stretch: 0, rbcTransfused: [{ rbc_units: 1, percentCases: 33 }, { rbc_units: 0, percentCases: 0 }, { rbc_units: 1, percentCases: 33 }, { rbc_units: 1, percentCases: 34 }, { rbc_units: 0, percentCases: 0 }],
  },
  {
    id: 9, vent: 30, b12: 40, surgeon: 'Dr. Chen', cases: 9, stretch: 0, rbcTransfused: [{ rbc_units: 0, percentCases: 0 }, { rbc_units: 0, percentCases: 0 }, { rbc_units: 0, percentCases: 0 }, { rbc_units: 1, percentCases: 11 }, { rbc_units: 0, percentCases: 0 }],
  },

  // additional synthetic records
  {
    id: 10, vent: 67, b12: 70, surgeon: 'Dr. Rivera', cases: 36, stretch: 0, rbcTransfused: [{ rbc_units: 2, percentCases: 25 }, { rbc_units: 2, percentCases: 20 }, { rbc_units: 1, percentCases: 30 }, { rbc_units: 0, percentCases: 15 }, { rbc_units: 1, percentCases: 10 }],
  },
  {
    id: 11, vent: 45, b12: 50, surgeon: 'Dr. Johnson', cases: 22, stretch: 0, rbcTransfused: [{ rbc_units: 1, percentCases: 40 }, { rbc_units: 1, percentCases: 30 }, { rbc_units: 0, percentCases: 10 }, { rbc_units: 2, percentCases: 15 }, { rbc_units: 0, percentCases: 5 }],
  },
  {
    id: 12, vent: 12, b12: 20, surgeon: 'Dr. Williams', cases: 7, stretch: 0, rbcTransfused: [{ rbc_units: 0, percentCases: 0 }, { rbc_units: 1, percentCases: 60 }, { rbc_units: 1, percentCases: 40 }, { rbc_units: 0, percentCases: 0 }, { rbc_units: 0, percentCases: 0 }],
  },
  {
    id: 13, vent: 90, b12: 88, surgeon: 'Dr. Brown', cases: 80, stretch: 0, rbcTransfused: [{ rbc_units: 5, percentCases: 35 }, { rbc_units: 4, percentCases: 30 }, { rbc_units: 4, percentCases: 20 }, { rbc_units: 3, percentCases: 10 }, { rbc_units: 2, percentCases: 5 }],
  },
  {
    id: 14, vent: 20, b12: 18, surgeon: 'Dr. Davis', cases: 6, stretch: 0, rbcTransfused: [{ rbc_units: 0, percentCases: 0 }, { rbc_units: 0, percentCases: 0 }, { rbc_units: 1, percentCases: 80 }, { rbc_units: 0, percentCases: 20 }, { rbc_units: 0, percentCases: 0 }],
  },
  {
    id: 15, vent: 75, b12: 64, surgeon: 'Dr. Miller', cases: 48, stretch: 0, rbcTransfused: [{ rbc_units: 3, percentCases: 30 }, { rbc_units: 3, percentCases: 25 }, { rbc_units: 2, percentCases: 20 }, { rbc_units: 1, percentCases: 15 }, { rbc_units: 0, percentCases: 10 }],
  },
  {
    id: 16, vent: 58, b12: 55, surgeon: 'Dr. Wilson', cases: 28, stretch: 0, rbcTransfused: [{ rbc_units: 2, percentCases: 22 }, { rbc_units: 2, percentCases: 22 }, { rbc_units: 2, percentCases: 22 }, { rbc_units: 1, percentCases: 18 }, { rbc_units: 1, percentCases: 16 }],
  },
  {
    id: 17, vent: 33, b12: 36, surgeon: 'Dr. Moore', cases: 12, stretch: 0, rbcTransfused: [{ rbc_units: 1, percentCases: 50 }, { rbc_units: 1, percentCases: 30 }, { rbc_units: 0, percentCases: 10 }, { rbc_units: 0, percentCases: 10 }, { rbc_units: 0, percentCases: 0 }],
  },
  {
    id: 18, vent: 82, b12: 79, surgeon: 'Dr. Taylor', cases: 64, stretch: 0, rbcTransfused: [{ rbc_units: 4, percentCases: 30 }, { rbc_units: 4, percentCases: 25 }, { rbc_units: 3, percentCases: 20 }, { rbc_units: 2, percentCases: 15 }, { rbc_units: 1, percentCases: 10 }],
  },
  {
    id: 19, vent: 14, b12: 10, surgeon: 'Dr. Anderson', cases: 4, stretch: 0, rbcTransfused: [{ rbc_units: 0, percentCases: 0 }, { rbc_units: 1, percentCases: 75 }, { rbc_units: 0, percentCases: 0 }, { rbc_units: 0, percentCases: 25 }, { rbc_units: 0, percentCases: 0 }],
  },
  {
    id: 20, vent: 49, b12: 52, surgeon: 'Dr. Thomas', cases: 20, stretch: 0, rbcTransfused: [{ rbc_units: 1, percentCases: 30 }, { rbc_units: 2, percentCases: 30 }, { rbc_units: 1, percentCases: 20 }, { rbc_units: 1, percentCases: 10 }, { rbc_units: 0, percentCases: 10 }],
  },
  {
    id: 21, vent: 71, b12: 68, surgeon: 'Dr. Jackson', cases: 44, stretch: 0, rbcTransfused: [{ rbc_units: 3, percentCases: 28 }, { rbc_units: 3, percentCases: 26 }, { rbc_units: 2, percentCases: 24 }, { rbc_units: 1, percentCases: 12 }, { rbc_units: 1, percentCases: 10 }],
  },
  {
    id: 22, vent: 27, b12: 30, surgeon: 'Dr. White', cases: 11, stretch: 0, rbcTransfused: [{ rbc_units: 0, percentCases: 10 }, { rbc_units: 1, percentCases: 60 }, { rbc_units: 0, percentCases: 10 }, { rbc_units: 1, percentCases: 20 }, { rbc_units: 0, percentCases: 0 }],
  },
  {
    id: 23, vent: 94, b12: 90, surgeon: 'Dr. Harris', cases: 95, stretch: 0, rbcTransfused: [{ rbc_units: 5, percentCases: 40 }, { rbc_units: 4, percentCases: 30 }, { rbc_units: 4, percentCases: 15 }, { rbc_units: 3, percentCases: 10 }, { rbc_units: 2, percentCases: 5 }],
  },
  {
    id: 24, vent: 38, b12: 35, surgeon: 'Dr. Martin', cases: 15, stretch: 0, rbcTransfused: [{ rbc_units: 1, percentCases: 40 }, { rbc_units: 1, percentCases: 30 }, { rbc_units: 1, percentCases: 20 }, { rbc_units: 0, percentCases: 5 }, { rbc_units: 0, percentCases: 5 }],
  },
  {
    id: 25, vent: 60, b12: 58, surgeon: 'Dr. Thompson', cases: 34, stretch: 0, rbcTransfused: [{ rbc_units: 2, percentCases: 30 }, { rbc_units: 2, percentCases: 25 }, { rbc_units: 2, percentCases: 20 }, { rbc_units: 1, percentCases: 15 }, { rbc_units: 0, percentCases: 10 }],
  },
  {
    id: 26, vent: 52, b12: 48, surgeon: 'Dr. Garcia', cases: 26, stretch: 0, rbcTransfused: [{ rbc_units: 2, percentCases: 24 }, { rbc_units: 2, percentCases: 24 }, { rbc_units: 1, percentCases: 22 }, { rbc_units: 1, percentCases: 18 }, { rbc_units: 0, percentCases: 12 }],
  },
] as unknown as Row[];

export default function HeatMap({ chartConfig }: { chartConfig: ExploreChartConfig }) {
  const store = useContext(Store);

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
  const [debouncedSurgeonQuery] = useDebouncedValue(surgeonQuery, 200);
  const [_showSurgeonFilter, _setShowSurgeonFilter] = useState(false);

  const [records, setRecords] = useState<Row[]>(() => sortBy(dummyData, 'surgeon') as Row[]);

  useEffect(() => {
    // apply surgeon filter first, then sort
    const filtered = dummyData.filter((r) => (debouncedSurgeonQuery.trim() === ''
      ? true
      : String(r.surgeon).toLowerCase().includes(debouncedSurgeonQuery.trim().toLowerCase())));

    const accessor = sortStatus.columnAccessor as keyof Row;
    const sorted = sortBy(filtered, accessor as any) as Row[];
    setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
  }, [sortStatus, debouncedSurgeonQuery]);

  const getHeatColor = (percent: number) => {
    const p = Math.max(0, Math.min(100, percent));
    const hue = 60 - (p * 0.6); // 60 = yellow, 0 = red
    const lightness = 62 - (p * 0.32); // higher percent -> darker
    return `hsl(${hue}, 100%, ${lightness}%)`;
  };

  // compute maxima for scaling horizontal bars
  const { maxVent, maxB12, maxCases } = useMemo(() => {
    const maxVentVal = Math.max(100, ...records.map((r) => r.vent));
    const maxB12Val = Math.max(100, ...records.map((r) => r.b12));
    const maxCasesVal = Math.max(1, ...records.map((r) => r.cases));
    return { maxVent: maxVentVal, maxB12: maxB12Val, maxCases: maxCasesVal };
  }, [records]);

  // compute max number of RBC buckets across rows (at least 5 for a stable scale)
  const maxRbcBuckets = useMemo(() => Math.max(5, ...records.map((r) => r.rbcTransfused?.length ?? 0)), [records]);

  // compute histogram bins (always 10 bins from 0..100)
  const computeBins = (values: number[], bins = 10, min = 0, max = 100) => {
    const counts = new Array(bins).fill(0);
    const range = Math.max(1, max - min);
    const binSize = range / bins;
    values.forEach((v) => {
      const n = Number(v) || 0;
      // clamp
      const clamped = Math.max(min, Math.min(max, n));
      // place at last bin if exactly max
      if (clamped === max) {
        counts[bins - 1] += 1;
        return;
      }
      const idx = Math.floor((clamped - min) / binSize);
      counts[Math.min(Math.max(0, idx), bins - 1)] += 1;
    });
    return counts;
  };

  const ventBins = useMemo(() => computeBins(records.map((r) => r.vent)), [records]);
  const b12Bins = useMemo(() => computeBins(records.map((r) => r.b12)), [records]);
  const casesBins = useMemo(() => computeBins(records.map((r) => r.cases)), [records]);

  // compute per-RBC-unit histogram bins: for each unit index collect percentCases across rows
  const rbcBins = useMemo(() => Array.from({ length: maxRbcBuckets }).map((_, idx) => {
    const values = records.map((r) => {
      const d = r.rbcTransfused?.[idx];
      // treat missing entries as 0 so histogram shows absence as zero contribution;
      // if you prefer to ignore missing rows, use: d ? d.percentCases : undefined and filter undefined out before computeBins
      return d?.percentCases ?? 0;
    });
    return computeBins(values);
  }), [records, maxRbcBuckets]);

  const renderHistogramFooter = (bins: number[]) => (
    <div style={{ width: '100%', borderBottom: '1px solid #8c8c8c' }}>
      <BarChart
        data={bins.map((count) => ({ bin: '', count }))}
        series={[{ name: 'count', color: '#8c8c8c' }]}
        w="100%"
        h={25}
        dataKey="bin"
        withXAxis={false}
        withYAxis={false}
        gridAxis="none"
        // remove any outer spacing applied to the chart element
        style={{
          marginLeft: '-1%', width: 'calc(100% + 16px)',
        }}
      />
    </div>
  );

  // helper to render a horizontal bar behind the numeric label
  const renderBar = (value: number, max: number, opts?: { suffix?: string; color?: string; percentColor?: boolean }) => {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    const fillColor = '#8c8c8c';
    return (
      <div style={{
        position: 'relative', width: '100%', height: '100%', display: 'flex', boxSizing: 'border-box', overflow: 'hidden', paddingLeft: 0, paddingRight: 0,
      }}
      >
        {/* fill (removed the light grey track/background) */}
        <div style={{
          position: 'absolute', left: 0, height: '100%', top: '50%', borderRadius: '2px', transform: 'translateY(-50%)', width: `${pct}%`, maxWidth: '100%', background: fillColor,
        }}
        />
        {/* label */}
        <div style={{
          position: 'relative', zIndex: 1, width: '100%', textAlign: 'center', fontSize: 13, fontStyle: 'normal', color: pct > 50 ? '#fff' : '#000', pointerEvents: 'none',
        }}
        >
          {typeof opts?.suffix === 'string'
            ? <span style={{ fontStyle: 'italic', fontSize: '14px' }}>{`${value}${opts.suffix}`}</span>
            : <span style={{ fontStyle: 'italic', fontSize: '14px' }}>{value}</span>}
        </div>
      </div>
    );
  };

  // (removed old numeric scale footer — replaced by histograms)

  // build dynamic RBC unit columns (one column per unit bucket)
  const rbcUnitColumns = Array.from({ length: maxRbcBuckets }).map((_, idx) => {
    const unitIndex = idx; // 0-based index into rbcTransfused arrays
    const title = `${idx + 1} ${idx === 0 ? 'RBC' : 'RBCs'}`;
    return {
      accessor: `rbc_${idx + 1}`,
      title,
      width: 72,
      textAlign: 'center' as const,
      render: ({ rbcTransfused }: Row) => {
        const d = rbcTransfused?.[unitIndex];
        const percent = d?.percentCases ?? 0;
        const hasValue = d !== undefined && percent !== 0;
        return (
          <Tooltip
            label={d ? `rbc_units: ${d.rbc_units}, percentCases: ${d.percentCases}` : 'No data'}
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
                color: percent > 45 ? '#fff' : '#000',
                fontSize: 14,
                padding: 0,
              }}
            >
              {hasValue
                ? `${d!.percentCases}%`
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
      // use the per-unit histogram computed above; fallback to empty bins if missing
      footer: renderHistogramFooter(rbcBins[unitIndex] ?? new Array(10).fill(0)),
      ...colProps,
    };
  });

  const { effectiveColumns } = useDataTableColumns<Row>({
    key: colKey,
    columns: [
      {
        accessor: 'vent',
        title: 'Vent',
        width: 110,
        textAlign: 'left',
        render: ({ vent }) => renderBar(vent, maxVent, { suffix: '%', percentColor: true }),
        sortable: true,
        footer: renderHistogramFooter(ventBins),
        ...colProps,
      },
      {
        accessor: 'b12',
        title: 'B12',
        width: 110,
        textAlign: 'left',
        render: ({ b12 }) => renderBar(b12, maxB12, { suffix: '%', percentColor: true }),
        sortable: true,
        footer: renderHistogramFooter(b12Bins),
        ...colProps,
      },
      {
        accessor: 'surgeon',
        title: 'Surgeon',
        width: 130,
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
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
      },
      {
        accessor: 'cases',
        title: 'Cases',
        width: 75,
        textAlign: 'right',
        resizable: true,
        sortable: true,
        render: ({ cases }) => renderBar(cases, maxCases, { color: '#2b8be6' }),
        footer: renderHistogramFooter(casesBins),
      },
      // spread the generated unit columns
      ...rbcUnitColumns,
    ],
  });

  return (
    // make the stack fill the card so inner box can define a real height for the table
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
      {/*
        Wrap the table in a flex child with minHeight: 0 so the table's height can
        be constrained by the surrounding grid/card. DataTable will then honor
        height="100%" and become vertically scrollable when needed.
      */}
      <Box style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <DataTable
          className="heatmap-data-table"
          borderRadius="sm"
          striped
          withTableBorder={false}
          highlightOnHover
          withRowBorders={false}
          highlightOnHoverColor={backgroundHoverColor}
          height="100%"
            // provide data
          records={records}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
            // use persisted/resizable/reorderable columns
          storeColumnsKey={colKey}
          columns={effectiveColumns}
          style={{ fontStyle: 'italic' }}
            // execute this callback when a row is clicked
          onRowClick={() => {}}
        />
      </Box>
    </Stack>
  );
}
