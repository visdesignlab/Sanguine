import {
  useCallback, useContext, useMemo, useState,
} from 'react';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { useObserver } from 'mobx-react';

// Mantine
import { useDisclosure } from '@mantine/hooks';
import {
  useMantineTheme, Title, Stack, Card, Flex, Select, Button, CloseButton, ActionIcon, Menu, Modal, Divider, Tooltip,
  LoadingOverlay,
  Box,
} from '@mantine/core';
import { BarChart, LineChart } from '@mantine/charts';
import {
  IconCalendarCode, IconGripVertical, IconNumbers, IconPercentage, IconPlus, IconChartBar, IconChartLine,
} from '@tabler/icons-react';

// Dashboard
import { StatsGrid } from './StatsGrid';
import { DashboardChartTooltip } from './DashboardChartTooltip';
import classes from '../GridLayoutItem.module.css';

// Application
import { Store } from '../../../Store/Store';
import { smallHoverColor, smallSelectColor, useThemeConstants } from '../../../Theme/mantineTheme';
import {
  dashboardYAxisOptions,
  AGGREGATION_OPTIONS,
  dashboardXAxisOptions,
  type DashboardChartConfig,
  DashboardStatConfig,
  chartColors,
} from '../../../Types/application';
import { formatValueForDisplay } from '../../../Utils/dashboard';

/**
 * @returns Patient Blood Management Dashboard - Stats and Charts
 */
