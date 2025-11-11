// ...existing code...
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
  Text,
} from '@mantine/core';
import {
  IconGripVertical, IconPlus, IconSearch, IconX,
} from '@tabler/icons-react';
import { DataTable, useDataTableColumns, type DataTableSortStatus } from 'mantine-datatable';
import sortBy from 'lodash/sortBy';
import { useDebouncedValue } from '@mantine/hooks';
import { BarChart, ChartTooltipProps } from '@mantine/charts';
import { interpolateReds } from 'd3';
import { Store } from '../../../../Store/Store';
import { ExploreChartConfig } from '../../../../Types/application';
import { backgroundHoverColor } from '../../../../Theme/mantineTheme';
import './HeatMap.css';

function FooterHistogramTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: 6,
      background: 'rgba(255,255,255,0.95)',
      borderRadius: 4,
      minWidth: 40,
      zIndex: 1000,
    }}
    >
      {payload.map((item: any) => (
        <Text key={item.name} style={{ color: item.color, lineHeight: 1 }} fz={10}>
          {item.name}
          :
          {item.value}
        </Text>
      ))}
    </div>
  );
}

type Row = {
  id: number;
  vent: number; // percent
  b12: number; // percent
  surgeon: string; // array
  cases: number;
  // replaced rbcTransfused array with explicit percent fields per bucket
  percent_1_rbc: number;
  percent_2_rbc: number;
  percent_3_rbc: number;
  percent_4_rbc: number;
  percent_5_rbc: number;
};

