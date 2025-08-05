import { useCallback, useContext, useMemo } from 'react';
import {
  Title, Stack, Card, Flex, Select, useMantineTheme, Button,
  CloseButton,
  ActionIcon,
} from '@mantine/core';
import { IconGripVertical, IconPercentage, IconPlus } from '@tabler/icons-react';
import { LineChart } from '@mantine/charts';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { useObserver } from 'mobx-react';
import { StatsGrid } from './StatsGrid';
import {
  BLOOD_COMPONENT_OPTIONS, GUIDELINE_ADHERENCE_OPTIONS, OUTCOME_OPTIONS, PROPHYL_MED_OPTIONS, type DashboardChartConfig,
} from '../../../Types/application';
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import classes from '../GridLayoutItem.module.css';

export function PBMDashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive) as any, []);

  const store = useContext(Store);
  const theme = useMantineTheme();

  // Get theme constants
  const { buttonIconSize, cardIconStroke } = useThemeConstants();

  const handleRemoveChart = useCallback((id: string) => {
    store.dashboardStore.removeChart(id);
  }, [store.dashboardStore]);

  const chartOptions = [...BLOOD_COMPONENT_OPTIONS, ...GUIDELINE_ADHERENCE_OPTIONS, ...OUTCOME_OPTIONS, ...PROPHYL_MED_OPTIONS];

  return useObserver(() => {
    const chartRowHeight = 300;

    return (
      <Stack mb="xl" gap="lg">
        {/** Title, Add Chart Button */}
        <Flex direction="row" justify="space-between" align="center">
          <Title order={3}>Patient Blood Management Dashboard</Title>
          <Button>
            <IconPlus size={buttonIconSize} stroke={cardIconStroke} style={{ marginRight: 6 }} />
            Add Chart
          </Button>
        </Flex>

        <StatsGrid />

        <ResponsiveGridLayout
          className="layout"
          breakpoints={{
            main: 852, sm: 0,
          }}
          cols={{
            main: 2, sm: 1,
          }}
          rowHeight={chartRowHeight}
          containerPadding={[0, 0]}
          draggableHandle=".move-icon"
          onLayoutChange={(currentLayout: Layout[], newLayouts: Record<string, Layout[]>) => {
            store.dashboardStore.chartLayouts = newLayouts;
          }}
          layouts={store.dashboardStore.chartLayouts}
        >
          {Object.values(store.dashboardStore.chartConfigs).map(({
            i, yAxisVar, aggregation,
          }) => (
            <Card
              key={i}
              withBorder
              className={classes.gridItem}
            >
              {/** All chart content within the card */}
              <Flex direction="column" gap="sm" h="100%">
                {/** Header - Grip, Title, Select Menu */}
                <Flex direction="row" justify="space-between" align="center" pl="md">
                  <Flex direction="row" align="center" gap="md" ml={-12}>
                    <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
                    <Title order={4}>
                      {`${aggregation.charAt(0).toUpperCase() + aggregation.slice(1)}${aggregation === 'sum' ? ' of' : ''} ${chartOptions.find((opt) => opt.value === yAxisVar)?.label || yAxisVar}${aggregation === 'average' ? ' Per Visit' : ''}`}
                    </Title>
                  </Flex>

                  <Flex direction="row" align="center" gap="sm">
                    <ActionIcon variant="subtle" onClick={() => store.dashboardStore.setChartConfig(i, { i, yAxisVar, aggregation: aggregation === 'sum' ? 'average' : 'sum' })}>
                      <IconPercentage size={18} color={aggregation === 'average' ? theme.colors.indigo[6] : theme.colors.gray[6]} stroke={3} />
                    </ActionIcon>
                    {/** Select Attribute Menu */}
                    <Select
                      data={chartOptions}
                      defaultValue={yAxisVar}
                      onChange={(value) => {
                        store.dashboardStore.setChartConfig(i, {
                          i,
                          yAxisVar: value as DashboardChartConfig['yAxisVar'],
                          aggregation,
                        });
                      }}
                    />

                    <CloseButton onClick={() => handleRemoveChart(i)} />
                  </Flex>
                </Flex>
                {/** Chart - Line Chart */}
                <LineChart
                  h={`calc(100% - (${theme.spacing.md} * 2))`}
                  data={store.dashboardStore.chartData[`${aggregation}_${yAxisVar}`] || []}
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
