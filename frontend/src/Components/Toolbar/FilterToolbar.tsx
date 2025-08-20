import { DateInput } from '@mantine/dates';
import { useContext } from 'react';
import {
  Accordion, ActionIcon, Chip, Flex, Grid, Input, RangeSlider, Rating, ScrollArea, Stack, Text, ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { useObserver } from 'mobx-react';
import {
  IconChartBar, IconCircle, IconCircleFilled, IconHelpSquare, IconRestore,
} from '@tabler/icons-react';
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
    <ScrollArea h={`calc(100vh - ${toolbarWidth}px - 45px)`} type="scroll" overscrollBehavior="contain">
      <Accordion multiple defaultValue={['date-filters', 'blood-component-filters', 'outcome-filters']}>
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
              <Tooltip label="Reset Date Filters">
                <ActionIcon size="xs" onClick={() => store.filtersStore.resetDateFilters()}>
                  <IconRestore stroke={1} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Explain Date Filters">
                <ActionIcon size="xs">
                  <IconHelpSquare stroke={1} />
                </ActionIcon>
              </Tooltip>
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
              <Tooltip label="Reset Blood Component Filters">
                <ActionIcon size="xs" onClick={() => store.filtersStore.resetBloodComponentFilters()}>
                  <IconRestore stroke={1} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Show Visit Count Histograms">
                <ActionIcon size="xs">
                  <IconChartBar stroke={1} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Explain Blood Component Filters">
                <ActionIcon size="xs">
                  <IconHelpSquare stroke={1} />
                </ActionIcon>
              </Tooltip>
            </Flex>
            <Input.Wrapper label="RBC Units" mb="lg">
              <RangeSlider
                defaultValue={store.filtersStore.filterValues.visitRBCs}
                onChangeEnd={(value) => store.filtersStore.setFilterValue('visitRBCs', value)}
                min={store.filtersStore.initialFilterValues.visitRBCs[0]}
                max={store.filtersStore.initialFilterValues.visitRBCs[1]}
                step={1}
                marks={store.filtersStore.initialFilterValues.visitRBCs.map((val) => ({ value: val, label: String(val) }))}
                minRange={0}
                mb="md"
              />
            </Input.Wrapper>

            <Input.Wrapper label="FFP Units" mb="lg">
              <RangeSlider
                defaultValue={store.filtersStore.filterValues.visitFFPs}
                onChangeEnd={(value) => store.filtersStore.setFilterValue('visitFFPs', value)}
                min={store.filtersStore.initialFilterValues.visitFFPs[0]}
                max={store.filtersStore.initialFilterValues.visitFFPs[1]}
                step={1}
                marks={store.filtersStore.initialFilterValues.visitFFPs.map((val) => ({ value: val, label: String(val) }))}
                minRange={1}
              />
            </Input.Wrapper>

            <Input.Wrapper label="Platelet Units" mb="lg">
              <RangeSlider
                defaultValue={store.filtersStore.filterValues.visitPLTs}
                onChange={(value) => store.filtersStore.setFilterValue('visitPLTs', value)}
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

        <Accordion.Item value="outcome-filters" key="outcome-filters">
          <Accordion.Control px="xs">
            <Text>Outcome Filters</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap={0}>
              <Grid>
                <Grid.Col span={7}>
                  <Text ta="right">False</Text>
                </Grid.Col>
                <Grid.Col span={2}>
                  <Text>Off</Text>
                </Grid.Col>
                <Grid.Col span={3}>
                  <Text>True</Text>
                </Grid.Col>
              </Grid>
              <Flex>
                <Text w="45%">Death</Text>
                <Rating
                  value={store.filtersStore.filterValues.death === true ? 3 : store.filtersStore.filterValues.death === false ? 1 : 2}
                  color="blue"
                  count={3}
                  highlightSelectedOnly
                  emptySymbol={<ThemeIcon variant="white" size="sm" mr="lg"><IconCircle /></ThemeIcon>}
                  fullSymbol={<ThemeIcon variant="white" size="sm" mr="lg"><IconCircleFilled /></ThemeIcon>}
                  onChange={(value) => store.filtersStore.setFilterValue('death', value === 3 ? true : value === 1 ? false : null)}
                />
              </Flex>
              <Flex>
                <Text w="45%">Vent</Text>
                <Rating
                  value={store.filtersStore.filterValues.vent === true ? 3 : store.filtersStore.filterValues.vent === false ? 1 : 2}
                  color="blue"
                  count={3}
                  highlightSelectedOnly
                  emptySymbol={<ThemeIcon variant="white" size="sm" mr="lg"><IconCircle /></ThemeIcon>}
                  fullSymbol={<ThemeIcon variant="white" size="sm" mr="lg"><IconCircleFilled /></ThemeIcon>}
                  onChange={(value) => store.filtersStore.setFilterValue('vent', value === 3 ? true : value === 1 ? false : null)}
                />
              </Flex>
              <Flex>
                <Text w="45%">Stroke</Text>
                <Rating
                  value={store.filtersStore.filterValues.stroke === true ? 3 : store.filtersStore.filterValues.stroke === false ? 1 : 2}
                  color="blue"
                  count={3}
                  highlightSelectedOnly
                  emptySymbol={<ThemeIcon variant="white" size="sm" mr="lg"><IconCircle /></ThemeIcon>}
                  fullSymbol={<ThemeIcon variant="white" size="sm" mr="lg"><IconCircleFilled /></ThemeIcon>}
                  onChange={(value) => store.filtersStore.setFilterValue('stroke', value === 3 ? true : value === 1 ? false : null)}
                />
              </Flex>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </ScrollArea>
  ));
}
