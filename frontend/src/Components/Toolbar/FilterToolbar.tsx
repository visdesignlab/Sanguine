import { DateInput } from '@mantine/dates';
import { useContext } from 'react';
import {
  Accordion, ActionIcon, Badge, Divider, Flex, Grid, Input, Rating, ScrollArea, Stack, Text, ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { useObserver } from 'mobx-react';
import {
  IconCircle, IconCircleFilled, IconRestore,
} from '@tabler/icons-react';
import { BarChart } from '@mantine/charts';
import { Store } from '../../Store/Store';
import { useThemeConstants } from '../../Theme/mantineTheme';
import { FilterRangeSlider } from './FilterRangeSlider';
import { FilterCountBadge } from './FilterCountBadge';

const dateSimplify = (date: Date) => date.toISOString().split('T')[0]; // Format as YYYY-MM-DD;

export function FilterToolbar() {
  const store = useContext(Store);
  const { toolbarWidth } = useThemeConstants();

  // Helper to determine if a filter active
  // const hasAttributeBeenFiltered = useCallback((range: [number, number], initial: [number, number]) => range[0] !== initial[0] || range[1] !== initial[1], []);

  console.log('FilterToolbar rendered');

  return useObserver(() => (
    <ScrollArea h={`calc(100vh - ${toolbarWidth}px - 45px)`} type="scroll" overscrollBehavior="contain">
      <Accordion multiple defaultValue={['date-filters', 'blood-component-filters']} mt="xs">
        <Accordion.Item value="date-filters" key="date-filters">
          <Flex align="center">
            <Accordion.Control px="xs">
              <Flex justify="space-between" align="center" gap="xs" mr="xs">
                <Title order={4} c={store.filtersStore.dateFiltersAppliedCount > 0 ? 'blue.6' : undefined}>Visit Date</Title>
                {store.filtersStore.dateFiltersAppliedCount > 0 && (
                <Badge
                  color="blue"
                  radius="sm"
                  variant="light"
                >
                  {store.filtersStore.dateFiltersAppliedCount}
                </Badge>
                )}
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

        <Accordion.Item value="blood-component-filters" key="blood-component-filters">
          <Flex align="center">
            <Accordion.Control px="xs">
              <Flex justify="space-between" align="center" gap="xs" mr="xs" h={toolbarWidth / 2}>
                <Title order={4} c={store.filtersStore.bloodComponentFiltersAppliedCount > 0 ? 'blue' : undefined}>Blood Products Used</Title>
                <FilterCountBadge type="bloodComponent" />
              </Flex>
            </Accordion.Control>
            <Tooltip label="Reset Blood Product Filters">
              <ActionIcon size="sm" onClick={() => store.filtersStore.resetBloodComponentFilters()}>
                <IconRestore stroke={1} />
              </ActionIcon>
            </Tooltip>
          </Flex>
          <Accordion.Panel>
            <Input.Wrapper
              label="RBC Units"
              // labelProps={hasAttributeBeenFiltered(store.filtersStore.filterValues.visitRBCs, store.filtersStore.initialFilterValues.visitRBCs) ? { style: { color: theme.colors.blue[6] } } : undefined}
              mb="lg"
            >
              <Flex justify="center" style={{ display: store.filtersStore.showFilterHistograms ? 'flex' : 'none' }}>
                <BarChart
                  h={30}
                  style={{ width: 'calc(100% - 12px)' }}
                  barProps={{ barSize: '100%' }}
                  data={store.filtersStore.visitRBCsHistogramData}
                  dataKey="units"
                  withXAxis={false}
                  withYAxis={false}
                  withTooltip={false}
                  gridAxis="none"
                  series={[{ name: 'count', color: 'blue' }]}
                  ml={1}
                />
              </Flex>
              <FilterRangeSlider varName="visitRBCs" />
            </Input.Wrapper>

            <Input.Wrapper
              label="FFP Units"
              // labelProps={hasAttributeBeenFiltered(ffpRange, store.filtersStore.initialFilterValues.visitFFPs) ? { style: { color: theme.colors.blue[6] } } : undefined}
              mb="lg"
            >
              <Flex justify="center" style={{ display: store.filtersStore.showFilterHistograms ? 'flex' : 'none' }}>
                <BarChart
                  h={30}
                  style={{ width: 'calc(100% - 12px)' }}
                  barProps={{ barSize: '100%' }}
                  data={store.filtersStore.visitFFPsHistogramData}
                  dataKey="units"
                  withXAxis={false}
                  withYAxis={false}
                  withTooltip={false}
                  gridAxis="none"
                  series={[{ name: 'count', color: 'blue' }]}
                  ml={1}
                />
              </Flex>
              <FilterRangeSlider varName="visitFFPs" />
            </Input.Wrapper>

            <Input.Wrapper
              label="Platelet Units"
              // labelProps={hasAttributeBeenFiltered(pltRange, store.filtersStore.initialFilterValues.visitPLTs) ? { style: { color: theme.colors.blue[6] } } : undefined}
              mb="lg"
            >
              <Flex justify="center" style={{ display: store.filtersStore.showFilterHistograms ? 'flex' : 'none' }}>
                <BarChart
                  h={30}
                  style={{ width: 'calc(100% - 12px)' }}
                  barProps={{ barSize: '100%' }}
                  data={store.filtersStore.visitPLTsHistogramData}
                  dataKey="units"
                  withXAxis={false}
                  withYAxis={false}
                  withTooltip={false}
                  gridAxis="none"
                  series={[{ name: 'count', color: 'blue' }]}
                  ml={1}
                />
              </Flex>
              <FilterRangeSlider varName="visitPLTs" />
            </Input.Wrapper>

            <Input.Wrapper
              label="Cryo Units"
              // labelProps={hasAttributeBeenFiltered(cryoRange, store.filtersStore.initialFilterValues.visitCryo) ? { style: { color: theme.colors.blue[6] } } : undefined}
              mb="lg"
            >
              <Flex justify="center" style={{ display: store.filtersStore.showFilterHistograms ? 'flex' : 'none' }}>
                <BarChart
                  h={30}
                  style={{ width: 'calc(100% - 12px)' }}
                  barProps={{ barSize: '100%' }}
                  data={store.filtersStore.visitCryoHistogramData}
                  dataKey="units"
                  withXAxis={false}
                  withYAxis={false}
                  withTooltip={false}
                  gridAxis="none"
                  series={[{ name: 'count', color: 'blue' }]}
                  ml={1}
                />
              </Flex>
              <FilterRangeSlider varName="visitCryo" />
            </Input.Wrapper>

            <Input.Wrapper label="Cell Saver (mL)" mb="lg">
              <Flex justify="center" style={{ display: store.filtersStore.showFilterHistograms ? 'flex' : 'none' }}>
                <BarChart
                  h={30}
                  style={{ width: 'calc(100% - 12px)' }}
                  barProps={{ barSize: '100%' }}
                  data={store.filtersStore.visitCellSaverHistogramData}
                  dataKey="units"
                  withXAxis={false}
                  withYAxis={false}
                  withTooltip={false}
                  gridAxis="none"
                  series={[{ name: 'count', color: 'blue' }]}
                  ml={1}
                />
              </Flex>
              <FilterRangeSlider varName="visitCellSaver" />
            </Input.Wrapper>
          </Accordion.Panel>
        </Accordion.Item>
        {/** Medications */}
        <Accordion.Item value="medication-filters" key="medication-filters">
          <Accordion.Control px="xs">
            <Flex justify="space-between" align="center" gap="xs" mr="xs">
              <Title order={4}>Prior Medications</Title>
            </Flex>
          </Accordion.Control>
          <Accordion.Panel>
            <Input.Wrapper
              label="B12 Used Before Surgery"
              // labelProps={hasAttributeBeenFiltered(cryoRange, store.filtersStore.initialFilterValues.visitCryo) ? { style: { color: theme.colors.blue[6] } } : undefined}
              mb="lg"
            >
              {store.filtersStore.showFilterHistograms && (
              <Flex justify="center">
                <BarChart
                  h={30}
                  style={{ width: 'calc(100% - 12px)' }}
                  barProps={{ barSize: '100%' }}
                  data={store.filtersStore.visitCryoHistogramData}
                  dataKey="units"
                  withXAxis={false}
                  withYAxis={false}
                  withTooltip={false}
                  gridAxis="none"
                  series={[{ name: 'count', color: 'blue' }]}
                  ml={1}
                />
              </Flex>
              )}
              {/* <RangeSlider
                defaultValue={store.filtersStore.filterValues.visitCryo}
                value={cryoRange}
                onChange={setCryoRange}
                onChangeEnd={(value) => store.filtersStore.setFilterValue('visitCryo', value)}
                min={store.filtersStore.initialFilterValues.visitCryo[0]}
                max={store.filtersStore.initialFilterValues.visitCryo[1]}
                step={1}
                marks={store.filtersStore.initialFilterValues.visitCryo.map((val) => ({ value: val, label: String(val) }))}
                minRange={0}
              /> */}
            </Input.Wrapper>
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="outcome-filters" key="outcome-filters">
          <Accordion.Control px="xs">
            <Flex justify="space-between" align="center" gap="xs" mr="xs">
              <Title order={4} c={store.filtersStore.patientOutcomeFiltersAppliedCount > 0 ? 'blue.6' : undefined}>Patient Outcome</Title>
              <FilterCountBadge type="patientOutcome" />
            </Flex>
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
              <Divider my="xs" />
              <Input.Wrapper label="Length of Stay" mb="lg">
                {store.filtersStore.showFilterHistograms && (
                <Flex justify="center">
                  <BarChart
                    h={30}
                    style={{ width: 'calc(100% - 12px)' }}
                    barProps={{ barSize: '100%' }}
                    data={store.filtersStore.losHistogramData}
                    dataKey="units"
                    withXAxis={false}
                    withYAxis={false}
                    withTooltip={false}
                    gridAxis="none"
                    series={[{ name: 'count', color: 'blue' }]}
                    ml={1}
                  />
                </Flex>
                )}
                <FilterRangeSlider varName="los" />
              </Input.Wrapper>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </ScrollArea>
  ));
}
