import {
  Autocomplete,
  Card,
  Divider, Flex, Stack, Title, Tooltip, Text,
} from '@mantine/core';
import { useContext, useState } from 'react';
import { DatePickerInput } from '@mantine/dates';
import dayjs from 'dayjs';
import { IconCalendarWeek, IconSearch } from '@tabler/icons-react';
import { BarChart } from '@mantine/charts';
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';

export function ProvidersView() {
  const store = useContext(Store);

  const { toolbarWidth } = useThemeConstants();

  const [dateRange, setDateRange] = useState<[string | null, string | null]>([null, null]);

  return (
    <Stack mb="xl" gap="lg">
      <Flex direction="row" justify="space-between" align="center" h={toolbarWidth / 2}>
        {/** Dashboard Title */}
        <Title order={3}>Providers</Title>
        <Flex direction="row" align="center" gap="md">
          <Tooltip label="Visible visits after filters" position="bottom">
            <Title order={5} c="dimmed">
              {`${store.filteredVisits.length} / ${store.allVisits.length}`}
              {' '}
              Visits
            </Title>
          </Tooltip>
        </Flex>
      </Flex>
      <Divider />
      <Flex direction="row" gap="md" align="flex-end">
        <Autocomplete
          placeholder="Search for a provider"
          defaultValue="Dr. John Doe"
          leftSection={<IconSearch size={18} stroke={1} />}
          data={[
            'Dr. John Doe',
            'Dr. Jane Smith',
            'Dr. Emily Carter',
            'Dr. Michael Brown',
          ]}
          w="10%"
        />
        <DatePickerInput
          type="range"
          defaultValue={[
            dayjs().subtract(6, 'month').startOf('day').toDate(),
            dayjs().toDate(),
          ]}
          leftSection={<IconCalendarWeek size={18} stroke={1} />}
          placeholder="Pick dates range"
          presets={[
            {
              value: [
                dayjs().subtract(3, 'month').startOf('day').format('YYYY-MM-DD'),
                dayjs().format('YYYY-MM-DD'),
              ],
              label: 'Past Quarter',
            },
            {
              value: [
                dayjs().subtract(3, 'month').startOf('day').format('YYYY-MM-DD'),
                dayjs().format('YYYY-MM-DD'),
              ],
              label: 'Last 3 Months',
            },
            {
              value: [
                dayjs().subtract(6, 'month').startOf('day').format('YYYY-MM-DD'),
                dayjs().format('YYYY-MM-DD'),
              ],
              label: 'Last 6 Months',
            },
            {
              value: [
                dayjs().startOf('year').format('YYYY-MM-DD'),
                dayjs().format('YYYY-MM-DD'),
              ],
              label: 'This Calendar Year',
            },
            {
              value: [
                '2000-01-01',
                dayjs().format('YYYY-MM-DD'),
              ],
              label: 'All Time',
            },
          ]}
          value={dateRange}
          onChange={setDateRange}
        />
      </Flex>
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
      {/** Anemia Management Bar Chart */}
      <Card h={150} w={300} p="md" shadow="sm">
        <BarChart
          h={200}
          p="sm"
          w="100%"
          data={[
            { group: 'Benchmark', Adherence: 75 },
            { group: 'Best', Adherence: 60 },
            { group: 'Dr. John Doe', Adherence: 25 },
          ]}
          dataKey="group"
          orientation="vertical"
          yAxisProps={{ width: 80 }}
          barProps={{ radius: 10 }}
          series={[{ name: 'Adherence', color: 'blue.6' }]}
        />
      </Card>
      <Title order={3}>Outcomes</Title>

    </Stack>
  );
}
