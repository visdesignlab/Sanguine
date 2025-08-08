import {
  useCallback, useContext, useMemo, useState,
} from 'react';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { useObserver } from 'mobx-react';

// Mantine
import { useDisclosure } from '@mantine/hooks';
import {
  useMantineTheme, Title, Stack, Card, Flex, Select, Button, CloseButton, ActionIcon, Menu, Modal,
} from '@mantine/core';
import { LineChart } from '@mantine/charts';
import {
  IconChartLine, IconGripVertical, IconNumbers, IconPercentage, IconPlus,
} from '@tabler/icons-react';

// Dashboard
import { StatsGrid } from './StatsGrid';
import { DashboardChartTooltip } from './DashboardChartTooltip';
import classes from '../GridLayoutItem.module.css';
import { generateChartTitle } from '../../../Utils/dashboard';

// Application
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import {
  dashboardYAxisOptions,
  AGGREGATION_OPTIONS,
  dashboardXAxisOptions,
  type DashboardChartConfig,
  DashboardStatConfig,
} from '../../../Types/application';

/**
 * @returns Patient Blood Management Dashboard - Stats and Charts
 */
export function Dashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive) as any, []);

  // --- Store and styles ---
  const store = useContext(Store);
  const theme = useMantineTheme();
  const { buttonIconSize, cardIconSize, cardIconStroke } = useThemeConstants();

  // --- Charts ---
  const aggregationOptions = Object.entries(AGGREGATION_OPTIONS).map(([value, { label }]) => ({ value, label }));

  // Remove chart from dashboard
  const handleRemoveChart = useCallback((chartId: string) => {
    store.dashboardStore.removeChart(chartId);
  }, [store.dashboardStore]);

  // --- Add Item to Dashboard ---
  // Add Item Modal state
  const [isAddItemModalOpen, { open, close }] = useDisclosure(false);
  const [itemModalType, setItemModalType] = useState<'chart' | 'stat'>('chart');

  // Add Item Modal selections
  const [selectedAggregation, setSelectedAggregation] = useState<string>('sum');
  const [selectedXAxisVar, setSelectedXAxisVar] = useState<string>('quarter'); // X-axis selection
  const [selectedYAxisVar, setSelectedYAxisVar] = useState<string>(''); // Y-axis selection

  const openAddChartModal = useCallback(() => {
    setItemModalType('chart');
    setSelectedAggregation('sum'); // Default y-axis aggregation
    setSelectedXAxisVar('quarter'); // Default x-axis aggregation
    setSelectedYAxisVar('');
    open();
  }, [open]);

  const openAddStatModal = useCallback(() => {
    setItemModalType('stat');
    setSelectedAggregation('sum'); // Default aggregation for stat
    setSelectedYAxisVar('');
    open();
  }, [open]);

  const addItemToDashboard = useCallback(() => {
    if (itemModalType === 'chart') {
      // Add chart
      store.dashboardStore.addChart({
        chartId: `chart-${Date.now()}`,
        xAxisVar: selectedXAxisVar as DashboardChartConfig['xAxisVar'],
        yAxisVar: selectedYAxisVar as DashboardChartConfig['yAxisVar'],
        aggregation: selectedAggregation as DashboardChartConfig['aggregation'],
      });
    } else {
      // Add stat
      store.dashboardStore.addStat(
        selectedYAxisVar as DashboardStatConfig['var'],
        selectedAggregation as DashboardStatConfig['aggregation'],
      );
    }
    // Close modal after adding item
    close();
  }, [selectedAggregation, selectedXAxisVar, selectedYAxisVar, itemModalType, close, store.dashboardStore]);

  // --- Render Dashboard ---
  return useObserver(() => {
    const chartRowHeight = 300;

    return (
      <Stack mb="xl" gap="lg">
        <Flex direction="row" justify="space-between" align="center">
          {/** Dashboard Title */}
          <Title order={3}>Patient Blood Management Dashboard</Title>
          {/** Add Item Button */}
          <Menu width="md">
            <Menu.Target>
              <Button>
                <IconPlus size={buttonIconSize} stroke={cardIconStroke} style={{ marginRight: 6 }} />
                Add Item
              </Button>
            </Menu.Target>
            {/** Add Chart or Add Stat */}
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconChartLine size={cardIconSize} stroke={cardIconStroke} />}
                onClick={openAddChartModal}
              >
                Add Chart
              </Menu.Item>
              <Menu.Item
                leftSection={<IconNumbers size={cardIconSize} stroke={cardIconStroke} />}
                onClick={openAddStatModal}
              >
                Add Stat
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Flex>
        {/** Modal when add chart or stat clicked */}
        <Modal
          opened={isAddItemModalOpen}
          onClose={close}
          title={`Add ${itemModalType === 'chart' ? 'Chart' : 'Stat'} To Dashboard`}
          centered
        >
          <Stack gap="md">
            {/** Modal - choose aggregation for chart or stat */}
            <Select
              label="Aggregation"
              placeholder="Choose aggregation type"
              data={aggregationOptions}
              value={selectedAggregation}
              onChange={(value) => setSelectedAggregation(value || 'Average')}
            />
            {/** Modal - choose y-axis for chart or stat */}
            <Select
              label={`${itemModalType === 'chart' ? 'Metric (Y-Axis)' : 'Metric'}`}
              placeholder={`Choose ${itemModalType} metric`}
              data={dashboardYAxisOptions}
              value={selectedYAxisVar}
              onChange={(value) => setSelectedYAxisVar(value || '')}
            />
            {/** Modal - choose x-axis for chart only */}
            {itemModalType === 'chart' && (
              <Select
                label="Time Period (X-Axis)"
                placeholder="Choose time aggregation"
                data={dashboardXAxisOptions}
                value={selectedXAxisVar}
                onChange={(value) => setSelectedXAxisVar(value || 'quarter')}
              />
            )}
            {/** Done Button - Add chart or stat to dashboard */}
            <Button
              mt="md"
              onClick={addItemToDashboard}
              disabled={!selectedYAxisVar || (itemModalType === 'chart' && !selectedXAxisVar)}
              fullWidth
            >
              Done
            </Button>
          </Stack>
        </Modal>
        {/** Stats Grid - Display stats at the top of the dashboard */}
        <StatsGrid />
        {/** Layout for charts */}
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
          {/** Render each chart within the configuration */}
          {Object.values(store.dashboardStore.chartConfigs).map(({
            chartId, yAxisVar, xAxisVar, aggregation,
          }) => (
            <Card
              key={chartId}
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
                      {generateChartTitle(yAxisVar, aggregation)}
                    </Title>
                  </Flex>

                  <Flex direction="row" align="center" gap="sm">
                    <ActionIcon
                      variant="subtle"
                      onClick={() => store.dashboardStore.setChartConfig(chartId, {
                        chartId, yAxisVar, xAxisVar, aggregation: aggregation === 'sum' ? 'avg' : 'sum',
                      })}
                    >
                      <IconPercentage size={18} color={aggregation === 'avg' ? theme.colors.indigo[6] : theme.colors.gray[6]} stroke={3} />
                    </ActionIcon>
                    {/** Select Attribute Menu */}
                    <Select
                      data={dashboardYAxisOptions}
                      defaultValue={yAxisVar}
                      onChange={(value) => {
                        store.dashboardStore.setChartConfig(chartId, {
                          chartId,
                          xAxisVar,
                          yAxisVar: value as DashboardChartConfig['yAxisVar'],
                          aggregation,
                        });
                      }}
                    />

                    <CloseButton onClick={() => handleRemoveChart(chartId)} />
                  </Flex>
                </Flex>
                {/** Chart - Line Chart */}
                <LineChart
                  h={`calc(100% - (${theme.spacing.md} * 2))`}
                  data={store.dashboardStore.chartData[`${aggregation}_${yAxisVar}_${xAxisVar}`] || []}
                  dataKey="timePeriod"
                  series={[
                    { name: 'data', color: 'indigo.6' },
                  ]}
                  curveType="linear"
                  tickLine="none"
                  xAxisProps={{
                    interval: 'equidistantPreserveStart',
                  }}
                  tooltipAnimationDuration={200}
                  tooltipProps={{
                    content: ({ active, payload, label }) => (
                      <DashboardChartTooltip
                        active={active}
                        payload={payload}
                        label={label}
                        yAxisVar={yAxisVar}
                        aggregation={aggregation}
                      />
                    ),
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
