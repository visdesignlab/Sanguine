import { useContext } from 'react';
import {
  Accordion, Flex, ActionIcon, Tooltip, Title,
  Badge,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useObserver } from 'mobx-react';
import { IconRestore } from '@tabler/icons-react';
import { Store } from '../../../Store/Store';

const dateSimplify = (date: Date) => date.toISOString().split('T')[0];

export function DateFilters() {
  const store = useContext(Store);
  return useObserver(() => (
    <Accordion.Item value="date-filters" key="date-filters">
      <Flex align="center">
        <Accordion.Control px="xs">
          <Flex justify="space-between" align="center" gap="xs" mr="xs">
            <Title order={4} c={store.filtersStore.dateFiltersAppliedCount > 0 ? 'blue.6' : undefined}>Visit Date</Title>
            {/** Filter count badge */}
            {store.filtersStore.dateFiltersAppliedCount > 0 ? (
              <Badge color="blue" radius="sm" variant="light">
                {store.filtersStore.dateFiltersAppliedCount}
              </Badge>
            ) : null}
          </Flex>
        </Accordion.Control>
        <Tooltip label="Reset Date Filters">
          <ActionIcon size="sm" onClick={() => store.filtersStore.resetDateFilters()}>
            <IconRestore stroke={1} />
          </ActionIcon>
        </Tooltip>
      </Flex>
      <Accordion.Panel>
        <Flex direction="row" justify="space-between" align="center">
          <DateInput
            label="Date From"
            value={dateSimplify(store.filtersStore.filterValues.dateFrom)}
            onChange={(date) => date && store.filtersStore.setFilterValue('dateFrom', new Date(date))}
            minDate={dateSimplify(store.filtersStore.initialFilterValues.dateFrom)}
            maxDate={dateSimplify(store.filtersStore.initialFilterValues.dateTo)}
            valueFormat="YYYY-MM-DD"
            w="45%"
          />
          <DateInput
            label="Date To"
            value={dateSimplify(store.filtersStore.filterValues.dateTo)}
            onChange={(date) => date && store.filtersStore.setFilterValue('dateTo', new Date(date))}
            minDate={dateSimplify(store.filtersStore.initialFilterValues.dateFrom)}
            maxDate={dateSimplify(store.filtersStore.initialFilterValues.dateTo)}
            valueFormat="YYYY-MM-DD"
            w="45%"
          />
        </Flex>
      </Accordion.Panel>
    </Accordion.Item>
  ));
}
