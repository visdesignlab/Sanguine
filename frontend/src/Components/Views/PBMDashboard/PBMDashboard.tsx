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
} from '../../../Types/application';
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import classes from '../GridLayoutItem.module.css';

// Custom tooltip component
function CustomTooltip({ active, payload, label, yAxisVar }: any & { yAxisVar: string }) {
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
        {formatValue(payload[0].value)}
      </Title>
    </Paper>
  );
}

export function PBMDashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive) as any, []);

  const store = useContext(Store);
  const theme = useMantineTheme();

  // Get theme constants
  const { buttonIconSize, cardIconSize, cardIconStroke } = useThemeConstants();

  // Modal state
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedAggregation, setSelectedAggregation] = useState<string>('Average');
  const [selectedAttribute, setSelectedAttribute] = useState<string>('');
  const [modalType, setModalType] = useState<'chart' | 'stat'>('chart');

  const handleRemoveChart = useCallback((id: string) => {
    store.dashboardStore.removeChart(id);
  }, [store.dashboardStore]);

  const handleAddStat = useCallback(() => {
    setModalType('stat');
    open();
  }, [open]);

  const handleAddChart = useCallback(() => {
    setModalType('chart');
    open();
  }, [open]);

  const handleDoneAdd = useCallback(() => {
    if (modalType === 'chart') {
      store.dashboardStore.addChart({
        i: `chart-${Date.now()}`, // Unique ID for the chart
        yAxisVar: selectedAttribute as DashboardChartConfig['yAxisVar'],
        aggregation: selectedAggregation,
      });
    } else {
      // Add stat with proper typing
      store.dashboardStore.addStat(
        selectedAttribute as DashboardStatConfig['var'],
        selectedAggregation as DashboardStatConfig['aggregation'],
      );
    }

    close();
  }, [selectedAggregation, selectedAttribute, modalType, close, store.dashboardStore]);

  const aggregationOptions = Object.entries(AGGREGATION_OPTIONS).map(([value, { label }]) => ({ value, label }));

  // console.log("Stat Data:", store.dashboardStore.statData);
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
              label="Select Aggregation"
              placeholder="Choose aggregation type"
              data={aggregationOptions}
              value={selectedAggregation}
              onChange={(value) => setSelectedAggregation(value || 'Average')}
            />
            <Select
              label="Select Attribute"
              placeholder={`Choose ${modalType} attribute`}
              data={dashboardYAxisOptions}
              value={selectedAttribute}
              onChange={(value) => setSelectedAttribute(value || '')}
            />
            <Button
              mt="md"
              onClick={handleDoneAdd}
              disabled={!selectedAttribute}
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
                      {store.dashboardStore.generateChartTitle(yAxisVar, aggregation)}
                    </Title>
                  </Flex>

                  <Flex direction="row" align="center" gap="sm">
                    <ActionIcon variant="subtle" onClick={() => store.dashboardStore.setChartConfig(i, { i, yAxisVar, aggregation: aggregation === 'sum' ? 'avg' : 'sum' })}>
                      <IconPercentage size={18} color={aggregation === 'avg' ? theme.colors.indigo[6] : theme.colors.gray[6]} stroke={3} />
                    </ActionIcon>
                    {/** Select Attribute Menu */}
                    <Select
                      data={dashboardYAxisOptions}
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
