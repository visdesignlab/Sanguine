import { useContext, useMemo, useState } from 'react';
import {
  Title, Stack, Card, Flex, Select,
} from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import { LineChart } from '@mantine/charts';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { mean, rollup, sum } from 'd3';
import { StatsGrid } from './StatsGrid';
import { BloodComponentOptions } from '../../../Types/application';
import { Store } from '../../../Store/Store';

export function PBMDashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive) as any, []);

  const [layouts, setLayouts] = useState<Record<string, Layout[]>>(() => ({
    lg: [
      {
        i: 'RBC Usage', x: 0, y: 0, w: 2, h: 1, maxH: 2
      },
      {
        i: '1', x: 0, y: 1, w: 1, h: 1, maxH: 2
      },
      {
        i: 'Average Length of Stay', x: 1, y: 1, w: 1, h: 1, maxH: 2
      },
      {
        i: '3', x: 0, y: 2, w: 2, h: 1, maxH: 2
      },
    ],
  }));

  // Data ----------------------------

  // Load in data from the store
  const store = useContext(Store);
  const { allVisits } = store;

  // For each visit, get the quarter and rbc units used
  const allChartData = allVisits.map((visit) => ({
    quarter: `${new Date(visit.dsch_dtm).getFullYear()}-Q${Math.floor((new Date(visit.dsch_dtm).getMonth()) / 3) + 1}`,
    rbc: visit.transfusions.reduce((sum, transfusion) => sum + (transfusion.rbc_units || 0), 0),
    los: (new Date(visit.dsch_dtm).getTime() - new Date(visit.adm_dtm).getTime()) / (1000 * 60 * 60 * 24),
  }));

  // Group by quarter
  const quarterlyData = rollup(allChartData, 
    (visit) => ({
      rbc: sum(visit, (d) => d.rbc),
      los: mean(visit, (d) => d.los) || 0,
    }),
    (d) => d.quarter
  );

  // For each chart, map its data to its layout key
  // Sum the total [attribute] per quarter across all visits
  const chartData: Record<string, { date: string, data: number }[] | undefined > = {
    "RBC Usage": Array.from(quarterlyData.entries())
      .map(([quarter, group]) => ({
        // parse quarter to timestamp
        date: quarter,
        data: group.rbc,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    "Average Length of Stay": Array.from(quarterlyData.entries())
      .map(([quarter, group]) => ({
        date: quarter,
        data: group.los,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
  console.log('chartData', chartData);

  const rowHeight = 300;
  return (
    <Stack mb="xl">
      <Title order={3}>Patient Blood Management Dashboard</Title>

      <StatsGrid />
      <ResponsiveGridLayout
        className="layout"
        breakpoints={{
          lg: 852, sm: 0,
        }}
        cols={{
          lg: 2, sm: 1,
        }}
        rowHeight={rowHeight}
        containerPadding={[0, 0]}
        draggableHandle=".move-icon"
        onLayoutChange={(layout: Layout[], allLayouts: Record<string, Layout[]>) => {
          setLayouts(allLayouts);
        }}
      >
        {Object.values(layouts.lg).map(({i, x, y, w, h, maxH}) => (
          <Card key={i} data-grid={{ i, x, y, w, h, maxH }} withBorder>
            <Flex direction="column" gap="sm" h="100%">
              <Flex direction="row" justify="space-between" align="center" h={40} px="md">
                <Flex direction="row" align="center" gap="md" ml={-12}>
                  <IconGripVertical className="move-icon" size={18} color="grey"/>
                  <Title order={4}>
                    {i}
                  </Title>
                </Flex>

                <Select 
                  data={BloodComponentOptions}
                  defaultValue={i}
                  onChange={(value) => {
                    if (value && chartData[value]) {
                      setLayouts((prev) => ({
                        ...prev,
                        lg: prev.lg.map((layout) => (layout.i === i ? { ...layout, i: value } : layout)),
                      }));
                    }
                  }}
                />
              </Flex>
              <LineChart
                h="calc(100% - 40px)"
                data={chartData[i] || []}
                dataKey="date"
                series={[
                  { name: 'data', color: 'indigo.6' },
                ]}
                curveType="linear"
                tickLine="none"
                xAxisProps={{
                  interval: 'equidistantPreserveStart',
                }}
              />
              </Flex>
          </Card>
        ))}
      </ResponsiveGridLayout>
    </Stack>
  );
}
