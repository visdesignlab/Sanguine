import { useContext, useMemo } from 'react';
import {
  Title, Stack, Card, Flex, Select, useMantineTheme, 
} from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import { LineChart } from '@mantine/charts';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { useObserver } from 'mobx-react';
import { StatsGrid } from './StatsGrid';
import { BloodComponentOptions, type DashboardChartLayoutElement } from '../../../Types/application';
import { Store } from '../../../Store/Store';
import classes from '../GridLayoutItem.module.css';

export function PBMDashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive) as any, []);

  const store = useContext(Store);
  const theme = useMantineTheme();

  return useObserver(() => {
    const chartRowHeight = 300;
    // Load in data from the store
    const { layouts, chartData } = store.dashboardStore;

    return (
      <Stack mb="xl" gap="lg">
        <Title order={3}>Patient Blood Management Dashboard</Title>

        <StatsGrid />

        <ResponsiveGridLayout
          className="layout"
          // TODO: Breakpoints should be the same for the stats cards.
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
              className={classes.gridItem}
            >
              {/** All chart content within the card */}
              <Flex direction="column" gap="sm" h="100%">
                {/** Header - Grip, Title, Select Menu */}
                <Flex direction="row" justify="space-between" align="center" px="md">
                  <Flex direction="row" align="center" gap="md" ml={-12}>
                    <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
                    <Title order={4}>
                      {`${aggregation.charAt(0).toUpperCase() + aggregation.slice(1)} of ${BloodComponentOptions.find((opt) => opt.value === yAxisVar)?.label || yAxisVar}`}
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
                {/** Chart - Line Chart */}
                <LineChart
                  h={`calc(100% - (${theme.spacing.md} * 2))`}
                  data={chartData[i] || []}
                  dataKey="quarter"
                  series={[
                    { name: 'data', color: 'indigo.6' },
                  ]}
                  curveType="linear"
                  tickLine="none"
                  xAxisProps={{
                    interval: 'equidistantPreserveStart',
                  }}
                  tooltipAnimationDuration={200}
                />
              </Flex>
            </Card>
          ))}
        </ResponsiveGridLayout>
      </Stack>
    );
  });
}
