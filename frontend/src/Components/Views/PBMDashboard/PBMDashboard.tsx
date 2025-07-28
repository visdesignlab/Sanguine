import { useContext, useMemo } from 'react';
import {
  Title, Stack, Card, Flex, Select, useMantineTheme,
} from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import { LineChart } from '@mantine/charts';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { useObserver } from 'mobx-react';
import { StatsGrid } from './StatsGrid';
import { BloodComponentOptions, type DashboardChartConfig } from '../../../Types/application';
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
    const { chartConfigs, chartData } = store.dashboardStore;

    return (
      <Stack mb="xl" gap="lg">
        <Title order={3}>Patient Blood Management Dashboard</Title>

        <StatsGrid />

        <ResponsiveGridLayout
          className="layout"
          // TODO: Breakpoints should be the same for the stats cards.
          breakpoints={{
            main: 852, sm: 0,
          }}
          cols={{
            main: 2, sm: 1,
          }}
          rowHeight={chartRowHeight}
          containerPadding={[0, 0]}
          draggableHandle=".move-icon"
          // Update layouts in the store when layout changes
          onLayoutChange={(_: never, newLayouts: Record<string, Layout[]>) => {
            // For each new layout, update the store's layouts
            Object.entries(newLayouts).forEach(([key, newLayoutArr]) => {
              if (!chartConfigs[key]) return;
              // For every matching layout in the store, update with new one
              chartConfigs[key] = chartConfigs[key].map((item) => {
                const updated = newLayoutArr.find((l) => l.i === item.i);
                return updated
                  ? {
                    ...item, x: updated.x, y: updated.y, w: updated.w, h: updated.h,
                  }
                  : item;
              });
            });
          }}
        >
          {Object.values(chartConfigs.main).map(({
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
                      const existingLayoutIndex = chartConfigs.main.findIndex((el) => el.i === i);
                      const existingLayout = chartConfigs.main[existingLayoutIndex];
                      if (existingLayout) {
                        chartConfigs.main[existingLayoutIndex].yAxisVar = value as DashboardChartConfig['yAxisVar'];
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
