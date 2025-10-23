import { BarChart } from '@mantine/charts';
import {
  Card,
  Divider, Flex, Stack, Title, Tooltip, Text,
  Button,
  Select,
  Modal,
  CloseButton,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCalendarWeek, IconPlus, IconSearch,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useObserver } from 'mobx-react';
import {
  useCallback, useContext, useEffect, useState,
} from 'react';
import clsx from 'clsx';
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import {
  AGGREGATION_OPTIONS, dashboardYAxisOptions, ProviderChartConfig, providerChartGroups,
} from '../../../Types/application';
import classes from '../GridLayoutItem.module.css';

/**
 * ProvidersView component displays provider-related charts and information.
 * @returns The Providers View component
 */
export function ProvidersView() {
  // --- Store and contexts ---
  const store = useContext(Store);
  const aggregationOptions = Object.entries(AGGREGATION_OPTIONS).map(([value, { label }]) => ({ value, label }));

  // Initialize provider view data
  useEffect(() => {
    if (store.providersStore?.getProviderCharts && store.duckDB) {
      store.providersStore.getProviderCharts();
    }
    if (store.providersStore?.fetchProviderList && store.duckDB) {
      store.providersStore.fetchProviderList();
    }
  }, [store.providersStore, store.duckDB]);

  // Styles
  const {
    buttonIconSize, cardIconStroke, toolbarWidth,
  } = useThemeConstants();

  // --- Add Chart Modal ----
  const [selectedAggregation, setSelectedAggregation] = useState<string>('sum');
  const [selectedVar, setSelectedVar] = useState<string>('');
  const [isAddChartModalOpen, { open, close }] = useDisclosure(false);

  const openAddChartModal = useCallback(() => {
    setSelectedAggregation('avg');
    setSelectedVar('');
    open();
  }, [open]);

  // --- Handle Charts ---

  const handleRemoveChart = useCallback((chartId: string) => {
    store.providersStore.removeChart(chartId);
  }, [store.providersStore]);

  const addChart = useCallback(() => {
    // TODO: Change provider chart config based on what we want.
    store.providersStore.addChart({
      chartId: `chart-${Date.now()}`,
      xAxisVar: 'month' as ProviderChartConfig['xAxisVar'],
      yAxisVar: selectedVar as ProviderChartConfig['yAxisVar'],
      aggregation: selectedAggregation as ProviderChartConfig['aggregation'],
      chartType: 'bar',
      group: 'Anemia Management',

    });
    close();
  }, [selectedAggregation, selectedVar, close, store.providersStore]);

  // TODO: Handle Chart Hover
  const [hoveredChartId, setHoveredChartId] = useState<string | null>(null);

  // --- Date Range Picker ---
  const [dateRange, setDateRange] = useState<[string | null, string | null]>([null, null]);

  // --- Render ---
  return useObserver(() => {
    const selectedProviderName = store.providersStore?.selectedProvider ?? 'Dr. John Doe';

    return (
      <Stack mb="xl" gap="lg">
        <Flex direction="row" justify="space-between" align="center" h={toolbarWidth / 2}>
          <Title order={3}>Providers</Title>
          <Flex direction="row" align="center" gap="md" ml="auto">
            {/* Visit Count */}
            <Tooltip label="Visible visits after filters" position="bottom">
              <Title order={5} c="dimmed">
                {`${store.filteredVisitsLength} / ${store.allVisitsLength}`}
                {' '}
                Visits
              </Title>
            </Tooltip>
            {/* Provider Select */}
            <Select
              placeholder="Search for a provider"
              leftSection={<IconSearch size={18} stroke={1} />}
              searchable
              data={store.providersStore?.providerList ?? []}
              value={store.providersStore?.selectedProvider ?? undefined}
              w="fit-content"
              style={{ minWidth: 180 }}
              onChange={(val) => { if (store.providersStore) store.providersStore.selectedProvider = val; }}
            />
            {/* Date Range Picker */}
            <DatePickerInput
              type="range"
              defaultValue={[
                dayjs().subtract(6, 'month').startOf('day').toDate(),
                dayjs().toDate(),
              ]}
              defaultLevel="month"
              leftSection={<IconCalendarWeek size={18} stroke={1} />}
              placeholder="Pick dates range"
              value={dateRange}
              onChange={setDateRange}
            />
            {/** Add Chart Button */}
            <Button onClick={openAddChartModal}>
              <IconPlus size={buttonIconSize} stroke={cardIconStroke} style={{ marginRight: 6 }} />
              Add Chart
            </Button>
          </Flex>
        </Flex>
        <Divider />
        {/** Modal when add chart or stat clicked */}
        <Modal
          opened={isAddChartModalOpen}
          onClose={close}
          title={`Add chart for ${selectedProviderName}`}
          centered
        >
          <Stack gap="md">
            {/** Modal - choose aggregation for chart */}
            <Select
              label="Aggregation"
              placeholder="Choose aggregation type"
              data={aggregationOptions}
              value={selectedAggregation}
              onChange={(value) => setSelectedAggregation(value || 'Average')}
            />
            {/** Modal - choose y-axis for chart or stat */}
            <Select
              label="Variable"
              placeholder="Choose Variable"
              data={dashboardYAxisOptions.map((opt) => ({
                value: opt.value,
                label: opt.label.base,
              }))}
              value={selectedVar}
              onChange={(value) => setSelectedVar(value || '')}
            />
            {/** Done Button - Add chart to view */}
            <Button
              mt="md"
              onClick={addChart}
              disabled={!selectedVar}
              fullWidth
            >
              Done
            </Button>
          </Stack>
        </Modal>
        {/* Provider Summary Card */}
        <Card shadow="sm" radius="md" p="xl" mb="md" withBorder>
          <Stack gap="xs">
            <Title order={3}>
              Provider Summary -
              {selectedProviderName}
            </Title>
            <Title order={4} mt="xs">
              In the past
              {' '}
              <Text component="span" td="underline">3 Months</Text>
              ,
              {' '}
              {selectedProviderName}
              {' '}
              has recorded:
            </Title>
            <Stack gap={2} mt="xs">
              <Text size="md">
                •
                {' '}
                <Text component="span" td="underline">28</Text>
                {' '}
                Cardiac Surgeries
              </Text>
              <Text size="md">
                • Used
                {' '}
                <Text component="span" td="underline">187</Text>
                {' '}
                Units of Blood Products
              </Text>
              <Text size="md">
                • Average Complexity of cases
                {' '}
                <Text component="span" td="underline">higher</Text>
                {' '}
                than average
              </Text>
              <Text size="md">
                •
                {' '}
                <Text component="span" td="underline">13%</Text>
                {' '}
                of transfused patients had post operative hemoglobin above the recommended threshold
              </Text>
            </Stack>
          </Stack>
        </Card>
        {/* Provider Charts - render for each chart group (i.e 'Outcomes') */}
        {providerChartGroups.map((group) => (
          <div key={group}>
            <Title order={3} mt="md">{group}</Title>
            <Flex gap="md" mt="md">
              {/* For each chart configuration, render charts for this group. */}
              {(store.providersStore?.chartConfigs || [])
                .filter((cfg) => cfg.group === group)
                .map((cfg) => {
                  // Get chart key and data
                  const chartKey = `${cfg.chartId}_${cfg.yAxisVar}`;
                  const chart = store.providersStore?.providerChartData?.[chartKey];
                  if (!chart) return null;

                  // Chart series
                  const series = (chart.data && chart.data.length > 0)
                    ? Object.keys(chart.data[0]).filter((k) => k !== chart.dataKey).map((name) => ({ name, color: 'blue.6' }))
                    : [];

                  return (
                    <Card
                      key={chartKey}
                      h={200}
                      w={300}
                      p="md"
                      shadow="sm"
                      withBorder
                      className={clsx(classes.gridItem, hoveredChartId === cfg.chartId && classes.gridItemHovered)}
                      style={{ position: 'relative' }}
                      onMouseLeave={() => setHoveredChartId(null)}
                      onMouseEnter={() => setHoveredChartId(cfg.chartId)}
                    >
                      {/** Close button */}
                      {hoveredChartId === cfg.chartId && (
                        <CloseButton
                          size="xs"
                          onClick={() => handleRemoveChart(cfg.chartId)}
                          style={{
                            position: 'absolute', top: 8, right: 8, zIndex: 2,
                          }}
                          aria-label="Remove chart"
                        />
                      )}
                      {/** Chart */}
                      <BarChart
                        h={200}
                        w="100%"
                        data={chart.data}
                        dataKey={chart.dataKey}
                        orientation={chart.orientation}
                        barChartProps={{
                          margin: {
                            top: 30,
                            right: 25,
                            bottom: 25,
                            left: 25,
                          },
                        }}
                        yAxisProps={{ width: 20 }}
                        barProps={{ radius: 5 }}
                        series={series}
                        xAxisProps={{
                          label: {
                            value: chart.title,
                            position: 'bottom',
                            offset: 10,
                            dx: -6,
                            style: { fontWeight: 600, fontSize: 13 },
                          },
                        }}
                        referenceLines={[
                          {
                            x: chart.providerMark!,
                            color: '#4a4a4a',
                            label: store.providersStore?.selectedProvider ?? 'Provider',
                            labelPosition: 'top',
                          },
                        ]}
                      />
                    </Card>
                  );
                })}
            </Flex>
          </div>
        ))}
      </Stack>
    );
  });
}
