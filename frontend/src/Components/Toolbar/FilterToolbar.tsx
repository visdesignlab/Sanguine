import { DateInput } from '@mantine/dates';
import { useContext } from 'react';
import {
  Accordion, ActionIcon, Chip, Flex, Input, RangeSlider,
  Title,
} from '@mantine/core';
import { useObserver } from 'mobx-react';
import { IconChartBar, IconHelpSquare, IconRestore } from '@tabler/icons-react';
import { Store } from '../../Store/Store';
import { useThemeConstants } from '../../Theme/mantineTheme';

const dateSimplify = (date: Date) => date.toISOString().split('T')[0]; // Format as YYYY-MM-DD;

export function FilterToolbar() {
  const store = useContext(Store);
  const {
    dateFiltersAppliedCount: dateFilterCount,
    bloodComponentFiltersAppliedCount: bloodComponentFilterCount,
  } = store.filtersStore;
  const { toolbarWidth } = useThemeConstants();

  return useObserver(() => (
    <Accordion multiple defaultValue={['date-filters', 'blood-component-filters']} mt="xs">
      <Accordion.Item value="date-filters" key="date-filters">
        <Accordion.Control px="xs">
          <Flex justify="space-between" align="center" gap="xs" mr="xs">
            <Title order={4}>Visit Date</Title>
            {dateFilterCount > 0 && (
            <Chip
              color="blue"
              radius="sm"
              variant="light"
              checked
              style={{ marginBottom: 8 }}
            >
              {dateFilterCount}
            </Chip>
            )}
          </Flex>
        </Accordion.Control>
        <Accordion.Panel>
          <Flex justify="flex-start" align="center" gap="sm" mt={0} mb="xs">
            <ActionIcon size="xs" onClick={() => store.filtersStore.resetDateFilters()}>
              <IconRestore stroke={1} />
            </ActionIcon>
            <ActionIcon size="xs">
              <IconChartBar stroke={1} />
            </ActionIcon>
            <ActionIcon size="xs">
              <IconHelpSquare stroke={1} />
            </ActionIcon>
          </Flex>
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

      <Accordion.Item value="blood-component-filters" key="blood-component-filters">
        <Accordion.Control px="xs">
          <Flex justify="space-between" align="center" gap="xs" mr="xs" h={toolbarWidth / 2}>
            <Title order={4}>Blood Component Used</Title>
            {bloodComponentFilterCount > 0 && (
              <Chip
                color="blue"
                radius="sm"
                variant="light"
                checked
                style={{ marginBottom: 8 }}
              >
                {bloodComponentFilterCount}
              </Chip>
            )}
          </Flex>
        </Accordion.Control>
        <Accordion.Panel>
          <Flex justify="flex-start" align="center" gap="sm" mt={0} mb="xs">
            <ActionIcon size="xs" onClick={() => store.filtersStore.resetBloodComponentFilters()}>
              <IconRestore stroke={1} />
            </ActionIcon>
            <ActionIcon size="xs">
              <IconChartBar stroke={1} />
            </ActionIcon>
            <ActionIcon size="xs">
              <IconHelpSquare stroke={1} />
            </ActionIcon>
          </Flex>
          <Input.Wrapper label="RBC Units" mb="lg">
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

          <Input.Wrapper label="FFP Units" mb="lg">
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

          <Input.Wrapper label="Platelet Units" mb="lg">
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

          <Input.Wrapper label="Cryo Units" mb="lg">
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

          <Input.Wrapper label="Cell Saver (mL)" mb="lg">
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
