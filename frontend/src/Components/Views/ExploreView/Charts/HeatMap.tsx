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
    id: 1,
    vent: 85,
    b12: 72,
    surgeon: 'Dr. Smith',
    cases: 42,
    stretch: 0,
    rbcTransfused: [
      { rbc_units: 4, percentCases: 40 },
      { rbc_units: 3, percentCases: 30 },
      { rbc_units: 4, percentCases: 20 },
      { rbc_units: 2, percentCases: 7 },
      { rbc_units: 1, percentCases: 3 },
    ],
  },
  {
    id: 2,
    vent: 85,
    b12: 72,
    surgeon: 'Dr. Lee',
    cases: 42,
    stretch: 0,
    rbcTransfused: [
      { rbc_units: 3, percentCases: 30 },
      { rbc_units: 3, percentCases: 25 },
      { rbc_units: 2, percentCases: 20 },
      { rbc_units: 2, percentCases: 15 },
      { rbc_units: 1, percentCases: 10 },
    ],
  },
  {
    id: 3,
    vent: 12,
    b12: 8,
    surgeon: 'Dr. Patel',
    cases: 5,
    stretch: 0,
    rbcTransfused: [
      { rbc_units: 0, percentCases: 0 },
      { rbc_units: 1, percentCases: 50 },
      { rbc_units: 0, percentCases: 0 },
      { rbc_units: 1, percentCases: 50 },
      { rbc_units: 0, percentCases: 0 },
    ],
  },
  {
    id: 4,
    vent: 55,
    b12: 60,
    surgeon: 'Dr. Gomez',
    cases: 18,
    stretch: 0,
    rbcTransfused: [
      { rbc_units: 2, percentCases: 20 },
      { rbc_units: 2, percentCases: 20 },
      { rbc_units: 1, percentCases: 10 },
      { rbc_units: 1, percentCases: 10 },
      { rbc_units: 0, percentCases: 0 },
    ],
  },
  {
    id: 5,
    vent: 55,
    b12: 60,
    surgeon: 'Dr. Park',
    cases: 18,
    stretch: 0,
    rbcTransfused: [
      { rbc_units: 2, percentCases: 18 },
      { rbc_units: 3, percentCases: 25 },
      { rbc_units: 2, percentCases: 18 },
      { rbc_units: 1, percentCases: 10 },
      { rbc_units: 1, percentCases: 9 },
    ],
  },
  {
    id: 6,
    vent: 55,
    b12: 60,
    surgeon: 'Dr. Huang',
    cases: 18,
    stretch: 0,
    rbcTransfused: [
      { rbc_units: 1, percentCases: 33 },
      { rbc_units: 1, percentCases: 33 },
      { rbc_units: 1, percentCases: 34 },
      { rbc_units: 0, percentCases: 0 },
      { rbc_units: 0, percentCases: 0 },
    ],
  },
  {
    id: 7,
    vent: 98,
    b12: 93,
    surgeon: 'Dr. Nguyen',
    cases: 120,
    stretch: 0,
    rbcTransfused: [
      { rbc_units: 4, percentCases: 28 },
      { rbc_units: 4, percentCases: 28 },
      { rbc_units: 4, percentCases: 22 },
      { rbc_units: 3, percentCases: 12 },
      { rbc_units: 4, percentCases: 10 },
    ],
  },
  {
    id: 8,
    vent: 30,
    b12: 40,
    surgeon: 'Dr. Alvarez',
    cases: 9,
    stretch: 0,
    rbcTransfused: [
      { rbc_units: 1, percentCases: 33 },
      { rbc_units: 0, percentCases: 0 },
      { rbc_units: 1, percentCases: 33 },
      { rbc_units: 1, percentCases: 34 },
      { rbc_units: 0, percentCases: 0 },
    ],
  },
  {
    id: 9,
    vent: 30,
    b12: 40,
    surgeon: 'Dr. Chen',
    cases: 9,
    stretch: 0,
    rbcTransfused: [
      { rbc_units: 0, percentCases: 0 },
      { rbc_units: 0, percentCases: 0 },
      { rbc_units: 0, percentCases: 0 },
      { rbc_units: 1, percentCases: 11 },
      { rbc_units: 0, percentCases: 0 },
    ],
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
  const [showSurgeonFilter, setShowSurgeonFilter] = useState(false);

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

  // helper to render a horizontal bar behind the numeric label
  const renderBar = (value: number, max: number, opts?: { suffix?: string; color?: string; percentColor?: boolean }) => {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    const fillColor = '#8c8c8c';
    return (
      <div style={{
        position: 'relative', width: '100%', height: '100%', display: 'flex', boxSizing: 'border-box',
      }}
      >
        {/* fill (removed the light grey track/background) */}
        <div style={{
          position: 'absolute', left: 6, height: '100%', top: '50%', borderRadius: '2px', transform: 'translateY(-50%)', width: `${pct}%`, maxWidth: 'calc(100% - 12px)', background: fillColor,
        }}
        />
        {/* label */}
        <div style={{
          position: 'relative', zIndex: 2, width: '100%', textAlign: 'center', fontSize: 13, fontStyle: 'normal', color: pct > 50 ? '#fff' : '#000', pointerEvents: 'none',
        }}
        >
          {typeof opts?.suffix === 'string'
            ? <span style={{ fontStyle: 'italic', fontSize: '14px' }}>{`${value}${opts.suffix}`}</span>
            : <span style={{ fontStyle: 'italic', fontSize: '14px' }}>{value}</span>}
        </div>
      </div>
    );
  };

  // render a simple x-axis style footer for numeric columns
  const renderScaleFooter = (max: number, opts?: { suffix?: string }) => {
    const displayMax = opts?.suffix ? `${max}${opts.suffix}` : `${max}`;
    return (
      <div style={{ width: '100%' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12,
        }}
        >
          <div>0</div>
          <div style={{ textAlign: 'right' }}>{displayMax}</div>
        </div>
        <div style={{
          height: 6, marginTop: 6, background: '#eee', borderRadius: 3, position: 'relative',
        }}
        >
          {/* small centered underline to mimic axis line */}
          <div style={{
            position: 'absolute', left: 6, right: 6, top: '50%', height: 2, background: '#bdbdbd', transform: 'translateY(-50%)', borderRadius: 1,
          }}
          />
        </div>
      </div>
    );
  };

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
        footer: renderScaleFooter(maxVent, { suffix: '%' }),
        ...colProps,
      },
      {
        accessor: 'b12',
        title: 'B12',
        width: 110,
        textAlign: 'left',
        render: ({ b12 }) => renderBar(b12, maxB12, { suffix: '%', percentColor: true }),
        sortable: true,
        footer: renderScaleFooter(maxB12, { suffix: '%' }),
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
      },
      {
        accessor: 'cases',
        title: 'Cases',
        width: 75,
        textAlign: 'right',
        resizable: true,
        sortable: true,
        render: ({ cases }) => renderBar(cases, maxCases, { color: '#2b8be6' }),
        footer: renderScaleFooter(maxCases),
      },
      {
        accessor: 'rbcTransfused',
        // header includes an x-axis style scale (1..N) that aligns with the buckets in each row
        title: 'RBCs Transfused',
        textAlign: 'left',
        render: ({ rbcTransfused }) => (
          <Grid
            style={{
              width: '100%', height: '100%', margin: 0, padding: 0,
            }}
            gutter={0}
            columns={rbcTransfused.length}
            align="stretch"
          >
            {rbcTransfused.map((d, i) => (
              <Grid.Col key={i} span={1} style={{ padding: 0, height: '100%' }}>
                <Tooltip
                  label={`rbc_units: ${d.rbc_units}, percentCases: ${d.percentCases}`}
                  position="top"
                  withArrow
                >
                  <Box
                    style={{
                      height: '100%',
                      width: '100%',
                      backgroundColor: getHeatColor(d.percentCases),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: d.percentCases > 45 ? '#fff' : '#000',
                      fontSize: 11,
                      padding: 0, // ensure no internal padding on the box
                    }}
                  >
                    {d.rbc_units}
                  </Box>
                </Tooltip>
              </Grid.Col>
            ))}
          </Grid>
        ),
        footer: (
          <div style={{ width: '100%' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${maxRbcBuckets}, 1fr)`,
                gap: 0,
              }}
            >
              {Array.from({ length: maxRbcBuckets }).map((_, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: 12 }}>{i + 1}</div>
              ))}
            </div>
          </div>
        ),
      },
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
          borderRadius="sm"
          striped
          withTableBorder={false}
          highlightOnHover
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
