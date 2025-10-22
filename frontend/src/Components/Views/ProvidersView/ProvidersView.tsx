import {
  Card,
  Divider, Flex, Stack, Title, Tooltip, Text,
  Button,
  Select,
} from '@mantine/core';
import { useContext, useEffect, useState } from 'react';
import { DatePickerInput } from '@mantine/dates';
import dayjs from 'dayjs';
import { IconCalendarWeek, IconPlus, IconSearch } from '@tabler/icons-react';
import { BarChart } from '@mantine/charts';
import { useObserver } from 'mobx-react';
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';

export function ProvidersView() {
  const store = useContext(Store);

  const { toolbarWidth } = useThemeConstants();

  useEffect(() => {
    if (store.providersStore?.getProviderCharts && store.duckDB) {
      store.providersStore.getProviderCharts();
    }
    if (store.providersStore?.fetchProviderList && store.duckDB) {
      store.providersStore.fetchProviderList();
    }
  }, [store.providersStore, store.duckDB]);

  const [dateRange, setDateRange] = useState<[string | null, string | null]>([null, null]);

  const dateRangePresets = [
    {
      value: [
        dayjs().subtract(3, 'month').startOf('day').format('YYYY-MM-DD'),
        dayjs().format('YYYY-MM-DD'),
      ] as [string | null, string | null],
      label: 'Past Quarter',
    },
    {
      value: [
        dayjs().subtract(3, 'month').startOf('day').format('YYYY-MM-DD'),
        dayjs().format('YYYY-MM-DD'),
      ] as [string | null, string | null],
      label: 'Last 3 Months',
    },
    {
      value: [
        dayjs().subtract(6, 'month').startOf('day').format('YYYY-MM-DD'),
        dayjs().format('YYYY-MM-DD'),
      ] as [string | null, string | null],
      label: 'Last 6 Months',
    },
    {
      value: [
        dayjs().startOf('year').format('YYYY-MM-DD'),
        dayjs().format('YYYY-MM-DD'),
      ] as [string | null, string | null],
      label: 'This Calendar Year',
    },
    {
      value: [
        '2000-01-01',
        dayjs().format('YYYY-MM-DD'),
      ] as [string | null, string | null],
      label: 'All Time',
    },
  ];

  const providerCharts = store.providersStore?.providerChartData;

  const {
    cardIconStroke,
    buttonIconSize,
  } = useThemeConstants();

  return useObserver(() => {
    const selectedProviderName = store.providersStore?.selectedProvider ?? 'Dr. John Doe';
    const providerSelectData = store.providersStore?.providerList ?? [];
    return (
      <Stack mb="xl" gap="lg">
        <Flex direction="row" justify="space-between" align="center" h={toolbarWidth / 2}>
          {/* Dashboard Title */}
          <Title order={3}>Providers</Title>
          <Flex direction="row" align="center" gap="md" ml="auto">
            {/** Visits Count */}
            <Tooltip label="Visible visits after filters" position="bottom">
              <Title order={5} c="dimmed">
                {`${store.filteredVisitsLength} / ${store.allVisitsLength}`}
                {' '}
                Visits
              </Title>
            </Tooltip>
            {/** Provider Search */}
            <Select
              placeholder="Search for a provider"
              leftSection={<IconSearch size={18} stroke={1} />}
              searchable
              data={providerSelectData}
              value={store.providersStore?.selectedProvider ?? undefined}
              w="fit-content"
              style={{ minWidth: 180 }}
              onChange={(val) => {
                if (store.providersStore) {
                  store.providersStore.selectedProvider = val;
                }
              }}
            />
            {/** Date Range Picker */}
            <DatePickerInput
              type="range"
              defaultValue={[
                dayjs().subtract(6, 'month').startOf('day').toDate(),
                dayjs().toDate(),
              ]}
              defaultLevel="month"
              leftSection={<IconCalendarWeek size={18} stroke={1} />}
              placeholder="Pick dates range"
              presets={dateRangePresets}
              value={dateRange}
              onChange={setDateRange}
            />
            <Button>
              <IconPlus size={buttonIconSize} stroke={cardIconStroke} style={{ marginRight: 6 }} />
              Add Chart
            </Button>
          </Flex>
        </Flex>
        <Divider />
        {/* Provider Summary Card */}
        <Card shadow="sm" radius="md" p="xl" mb="md" withBorder>
          <Stack gap="xs">
            <Title order={3}>
              Provider Summary -
              {' '}
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
        <Title order={3}>Anemia Management</Title>
        <Flex gap="sm">
          {Object.entries(providerCharts)
            .filter(([_, chart]) => chart.group === 'Anemia Management')
            .map(([chartId, chart]) => {
              const series = (chart.data && chart.data.length > 0)
                ? Object.keys(chart.data[0])
                  .filter((k) => k !== chart.dataKey)
                  .map((name) => ({ name, color: 'blue.6' }))
                : [];
              return (
                <Card key={chartId} h={200} w={300} p="md" shadow="sm">
                  <BarChart
                    h={200}
                    w="100%"
                    data={chart.data}
                    dataKey={chart.dataKey}
                    orientation={chart.orientation}
                    barChartProps={{
                      margin: {
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20,
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
        <Title order={3}>Outcomes</Title>
        <Flex gap="sm">
          {Object.entries(providerCharts)
            .filter(([_, chart]) => chart.group === 'Outcomes')
            .map(([chartId, chart]) => {
              const series = (chart.data && chart.data.length > 0)
                ? Object.keys(chart.data[0])
                  .filter((k) => k !== chart.dataKey)
                  .map((name) => ({ name, color: 'blue.6' }))
                : [];
              return (
                <Card key={chartId} h={200} w={300} p="md" shadow="sm">
                  <BarChart
                    h={200}
                    w="100%"
                    data={chart.data}
                    dataKey={chart.dataKey}
                    orientation={chart.orientation}
                    barChartProps={{
                      margin: {
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20,
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
      </Stack>
    );
  });
}
