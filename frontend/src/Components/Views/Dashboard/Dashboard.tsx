import {
  useCallback, useContext, useMemo, useState,
} from 'react';
import {
  Title, Stack, Card, Flex, Select, useMantineTheme, Button,
  CloseButton,
  ActionIcon,
  Menu,
  Modal,
  Paper,
} from '@mantine/core';
import {
  IconChartLine, IconGripVertical, IconNumbers, IconPercentage, IconPlus,
} from '@tabler/icons-react';
import { LineChart } from '@mantine/charts';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { useObserver } from 'mobx-react';
import { useDisclosure } from '@mantine/hooks';
import { StatsGrid } from './StatsGrid';
import {
  dashboardYAxisOptions, AGGREGATION_OPTIONS, type DashboardChartConfig,
  DashboardStatConfig,
  dashboardXAxisOptions,
} from '../../../Types/application';
import { generateChartTitle } from '../../../Utils/dashboard';
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import classes from '../GridLayoutItem.module.css';

// --- Custom tooltip component ---
function CustomTooltip({
  active, payload, label, yAxisVar,
}: {
  active?: boolean;
  payload?: Array<{
    value?: number;
    name?: string;
    color?: string;
  }>;
  label?: string;
  yAxisVar: string;
}) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  // Find the option that matches this variable to get the unit
  const yAxisOption = dashboardYAxisOptions.find((opt) => opt.value === yAxisVar);
  const unit = yAxisOption?.unit || '';

  // Format the value based on unit type
  const formatValue = (value: number) => {
    if (unit === '%') {
      return `${(value * 100).toFixed(1)}%`;
    }
    return `${value.toLocaleString()} ${unit}`;
  };

  return (
    <Paper p="xs" shadow="md" radius="sm" style={{ border: '1px solid #e9ecef' }}>
      <Title size="sm" fw={500} mb={2}>
        {label}
      </Title>
      <Title size="sm" c="dimmed">
        {formatValue(payload[0].value ?? 0)}
      </Title>
    </Paper>
  );
}

export function Dashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive) as any, []);

  const store = useContext(Store);
  const theme = useMantineTheme();

  // Get theme constants
  const { buttonIconSize, cardIconSize, cardIconStroke } = useThemeConstants();

  // Modal state
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedAggregation, setSelectedAggregation] = useState<string>('sum');
  const [selectedXAxisVar, setSelectedXAxisVar] = useState<string>('quarter'); // X-axis selection
  const [selectedYAxisVar, setSelectedYAxisVar] = useState<string>(''); // Y-axis selection
  const [modalType, setModalType] = useState<'chart' | 'stat'>('chart');

  const handleAddStat = useCallback(() => {
    setModalType('stat');
    setSelectedAggregation('sum'); // Reset to default for stats
    setSelectedYAxisVar('');
    open();
  }, [open]);

  const handleAddChart = useCallback(() => {
    setModalType('chart');
    setSelectedAggregation('sum'); // Reset to default for charts
    setSelectedXAxisVar('quarter'); // Reset to default x-axis
    setSelectedYAxisVar('');
    open();
  }, [open]);

  const handleDoneAdd = useCallback(() => {
    if (modalType === 'chart') {
      store.dashboardStore.addChart({
        chartId: `chart-${Date.now()}`, // Unique ID for the chart
        xAxisVar: selectedXAxisVar as DashboardChartConfig['xAxisVar'],
        yAxisVar: selectedYAxisVar as DashboardChartConfig['yAxisVar'],
        aggregation: selectedAggregation as DashboardChartConfig['aggregation'],
      });
    } else {
      // Add stat with proper typing
      store.dashboardStore.addStat(
        selectedYAxisVar as DashboardStatConfig['var'],
        selectedAggregation as DashboardStatConfig['aggregation'],
      );
    }

    close();
  }, [selectedAggregation, selectedXAxisVar, selectedYAxisVar, modalType, close, store.dashboardStore]);

  const handleRemoveChart = useCallback((chartId: string) => {
    store.dashboardStore.removeChart(chartId);
  }, [store.dashboardStore]);

  const aggregationOptions = Object.entries(AGGREGATION_OPTIONS).map(([value, { label }]) => ({ value, label }));

  return useObserver(() => {
    const chartRowHeight = 300;

    return (
      <Stack mb="xl" gap="lg">
        {/** Title, Add Chart Button */}
        <Flex direction="row" justify="space-between" align="center">
          <Title order={3}>Patient Blood Management Dashboard</Title>
          <Menu width="md">
            <Menu.Target>
              <Button>
                <IconPlus size={buttonIconSize} stroke={cardIconStroke} style={{ marginRight: 6 }} />
                Add Item
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconChartLine size={cardIconSize} stroke={cardIconStroke} />}
                onClick={handleAddChart}
              >
                Add Chart
              </Menu.Item>
              <Menu.Item
                leftSection={<IconNumbers size={cardIconSize} stroke={cardIconStroke} />}
                onClick={handleAddStat}
              >
                Add Stat
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Flex>
        {/** Add Item Modal */}
        <Modal
          opened={opened}
          onClose={close}
          title={`Add ${modalType === 'chart' ? 'Chart' : 'Stat'} To Dashboard`}
          centered
        >
          <Stack gap="md">
            <Select
              label="Aggregation"
              placeholder="Choose aggregation type"
              data={aggregationOptions}
              value={selectedAggregation}
              onChange={(value) => setSelectedAggregation(value || 'Average')}
            />
            <Select
              label={`${modalType === 'chart' ? 'Metric (Y-Axis)' : 'Metric'}`}
              placeholder={`Choose ${modalType} metric`}
              data={dashboardYAxisOptions}
              value={selectedYAxisVar}
              onChange={(value) => setSelectedYAxisVar(value || '')}
            />
            {modalType === 'chart' && (
              <Select
                label="Time Period (X-Axis)"
                placeholder="Choose time aggregation"
                data={dashboardXAxisOptions}
                value={selectedXAxisVar}
                onChange={(value) => setSelectedXAxisVar(value || 'quarter')}
              />
            )}
            <Button
              mt="md"
              onClick={handleDoneAdd}
              disabled={!selectedYAxisVar || (modalType === 'chart' && !selectedXAxisVar)}
              fullWidth
            >
              Done
            </Button>
          </Stack>
        </Modal>

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
                      <CustomTooltip active={active} payload={payload} label={label} yAxisVar={yAxisVar} />
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
