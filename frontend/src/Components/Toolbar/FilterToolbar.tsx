import { DateInput } from '@mantine/dates';
import { useContext } from 'react';
import {
  Accordion, Flex, Input, RangeSlider, Text,
} from '@mantine/core';
import { useObserver } from 'mobx-react';
import { Store } from '../../Store/Store';

const dateSimplify = (date: Date) => date.toISOString().split('T')[0]; // Format as YYYY-MM-DD;

export function FilterToolbar() {
  const store = useContext(Store);

  return useObserver(() => (
    <Accordion multiple defaultValue={['date-filters', 'blood-component-filters']}>
      <Accordion.Item value="date-filters" key="date-filters">
        <Accordion.Control px="xs">
          <Text>Visit Date</Text>
        </Accordion.Control>
        <Accordion.Panel>
          <Flex direction="row" justify="space-between" align="center">
            <DateInput
              label="Date from"
              value={dateSimplify(store.filtersStore.filterValues.dateFrom)}
              onChange={(date) => date && store.filtersStore.setFilterValue('dateFrom', new Date(date))}
              minDate={dateSimplify(store.filtersStore.initialFilterValues.dateFrom)}
              maxDate={dateSimplify(store.filtersStore.initialFilterValues.dateTo)}
              valueFormat="YYYY-MM-DD"
              w="45%"
            />
            <DateInput
              label="Date to"
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

      <Accordion.Item value="blood-component-filters" key="blood-component-filters">
        <Accordion.Control px="xs">
          <Text>Visit Blood Component</Text>
        </Accordion.Control>
        <Accordion.Panel>
          <Input.Wrapper label="RBCs" mb="lg">
            <RangeSlider
              defaultValue={store.filtersStore.filterValues.visitRBCs}
              onChangeEnd={(value) => store.filtersStore.setFilterValue('visitRBCs', value)}
              min={store.filtersStore.initialFilterValues.visitRBCs[0]}
              max={store.filtersStore.initialFilterValues.visitRBCs[1]}
              step={1}
              marks={store.filtersStore.initialFilterValues.visitRBCs.map((val) => ({ value: val, label: String(val) }))}
              minRange={1}
              mb="md"
            />
          </Input.Wrapper>

          <Input.Wrapper label="FFPs" mb="lg">
            <RangeSlider
              defaultValue={store.filtersStore.filterValues.visitRBCs}
              onChangeEnd={(value) => store.filtersStore.setFilterValue('visitRBCs', value)}
              min={store.filtersStore.initialFilterValues.visitRBCs[0]}
              max={store.filtersStore.initialFilterValues.visitRBCs[1]}
              step={1}
              marks={store.filtersStore.initialFilterValues.visitRBCs.map((val) => ({ value: val, label: String(val) }))}
              minRange={1}
            />
          </Input.Wrapper>

          <Input.Wrapper label="PLTs" mb="lg">
            <RangeSlider
              defaultValue={store.filtersStore.filterValues.visitPLTs}
              onChangeEnd={(value) => store.filtersStore.setFilterValue('visitPLTs', value)}
              min={store.filtersStore.initialFilterValues.visitPLTs[0]}
              max={store.filtersStore.initialFilterValues.visitPLTs[1]}
              step={1}
              marks={store.filtersStore.initialFilterValues.visitPLTs.map((val) => ({ value: val, label: String(val) }))}
              minRange={1}
            />
          </Input.Wrapper>

          <Input.Wrapper label="Cryo" mb="lg">
            <RangeSlider
              defaultValue={store.filtersStore.filterValues.visitCryo}
              onChangeEnd={(value) => store.filtersStore.setFilterValue('visitCryo', value)}
              min={store.filtersStore.initialFilterValues.visitCryo[0]}
              max={store.filtersStore.initialFilterValues.visitCryo[1]}
              step={1}
              marks={store.filtersStore.initialFilterValues.visitCryo.map((val) => ({ value: val, label: String(val) }))}
              minRange={1}
            />
          </Input.Wrapper>

          <Input.Wrapper label="Cell Saver" mb="lg">
            <RangeSlider
              defaultValue={store.filtersStore.filterValues.visitCellSaver}
              onChangeEnd={(value) => store.filtersStore.setFilterValue('visitCellSaver', value)}
              min={store.filtersStore.initialFilterValues.visitCellSaver[0]}
              max={store.filtersStore.initialFilterValues.visitCellSaver[1]}
              step={50}
              marks={store.filtersStore.initialFilterValues.visitCellSaver.map((val) => ({ value: val, label: String(val) }))}
              minRange={1}
            />
          </Input.Wrapper>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  ));
}
