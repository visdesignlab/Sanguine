import {
  Card,
  Divider, Flex, Stack, Title, Tooltip, Text,
  Button,
  Select,
} from '@mantine/core';
import { useContext, useState } from 'react';
import { DatePickerInput } from '@mantine/dates';
import dayjs from 'dayjs';
import { IconCalendarWeek, IconPlus, IconSearch } from '@tabler/icons-react';
import { BarChart } from '@mantine/charts';
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';

export function ProvidersView() {
  const store = useContext(Store);

  const { toolbarWidth } = useThemeConstants();

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

  // TEMPORARY MOCK DATA ------------
  // TODO: Replace with real chart configs from a provider store
  type ChartOrientation = 'vertical' | 'horizontal';
  type ProviderChart = {
    title: string;
    data: { group: string; Adherence: number }[];
    dataKey: string;
    orientation: ChartOrientation;
  };
  const allCharts: Record<string, ProviderChart> = {
    anemia1: {
      title: 'Anemia Management',
      data: [
        { group: 'Group1', Adherence: 75 },
        { group: 'Best', Adherence: 60 },
        { group: 'Dr. John Doe', Adherence: 25 },
      ],
      dataKey: 'Adherence',
      orientation: 'horizontal',
    },
    anemia2: {
      title: 'Anemia Management',
      data: [
        { group: 'Benchmark', Adherence: 75 },
        { group: 'Best', Adherence: 60 },
        { group: 'Dr. John Doe', Adherence: 25 },
      ],
      dataKey: 'group',
      orientation: 'vertical',
    },
    anemia3: {
      title: 'Anemia Management',
      data: [
        { group: 'Benchmark', Adherence: 75 },
        { group: 'Best', Adherence: 60 },
        { group: 'Dr. John Doe', Adherence: 25 },
      ],
      dataKey: 'group',
      orientation: 'vertical',
    },
    outcome1: {
      title: 'Outcomes',
      data: [
        { group: 'Benchmark', Adherence: 75 },
        { group: 'Best', Adherence: 60 },
        { group: 'Dr. John Doe', Adherence: 25 },
      ],
      dataKey: 'group',
      orientation: 'vertical',
    },
    outcome2: {
      title: 'Outcomes',
      data: [
        { group: 'Benchmark', Adherence: 75 },
        { group: 'Best', Adherence: 60 },
        { group: 'Dr. John Doe', Adherence: 25 },
      ],
      dataKey: 'group',
      orientation: 'vertical',
    },
  };

  const {
    cardIconStroke,
    buttonIconSize,
  } = useThemeConstants();

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
            defaultValue="Dr. John Doe"
            leftSection={<IconSearch size={18} stroke={1} />}
            searchable
            data={[
              'Dr. John Doe',
              'Dr. Jane Smith',
              'Dr. Emily Carter',
              'Dr. Michael Brown',
            ]}
            w="fit-content"
            style={{ minWidth: 180 }}
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
          <Title order={3}>Provider Summary - Dr. John Doe</Title>
          <Title order={4} mt="xs">
            In the past
            {' '}
            <Text component="span" td="underline">3 Months</Text>
            , Dr. John Doe has recorded:
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
              <Text component="span" td="underline">10% higher</Text>
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
        {Object.entries(allCharts)
          .filter(([chartId, chart]) => chart.title === 'Anemia Management')
          .map(([chartId, chart]) => (
            <Card key={chartId} h={200} w={300} p="md" shadow="sm">
              <BarChart
                h={200}
                p="sm"
                w="100%"
                data={chart.data}
                dataKey={chart.dataKey}
                orientation={chart.orientation}
                yAxisProps={chart.orientation === 'vertical' ? { width: 80 } : undefined}
                barProps={{ radius: 10 }}
                series={[{ name: 'Adherence', color: 'blue.6' }]}
              />
            </Card>
          ))}
      </Flex>
      <Title order={3}>Outcomes</Title>
      <Flex gap="sm">
        {Object.entries(allCharts)
          .filter(([chartId, chart]) => chart.title === 'Outcomes')
          .map(([chartId, chart]) => (
            <Card key={chartId} h={200} w={300} p="md" shadow="sm">
              <BarChart
                h={200}
                p="sm"
                w="100%"
                data={chart.data}
                dataKey={chart.dataKey}
                orientation={chart.orientation}
                yAxisProps={chart.orientation === 'vertical' ? { width: 80 } : undefined}
                barProps={{ radius: 10 }}
                series={[{ name: 'Adherence', color: 'blue.6' }]}
              />
            </Card>
          ))}
      </Flex>
    </Stack>
  );
}