const dummyData = [
  {
    id: 1,
    vent: 0,
    b12: 72,
    surgeon: 'Dr. Smith',
    cases: 42,
    percent_1_rbc: 40,
    percent_2_rbc: 30,
    percent_3_rbc: 20,
    percent_4_rbc: 7,
    percent_5_rbc: 3,
  },
  {
    id: 2,
    vent: 85,
    b12: 72,
    surgeon: 'Dr. Lee',
    cases: 42,
    percent_1_rbc: 30,
    percent_2_rbc: 25,
    percent_3_rbc: 20,
    percent_4_rbc: 15,
    percent_5_rbc: 10,
  },
  {
    id: 3,
    vent: 12,
    b12: 8,
    surgeon: 'Dr. Patel',
    cases: 5,
    percent_1_rbc: 0,
    percent_2_rbc: 50,
    percent_3_rbc: 0,
    percent_4_rbc: 50,
    percent_5_rbc: 0,
  },
  {
    id: 4,
    vent: 55,
    b12: 60,
    surgeon: 'Dr. Gomez',
    cases: 18,
    percent_1_rbc: 20,
    percent_2_rbc: 20,
    percent_3_rbc: 10,
    percent_4_rbc: 10,
    percent_5_rbc: 0,
  },
  {
    id: 5,
    vent: 55,
    b12: 60,
    surgeon: 'Dr. Park',
    cases: 18,
    percent_1_rbc: 18,
    percent_2_rbc: 25,
    percent_3_rbc: 18,
    percent_4_rbc: 10,
    percent_5_rbc: 9,
  },
  {
    id: 6,
    vent: 55,
    b12: 60,
    surgeon: 'Dr. Huang',
    cases: 18,
    percent_1_rbc: 33,
    percent_2_rbc: 33,
    percent_3_rbc: 34,
    percent_4_rbc: 0,
    percent_5_rbc: 0,
  },
  {
    id: 7,
    vent: 98,
    b12: 93,
    surgeon: 'Dr. Nguyen',
    cases: 120,
    percent_1_rbc: 28,
    percent_2_rbc: 28,
    percent_3_rbc: 22,
    percent_4_rbc: 12,
    percent_5_rbc: 10,
  },
  {
    id: 8,
    vent: 30,
    b12: 40,
    surgeon: 'Dr. Alvarez',
    cases: 9,
    percent_1_rbc: 33,
    percent_2_rbc: 0,
    percent_3_rbc: 33,
    percent_4_rbc: 34,
    percent_5_rbc: 0,
  },
  {
    id: 9,
    vent: 30,
    b12: 40,
    surgeon: 'Dr. Chen',
    cases: 9,
    percent_1_rbc: 0,
    percent_2_rbc: 0,
    percent_3_rbc: 0,
    percent_4_rbc: 11,
    percent_5_rbc: 0,
  },

  // additional synthetic records
  {
    id: 10,
    vent: 67,
    b12: 70,
    surgeon: 'Dr. Rivera',
    cases: 36,
    percent_1_rbc: 25,
    percent_2_rbc: 20,
    percent_3_rbc: 30,
    percent_4_rbc: 15,
    percent_5_rbc: 10,
  },
  {
    id: 11,
    vent: 45,
    b12: 50,
    surgeon: 'Dr. Johnson',
    cases: 22,
    percent_1_rbc: 40,
    percent_2_rbc: 30,
    percent_3_rbc: 10,
    percent_4_rbc: 15,
    percent_5_rbc: 5,
  },
  {
    id: 12,
    vent: 12,
    b12: 20,
    surgeon: 'Dr. Williams',
    cases: 7,
    percent_1_rbc: 0,
    percent_2_rbc: 60,
    percent_3_rbc: 40,
    percent_4_rbc: 0,
    percent_5_rbc: 0,
  },
  {
    id: 13,
    vent: 90,
    b12: 88,
    surgeon: 'Dr. Brown',
    cases: 80,
    percent_1_rbc: 35,
    percent_2_rbc: 30,
    percent_3_rbc: 20,
    percent_4_rbc: 10,
    percent_5_rbc: 5,
  },
  {
    id: 14,
    vent: 20,
    b12: 18,
    surgeon: 'Dr. Davis',
    cases: 6,
    percent_1_rbc: 0,
    percent_2_rbc: 0,
    percent_3_rbc: 80,
    percent_4_rbc: 20,
    percent_5_rbc: 0,
  },
  {
    id: 15,
    vent: 75,
    b12: 64,
    surgeon: 'Dr. Miller',
    cases: 48,
    percent_1_rbc: 30,
    percent_2_rbc: 25,
    percent_3_rbc: 20,
    percent_4_rbc: 15,
    percent_5_rbc: 10,
  },
  {
    id: 16,
    vent: 58,
    b12: 55,
    surgeon: 'Dr. Wilson',
    cases: 28,
    percent_1_rbc: 22,
    percent_2_rbc: 22,
    percent_3_rbc: 22,
    percent_4_rbc: 18,
    percent_5_rbc: 16,
  },
  {
    id: 17,
    vent: 33,
    b12: 36,
    surgeon: 'Dr. Moore',
    cases: 12,
    percent_1_rbc: 50,
    percent_2_rbc: 30,
    percent_3_rbc: 10,
    percent_4_rbc: 10,
    percent_5_rbc: 0,
  },
  {
    id: 18,
    vent: 82,
    b12: 79,
    surgeon: 'Dr. Taylor',
    cases: 64,
    percent_1_rbc: 30,
    percent_2_rbc: 25,
    percent_3_rbc: 20,
    percent_4_rbc: 15,
    percent_5_rbc: 10,
  },
  {
    id: 19,
    vent: 14,
    b12: 10,
    surgeon: 'Dr. Anderson',
    cases: 4,
    percent_1_rbc: 0,
    percent_2_rbc: 75,
    percent_3_rbc: 0,
    percent_4_rbc: 25,
    percent_5_rbc: 0,
  },
  {
    id: 20,
    vent: 49,
    b12: 52,
    surgeon: 'Dr. Thomas',
    cases: 20,
    percent_1_rbc: 30,
    percent_2_rbc: 30,
    percent_3_rbc: 20,
    percent_4_rbc: 10,
    percent_5_rbc: 10,
  },
  {
    id: 21,
    vent: 71,
    b12: 68,
    surgeon: 'Dr. Jackson',
    cases: 44,
    percent_1_rbc: 28,
    percent_2_rbc: 26,
    percent_3_rbc: 24,
    percent_4_rbc: 12,
    percent_5_rbc: 10,
  },
  {
    id: 22,
    vent: 27,
    b12: 30,
    surgeon: 'Dr. White',
    cases: 11,
    percent_1_rbc: 10,
    percent_2_rbc: 60,
    percent_3_rbc: 10,
    percent_4_rbc: 20,
    percent_5_rbc: 0,
  },
  {
    id: 23,
    vent: 94,
    b12: 90,
    surgeon: 'Dr. Harris',
    cases: 95,
    percent_1_rbc: 40,
    percent_2_rbc: 30,
    percent_3_rbc: 15,
    percent_4_rbc: 10,
    percent_5_rbc: 5,
  },
  {
    id: 24,
    vent: 38,
    b12: 35,
    surgeon: 'Dr. Martin',
    cases: 15,
    percent_1_rbc: 40,
    percent_2_rbc: 30,
    percent_3_rbc: 20,
    percent_4_rbc: 5,
    percent_5_rbc: 5,
  },
  {
    id: 25,
    vent: 60,
    b12: 58,
    surgeon: 'Dr. Thompson',
    cases: 34,
    percent_1_rbc: 30,
    percent_2_rbc: 25,
    percent_3_rbc: 20,
    percent_4_rbc: 15,
    percent_5_rbc: 10,
  },
  {
    id: 26,
    vent: 52,
    b12: 48,
    surgeon: 'Dr. Garcia',
    cases: 26,
    percent_1_rbc: 24,
    percent_2_rbc: 24,
    percent_3_rbc: 22,
    percent_4_rbc: 18,
    percent_5_rbc: 12,
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
    // Use perceptual Lab interpolation between the light and dark colors.
    // Memoize the interpolator to avoid recreating it on every call.
    // percent is expected 0..100, convert to 0..1 for the interpolator.
    const t = Math.max(0, Math.min(1, percent / 100));
    // create interpolator once

    return interpolateReds(t);
  };

  // compute maxima for scaling horizontal bars
  const { maxVent, maxB12, maxCases } = useMemo(() => {
    const maxVentVal = Math.max(100, ...records.map((r) => r.vent));
    const maxB12Val = Math.max(100, ...records.map((r) => r.b12));
    const maxCasesVal = Math.max(1, ...records.map((r) => r.cases));
    return { maxVent: maxVentVal, maxB12: maxB12Val, maxCases: maxCasesVal };
  }, [records]);

  // fixed number of RBC buckets (data now provides percent_1_rbc ... percent_5_rbc)
  const NUM_RBC_BUCKETS = 5;

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

  // compute per-RBC-unit histogram bins: for each unit index collect percent_*_rbc across rows
  const rbcBins = useMemo(() => Array.from({ length: NUM_RBC_BUCKETS }).map((_, idx) => {
    const key = `percent_${idx + 1}_rbc` as keyof Row;
    const values = records.map((r) => Number(r[key] ?? 0));
    return computeBins(values);
  }), [records]);

  const renderHistogramFooter = (bins: number[], useReds?: boolean) => {
    // if no bins, keep layout stable
    if (!bins || bins.length === 0) {
      return null;
    }

    // build a color for each bin
    const colors = bins.map((_, i) => {
      if (useReds) {
        const t = bins.length > 1 ? i / (bins.length - 1) : 0;
        return interpolateReds(t);
      }
      return '#8c8c8c';
    });

    const data = [
      bins.reduce((acc, count, i) => {
        acc[`bin${i}`] = count;
        return acc;
      }, {} as Record<string, any>),
    ];

    const series = bins.map((_, i) => ({ name: `bin${i}`, color: colors[i] }));

    console.log('renderHistogramFooter', { bins, data, series });

    return (
      <div style={{ width: 'calc(100% - 3px)', borderBottom: `1px solid ${useReds ? interpolateReds(0.25) : '#8c8c8c'}`, overflow: 'hidden' }}>
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
          }}
          tooltipProps={{
            content: ({ active, payload }) => (
              <FooterHistogramTooltip
                active={active}
                payload={payload}
              />
            ),
          }}
        />
      </div>
    );
  };

  // helper to render a horizontal bar behind the numeric label
  const renderBar = (value: number, max: number, opts?: { suffix?: string; color?: string; percentColor?: boolean }) => {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    const fillColor = '#8c8c8c';
    const percent = Number(value ?? 0);
    const hasValue = percent !== 0;
    return (
      <Tooltip
        label={hasValue ? `${percent}% of cases` : 'No data'}
        position="top"
        withArrow
      >
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
      </Tooltip>
    );
  };

  // (removed old numeric scale footer — replaced by histograms)

  // build dynamic RBC unit columns (one column per unit bucket)
  const rbcUnitColumns = Array.from({ length: NUM_RBC_BUCKETS }).map((_, idx) => {
    const unitIndex = idx; // 0-based index into percent_*_rbc fields
    const titleText = (idx + 1) === 5 ? '5+ RBCs' : `${idx + 1} ${idx === 0 ? 'RBC' : 'RBCs'}`;
    const accessor = `rbc_${idx + 1}`;
    const percentKey = `percent_${idx + 1}_rbc` as keyof Row;

    return {
      accessor,
      title: (
        <Tooltip
          label={(idx + 1) === 5
            ? '5+ RBCs Transfused Intraoperatively'
            : `${idx + 1} ${idx === 0 ? 'RBC' : 'RBCs'} Transfused Intraoperatively`}
          position="top"
          withArrow
        >
          <div style={{ display: 'inline-block', cursor: 'help' }}>{titleText}</div>
        </Tooltip>
      ),
      width: 72,
      render: (row: Row) => {
        const percent = Number(row[percentKey] ?? 0);
        const hasValue = percent !== 0;
        return (
          <Tooltip
            // tooltip now shows percent only (source data no longer contains rbc_units)
            label={hasValue ? `${percent}% of cases` : 'No data'}
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
                ? `${percent}%`
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
      sortable: true,
      // use the per-unit histogram computed above; fallback to empty bins if missing
      footer: renderHistogramFooter(rbcBins[unitIndex] ?? new Array(10).fill(0), true),
      ...{ ...colProps, draggable: false },
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
