import {
  Autocomplete,
  Divider, Flex, Stack, Title, Tooltip,
} from '@mantine/core';
import { useContext } from 'react';
import { DateInput } from '@mantine/dates';
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';

export function ProvidersView() {
  const store = useContext(Store);

  const { toolbarWidth } = useThemeConstants();
  const dateSimplify = (date: Date) => date.toISOString().split('T')[0];

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
          label="Provider"
          placeholder="Search for a provider"
          defaultValue="Dr. John Doe"
          data={[
            'Dr. John Doe',
            'Dr. Jane Smith',
            'Dr. Emily Carter',
            'Dr. Michael Brown',
          ]}
          w="10%"
        />
        <DateInput
          label="Date From"
          value={dateSimplify(store.filtersStore.filterValues.dateFrom)}
          onChange={(date) => date && store.filtersStore.setFilterValue('dateFrom', new Date(date))}
          minDate={dateSimplify(store.filtersStore.initialFilterValues.dateFrom)}
          maxDate={dateSimplify(store.filtersStore.initialFilterValues.dateTo)}
          valueFormat="YYYY-MM-DD"
          w="6%"
        />
        <DateInput
          label="Date To"
          value={dateSimplify(store.filtersStore.filterValues.dateTo)}
          onChange={(date) => date && store.filtersStore.setFilterValue('dateTo', new Date(date))}
          minDate={dateSimplify(store.filtersStore.initialFilterValues.dateFrom)}
          maxDate={dateSimplify(store.filtersStore.initialFilterValues.dateTo)}
          valueFormat="YYYY-MM-DD"
          w="6%"
        />
      </Flex>
    </Stack>
  );
}