export function DashboardView() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive) as any, []);

  // --- Store and styles ---
  const store = useContext(Store);
  const theme = useMantineTheme();
  const {
    buttonIconSize, cardIconSize, cardIconStroke, toolbarWidth,
  } = useThemeConstants();

  // --- Charts ---
  const aggregationOptions = Object.entries(AGGREGATION_OPTIONS).map(([value, { label }]) => ({ value, label }));

  // Remove chart from dashboard
  const handleRemoveChart = useCallback((chartId: string) => {
    store.dashboardStore.removeChart(chartId);
  }, [store.dashboardStore]);

  // Handle Chart Hover
  const [hoveredChartId, setHoveredChartId] = useState<string | null>(null);

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
    // Infer chartType
      const chartType: DashboardChartConfig['chartType'] = 'line';
      store.dashboardStore.addChart({
        chartId: `chart-${Date.now()}`,
        xAxisVar: selectedXAxisVar as DashboardChartConfig['xAxisVar'],
        yAxisVar: selectedYAxisVar as DashboardChartConfig['yAxisVar'],
        aggregation: selectedAggregation as DashboardChartConfig['aggregation'],
        chartType,
      });
    } else {
    // Add stat
      store.dashboardStore.addStat(
      selectedYAxisVar as DashboardStatConfig['yAxisVar'],
      selectedAggregation as DashboardStatConfig['aggregation'],
      );
    }
    close();
  }, [selectedAggregation, selectedXAxisVar, selectedYAxisVar, itemModalType, close, store.dashboardStore]);
  // --- Render Dashboard ---
  return useObserver(() => {
    const chartRowHeight = 300;
    return (
      <Stack mb="xl" gap="lg">
        <Flex direction="row" justify="space-between" align="center" h={toolbarWidth / 2}>
          {/** Dashboard Title */}
          <Title order={3}>Dashboard</Title>
          <Flex direction="row" align="center" gap="md">
            <Tooltip label="Visible visits after filters" position="bottom">
              <Title order={5} c="dimmed">
                {`${store.filteredVisitsLength} / ${store.allVisitsLength}`}
                {' '}
                Visits
              </Title>
            </Tooltip>

            {/** Add Item Button */}
            <Menu width="md">
              <Menu.Target>
                <Button>
                  <IconPlus size={buttonIconSize} stroke={cardIconStroke} style={{ marginRight: 6 }} />
                  Add Item
                </Button>
              </Menu.Target>
              {/** Add Stat or Add Chart */}
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconNumbers size={cardIconSize} stroke={cardIconStroke} />}
                  onClick={openAddStatModal}
                >
                  Add Stat
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconChartLine size={cardIconSize} stroke={cardIconStroke} />}
                  onClick={openAddChartModal}
                >
                  Add Chart
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Flex>
        </Flex>
        <Divider />
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
              data={dashboardYAxisOptions.map((opt) => ({
                value: opt.value,
                label: opt.label.base,
              }))}
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
          {/** Render each chart - defined in the store's chart configs */}
          {Object.values(store.dashboardStore.chartConfigs).map(({
            chartId, yAxisVar, xAxisVar, aggregation, chartType,
          }) => {
            const selectedSet = new Set(store.selectionsStore.selectedTimePeriods);

            let chartData = store.dashboardStore.chartData[`${aggregation}_${yAxisVar}_${xAxisVar}`] || [];
            if (yAxisVar === 'total_blood_product_cost' && Array.isArray(chartData)) {
              chartData = chartData.map((data) => ({ timePeriod: data.timePeriod, ...data.data as Record<Cost, number> }));
            }
            const chartDataKeys = chartData.length > 0
              ? Object.keys(chartData[0]).filter((k) => k !== 'timePeriod')
              : [];
            return (
              <Card
                key={chartId}
                withBorder
                className={classes.gridItem}
                onMouseEnter={() => setHoveredChartId(chartId)}
                onMouseLeave={() => setHoveredChartId(null)}
              >
                <Flex direction="column" gap="sm" style={{ flex: 1, minHeight: 0 }}>
                  {/* Chart Header */}
                  <Flex direction="row" justify="space-between" align="center" pl="md">
                    <Flex direction="row" align="center" gap="md" ml={-12}>
                      <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
                      {/* Chart Title */}
                      <Title
                        order={4}
                        className={hoveredChartId === chartId ? classes.chartTitleHovered : undefined}
                      >
                        {
                          (() => {
                            // E.g. "sum_rbc_units"
                            const chartYAxis = dashboardYAxisOptions.find((o) => o.value === yAxisVar);
                            // E.g. "Total RBC Units"
                            return chartYAxis?.label?.[aggregation] || yAxisVar;
                          })()
                        }
                      </Title>
                    </Flex>
                    <Flex direction="row" align="center" gap="sm">
                      {/* Chart Type Toggle */}
                      <Tooltip label={`Change chart type to ${chartType === 'line' ? 'Bar' : 'Line'}`}>
                        <ActionIcon
                          variant="subtle"
                          onClick={() => store.dashboardStore.setChartConfig(chartId, {
                            chartId, yAxisVar, xAxisVar, aggregation, chartType: chartType === 'line' ? 'bar' : 'line',
                          })}
                        >
                          {chartType === 'bar' ? (
                            <IconChartLine size={18} color={theme.colors.gray[6]} stroke={3} />
                          ) : (
                            <IconChartBar size={18} color={theme.colors.gray[6]} stroke={3} />
                          )}
                        </ActionIcon>
                      </Tooltip>

                      {/* Chart y-axis aggregation toggle */}
                      <Tooltip label={`Change Y-Axis Aggregation to ${aggregation === 'sum' ? 'Average' : 'Sum'}`}>
                        <ActionIcon
                          variant="subtle"
                          onClick={() => store.dashboardStore.setChartConfig(chartId, {
                            chartId, yAxisVar, xAxisVar, aggregation: aggregation === 'sum' ? 'avg' : 'sum', chartType,
                          })}
                        >
                          <IconPercentage size={18} color={theme.colors.gray[6]} stroke={3} />
                        </ActionIcon>
                      </Tooltip>
                      {/** Chart x-axis aggregation toggle */}
                      <Tooltip label={`Change X-Axis to ${xAxisVar === 'month' ? 'Quarter' : xAxisVar === 'quarter' ? 'Year' : 'Month'}`}>
                        <ActionIcon
                          variant="subtle"
                          onClick={() => store.dashboardStore.setChartConfig(chartId, {
                            chartId, yAxisVar, xAxisVar: xAxisVar === 'month' ? 'quarter' : xAxisVar === 'quarter' ? 'year' : 'month', aggregation, chartType,
                          })}
                        >
                          <IconCalendarCode size={18} color={theme.colors.gray[6]} stroke={3} />
                        </ActionIcon>
                      </Tooltip>
                      {/* Chart Select Attribute Menu */}
                      <Select
                        data={dashboardYAxisOptions.map((opt) => ({
                          value: opt.value,
                          label: opt.label.base,
                        }))}
                        defaultValue={yAxisVar}
                        value={yAxisVar}
                        allowDeselect={false}
                        onChange={(value) => {
                          const selectedOption = dashboardYAxisOptions.find((opt) => opt.value === value);
                          let inferredChartType: DashboardChartConfig['chartType'] = 'line';
                          if (selectedOption && selectedOption.units?.sum === '$') {
                            inferredChartType = 'bar';
                          }
                          store.dashboardStore.setChartConfig(chartId, {
                            chartId,
                            xAxisVar,
                            yAxisVar: value as DashboardChartConfig['yAxisVar'],
                            aggregation,
                            chartType: inferredChartType,
                          });
                        }}
                      />
                      {/* Remove / Delete chart */}
                      <CloseButton onClick={() => handleRemoveChart(chartId)} />
                    </Flex>
                  </Flex>
                  <Box style={{ flex: 1, minHeight: 0, padding: '0 15px' }}>
                    <LoadingOverlay visible={chartData.length === 0} overlayProps={{ radius: 'sm', blur: 2 }} />
                    { chartType === 'bar' ? (
                      // Bar Chart
                      <BarChart
                        h="100%"
                        data={chartData}
                        dataKey="timePeriod"
                        series={
                          chartDataKeys.map((name, idx) => ({
                            name,
                            color: chartColors[idx % chartColors.length],
                            label: dashboardYAxisOptions.find((o) => o.value === name)?.label?.base || name,
                          }))
                        }
                        xAxisProps={{
                          interval: 'equidistantPreserveStart',
                        }}
                        type="stacked"
                        withLegend
                        tooltipAnimationDuration={200}
                        tooltipProps={
                          chartDataKeys.length === 1
                            ? {
                              content: ({ active, payload, label }) => (
                                <DashboardChartTooltip
                                  active={active}
                                  payload={payload}
                                  xAxisVar={label}
                                  yAxisVar={yAxisVar}
                                  aggregation={aggregation}
                                />
                              ),
                            }
                            : {}
                        }
                        valueFormatter={(value) => formatValueForDisplay(yAxisVar, value, aggregation, false)}
                        barProps={{
                          onClick: (...args: any[]) => {
                            const a = (args[0] || {}) as { payload?: any };
                            const b = (args[1] || {}) as { payload?: any };
                            const source = b && b.payload ? b : a;
                            const payload = source?.payload?.payload ?? source?.payload;
                            const tp = String(payload?.timePeriod ?? '');
                            if (tp) {
                              const isSelected = store.selectionsStore.selectedTimePeriods.includes(tp);
                              if (isSelected) {
                                store.selectionsStore.removeSelectedTimePeriod(tp);
                              } else {
                                store.selectionsStore.addSelectedTimePeriod(tp);
                              }
                            }
                          },
                          style: { cursor: 'pointer' },
                        }}
                      />
                    ) : (
                      // Line Chart
                      <LineChart
                        h="100%"
                        data={chartData}
                        dataKey="timePeriod"
                        series={
                          chartDataKeys.map((name, idx) => ({
                            name,
                            color: chartColors[idx % chartColors.length],
                            label: dashboardYAxisOptions.find((o) => o.value === name)?.label?.base || name,
                          }))
                        }
                        curveType="monotone"
                        tickLine="none"
                        xAxisProps={{
                          interval: 'equidistantPreserveStart',
                        }}
                        strokeWidth={1.5}
                        withLegend
                        lineProps={{
                          // Per-point rendering for dots to allow dynamic fill based on selection
                          dot: (props: any) => {
                            const {
                              cx, cy, payload, stroke, fill, key,
                            } = props || {};
                            const tp = String(payload?.timePeriod ?? '');
                            const isSelected = selectedSet.has(tp);
                            const seriesFill = fill || stroke;

                            return (
                              <circle
                                key={key}
                                cx={cx ?? 0}
                                cy={cy ?? 0}
                                r={isSelected ? 5 : 3}
                                strokeWidth={0}
                                fill={isSelected ? smallSelectColor : seriesFill}
                              />
                            );
                          },
                          activeDot: {
                            r: 5,
                            strokeWidth: 0,
                            fill: smallHoverColor,
                            style: { cursor: 'pointer' },
                            onClick: (...args: unknown[]) => {
                              const a = (args[0] || {}) as { payload?: Record<string, unknown> };
                              const b = (args[1] || {}) as { payload?: Record<string, unknown> };
                              const source = b && b.payload ? b : a;
                              const tp = String(source?.payload?.timePeriod ?? '');
                              if (tp) {
                                const isSelected = store.selectionsStore.selectedTimePeriods.includes(tp);
                                if (isSelected) {
                                  store.selectionsStore.removeSelectedTimePeriod(tp);
                                } else {
                                  store.selectionsStore.addSelectedTimePeriod(tp);
                                }
                              }
                            },
                          },
                        }}
                        tooltipAnimationDuration={200}
                        tooltipProps={
                          chartDataKeys.length === 1
                            ? {
                              content: ({ active, payload, label }) => (
                                <DashboardChartTooltip
                                  active={active}
                                  payload={payload}
                                  xAxisVar={label}
                                  yAxisVar={yAxisVar}
                                  aggregation={aggregation}
                                />
                              ),
                            }
                            : {}
                        }
                        valueFormatter={(value) => formatValueForDisplay(yAxisVar, value, aggregation, false)}
                      />
                    )}
                  </Box>
                </Flex>
              </Card>
            );
          })}
        </ResponsiveGridLayout>
      </Stack>
    );
  });
}
