import { useContext, useMemo } from 'react';
import {
  Title, Stack, Card, Flex, Select,
} from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import { LineChart } from '@mantine/charts';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { useObserver } from 'mobx-react';
import { StatsGrid } from './StatsGrid';
import { BloodComponentOptions, type DashboardChartLayoutElement } from '../../../Types/application';
import { Store } from '../../../Store/Store';

export function PBMDashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive) as any, []);

  const store = useContext(Store);

  return useObserver(() => {
    const chartRowHeight = 300;
    // Load in data from the store
    const { layouts, chartData } = store.dashboardStore;

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
          rowHeight={chartRowHeight}
          containerPadding={[0, 0]}
          draggableHandle=".move-icon"
          onLayoutChange={(_: never, newLayouts: Record<'lg', Layout[]>) => {
            newLayouts.lg.forEach((l) => {
              const existingLayoutIndex = layouts.lg.findIndex((el) => el.i === l.i);

              if (existingLayoutIndex !== -1) {
                layouts.lg[existingLayoutIndex] = {
                  ...layouts.lg[existingLayoutIndex],
                  x: l.x,
                  y: l.y,
                  w: l.w,
                  h: l.h,
                };
              }
            });
          }}
        >
          {Object.values(layouts.lg).map(({
            i, x, y, w, h, maxH, yAxisVar, aggregation,
          }) => (
            <Card
              key={i}
              data-grid={{
                i, x, y, w, h, maxH,
              }}
              withBorder
            >
              <Flex direction="column" gap="sm" h="100%">
                <Flex direction="row" justify="space-between" align="center" h={40} px="md">
                  <Flex direction="row" align="center" gap="md" ml={-12}>
                    <IconGripVertical className="move-icon" size={18} color="grey" />
                    <Title order={4}>
                      {`${aggregation} of ${yAxisVar}`}
                    </Title>
                  </Flex>

                  <Select
                    data={BloodComponentOptions}
                    defaultValue={yAxisVar}
                    onChange={(value) => {
                      const existingLayoutIndex = layouts.lg.findIndex((el) => el.i === i);
                      const existingLayout = layouts.lg[existingLayoutIndex];
                      if (existingLayout) {
                        layouts.lg[existingLayoutIndex].yAxisVar = value as DashboardChartLayoutElement['yAxisVar'];
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
  });
}
