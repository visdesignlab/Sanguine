import {
  ScrollArea, Accordion, Flex, Input,
  Stack,
  Divider,
  Grid,
  Rating,
  ThemeIcon,
  Text,
} from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { DateInput } from '@mantine/dates';
import { IconCircle, IconCircleFilled } from '@tabler/icons-react';
import { useContext } from 'react';
import { useObserver } from 'mobx-react';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import { FilterRangeSlider } from './FilterRangeSlider';
import { Store } from '../../../Store/Store';
import { FilterHeader } from './FilterHeader';

const dateSimplify = (date: Date) => date.toISOString().split('T')[0];

/**
 * @returns Filter Panel accordion with multiple filter sections
 */
export function FilterPanel() {
  const { toolbarWidth } = useThemeConstants();
  const store = useContext(Store);

  return useObserver(() => (
    <ScrollArea h={`calc(100vh - ${toolbarWidth}px - 45px)`} type="scroll" overscrollBehavior="contain" mt="sm">
      <Accordion multiple defaultValue={['date-filters', 'blood-component-filters']}>
        {/** Date Filters */}
        <Accordion.Item value="date-filters" key="date-filters">
          <FilterHeader countName="dateFiltersAppliedCount" title="Visit Date" resetFunc={() => store.filtersStore.resetDateFilters()} />
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
        {/* Blood Component Filters */}
        <Accordion.Item value="blood-component-filters" key="blood-component-filters">
          <FilterHeader countName="bloodComponentFiltersAppliedCount" title="Blood Products Used" resetFunc={() => store.filtersStore.resetBloodComponentFilters()} />
          <Accordion.Panel>
            <Input.Wrapper label="RBC Units" mb="lg">
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
            <Input.Wrapper label="FFP Units" mb="lg">
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
            <Input.Wrapper label="Platelet Units" mb="lg">
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
            <Input.Wrapper label="Cryo Units" mb="lg">
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
        {/** Medication Filters */}
        <Accordion.Item value="medication-filters" key="medication-filters">
          <FilterHeader countName="medicationsFiltersAppliedCount" title="Medications Used" resetFunc={() => store.filtersStore.resetMedicationsFilters()} />
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
                <Text w="45%">B12</Text>
                <Rating
                  value={store.filtersStore.filterValues.b12 === true ? 3 : store.filtersStore.filterValues.b12 === false ? 1 : 2}
                  color="blue"
                  count={3}
                  highlightSelectedOnly
                  emptySymbol={<ThemeIcon variant="white" size="sm" mr="lg"><IconCircle /></ThemeIcon>}
                  fullSymbol={<ThemeIcon variant="white" size="sm" mr="lg"><IconCircleFilled /></ThemeIcon>}
                  onChange={(value) => store.filtersStore.setFilterValue('b12', value === 3 ? true : value === 1 ? false : null)}
                />
              </Flex>
              <Flex>
                <Text w="45%">Iron</Text>
                <Rating
                  value={store.filtersStore.filterValues.iron === true ? 3 : store.filtersStore.filterValues.iron === false ? 1 : 2}
                  color="blue"
                  count={3}
                  highlightSelectedOnly
                  emptySymbol={<ThemeIcon variant="white" size="sm" mr="lg"><IconCircle /></ThemeIcon>}
                  fullSymbol={<ThemeIcon variant="white" size="sm" mr="lg"><IconCircleFilled /></ThemeIcon>}
                  onChange={(value) => store.filtersStore.setFilterValue('iron', value === 3 ? true : value === 1 ? false : null)}
                />
              </Flex>
              <Flex>
                <Text w="45%">Antifibrinolytic </Text>
                <Rating
                  value={store.filtersStore.filterValues.antifibrinolytic === true ? 3 : store.filtersStore.filterValues.antifibrinolytic === false ? 1 : 2}
                  color="blue"
                  count={3}
                  highlightSelectedOnly
                  emptySymbol={<ThemeIcon variant="white" size="sm" mr="lg"><IconCircle /></ThemeIcon>}
                  fullSymbol={<ThemeIcon variant="white" size="sm" mr="lg"><IconCircleFilled /></ThemeIcon>}
                  onChange={(value) => store.filtersStore.setFilterValue('antifibrinolytic', value === 3 ? true : value === 1 ? false : null)}
                />
              </Flex>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
        {/** Outcome Filters */}
        <Accordion.Item value="outcome-filters" key="outcome-filters">
          <FilterHeader countName="outcomeFiltersAppliedCount" title="Patient Outcomes" resetFunc={() => store.filtersStore.resetOutcomeFilters()} />
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
              <Flex>
                <Text w="45%">ECMO</Text>
                <Rating
                  value={store.filtersStore.filterValues.ecmo === true ? 3 : store.filtersStore.filterValues.ecmo === false ? 1 : 2}
                  color="blue"
                  count={3}
                  highlightSelectedOnly
                  emptySymbol={<ThemeIcon variant="white" size="sm" mr="lg"><IconCircle /></ThemeIcon>}
                  fullSymbol={<ThemeIcon variant="white" size="sm" mr="lg"><IconCircleFilled /></ThemeIcon>}
                  onChange={(value) => store.filtersStore.setFilterValue('ecmo', value === 3 ? true : value === 1 ? false : null)}
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
