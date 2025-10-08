import {
  ScrollArea,
  Accordion,
  Flex,
  Input,
  Stack,
  Divider,
  Grid,
  Rating,
  ThemeIcon,
  Text,
  Tooltip,
  Box,
} from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { DateInput } from '@mantine/dates';
import { IconCircle, IconCircleFilled } from '@tabler/icons-react';
import { useContext } from 'react';
import { useObserver } from 'mobx-react';
import { DEFAULT_DATA_COLOR, useThemeConstants } from '../../../Theme/mantineTheme';
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

  // Detect if a range filter has been applied
  const rangeChanged = (
    key: 'rbc_units' | 'ffp_units' | 'plt_units' | 'cryo_units' | 'cell_saver_ml' | 'los',
  ) => {
    const cur = store.filtersStore.filterValues[key];
    const init = store.filtersStore.initialFilterValues[key];
    return cur[0] !== init[0] || cur[1] !== init[1];
  };

  const dateChanged = (key: 'dateFrom' | 'dateTo') => store.filtersStore.filterValues[key].getTime()
    !== store.filtersStore.initialFilterValues[key].getTime();

  return useObserver(() => (
    <Box>
      <ScrollArea
        h={`calc(100vh - ${toolbarWidth}px - 45px)`}
        type="scroll"
        overscrollBehavior="contain"
        mt="sm"
      >
        <Accordion multiple defaultValue={['date-filters', 'blood-component-filters']}>
          {/* Date Filters */}
          <Accordion.Item value="date-filters" key="date-filters">
            <FilterHeader
              countName="dateFiltersAppliedCount"
              title="Visit Date"
              tooltipLabel="Number of date filters applied"
              resetFunc={() => store.filtersStore.resetDateFilters()}
            />
            <Accordion.Panel>
              <Flex direction="row" justify="space-between" align="center">
                <DateInput
                  label="Date From"
                  styles={{ label: { color: dateChanged('dateFrom') ? 'var(--mantine-color-blue-filled)' : undefined } }}
                  value={dateSimplify(store.filtersStore.filterValues.dateFrom)}
                  onChange={(date) => date && store.filtersStore.setFilterValue('dateFrom', new Date(date))}
                  minDate={dateSimplify(store.filtersStore.initialFilterValues.dateFrom)}
                  maxDate={dateSimplify(store.filtersStore.initialFilterValues.dateTo)}
                  valueFormat="YYYY-MM-DD"
                  w="45%"
                />
                <DateInput
                  label="Date To"
                  styles={{ label: { color: dateChanged('dateTo') ? 'var(--mantine-color-blue-filled)' : undefined } }}
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
            <FilterHeader
              countName="bloodComponentFiltersAppliedCount"
              title="Blood Products Used"
              tooltipLabel="Number of blood product filters applied"
              resetFunc={() => store.filtersStore.resetBloodComponentFilters()}
            />
            <Accordion.Panel>
              <Tooltip label="Filter for Visits That Used ..." position="top-start">
                <Input.Wrapper
                  label="RBC Units"
                  mb="lg"
                  styles={{ label: { color: rangeChanged('rbc_units') ? 'var(--mantine-color-blue-filled)' : undefined } }}
                >
                  <Flex
                    justify="center"
                    style={{ display: store.filtersStore.showFilterHistograms ? 'flex' : 'none' }}
                  >
                    <BarChart
                      h={30}
                      style={{ width: 'calc(100% - 12px)' }}
                      barProps={{ barSize: '100%' }}
                      data={store.filtersStore.rbc_unitsHistogramData}
                      dataKey="units"
                      withXAxis={false}
                      withYAxis={false}
                      withTooltip={false}
                      gridAxis="none"
                      series={[{ name: 'count', color: DEFAULT_DATA_COLOR }]}
                      ml={1}
                    />
                  </Flex>
                  <FilterRangeSlider varName="rbc_units" />
                </Input.Wrapper>
              </Tooltip>

              <Tooltip label="Filter for Visits That Used ..." position="top-start">
                <Input.Wrapper
                  label="FFP Units"
                  mb="lg"
                  styles={{ label: { color: rangeChanged('ffp_units') ? 'var(--mantine-color-blue-filled)' : undefined } }}
                >
                  <Flex
                    justify="center"
                    style={{ display: store.filtersStore.showFilterHistograms ? 'flex' : 'none' }}
                  >
                    <BarChart
                      h={30}
                      style={{ width: 'calc(100% - 12px)' }}
                      barProps={{ barSize: '100%' }}
                      data={store.filtersStore.ffp_unitsHistogramData}
                      dataKey="units"
                      withXAxis={false}
                      withYAxis={false}
                      withTooltip={false}
                      gridAxis="none"
                      series={[{ name: 'count', color: DEFAULT_DATA_COLOR }]}
                      ml={1}
                    />
                  </Flex>
                  <FilterRangeSlider varName="ffp_units" />
                </Input.Wrapper>
              </Tooltip>

              <Tooltip label="Filter for Visits That Used ..." position="top-start">
                <Input.Wrapper
                  label="Platelet Units"
                  mb="lg"
                  styles={{ label: { color: rangeChanged('plt_units') ? 'var(--mantine-color-blue-filled)' : undefined } }}
                >
                  <Flex
                    justify="center"
                    style={{ display: store.filtersStore.showFilterHistograms ? 'flex' : 'none' }}
                  >
                    <BarChart
                      h={30}
                      style={{ width: 'calc(100% - 12px)' }}
                      barProps={{ barSize: '100%' }}
                      data={store.filtersStore.plt_unitsHistogramData}
                      dataKey="units"
                      withXAxis={false}
                      withYAxis={false}
                      withTooltip={false}
                      gridAxis="none"
                      series={[{ name: 'count', color: DEFAULT_DATA_COLOR }]}
                      ml={1}
                    />
                  </Flex>
                  <FilterRangeSlider varName="plt_units" />
                </Input.Wrapper>
              </Tooltip>

              <Tooltip label="Filter for Visits That Used ..." position="top-start">
                <Input.Wrapper
                  label="Cryo Units"
                  mb="lg"
                  styles={{ label: { color: rangeChanged('cryo_units') ? 'var(--mantine-color-blue-filled)' : undefined } }}
                >
                  <Flex
                    justify="center"
                    style={{ display: store.filtersStore.showFilterHistograms ? 'flex' : 'none' }}
                  >
                    <BarChart
                      h={30}
                      style={{ width: 'calc(100% - 12px)' }}
                      barProps={{ barSize: '100%' }}
                      data={store.filtersStore.cryo_unitsHistogramData}
                      dataKey="units"
                      withXAxis={false}
                      withYAxis={false}
                      withTooltip={false}
                      gridAxis="none"
                      series={[{ name: 'count', color: DEFAULT_DATA_COLOR }]}
                      ml={1}
                    />
                  </Flex>
                  <FilterRangeSlider varName="cryo_units" />
                </Input.Wrapper>
              </Tooltip>

              <Tooltip label="Filter for Visits That Used ..." position="top-start">
                <Input.Wrapper
                  label="Cell Saver (mL)"
                  mb="lg"
                  styles={{ label: { color: rangeChanged('cell_saver_ml') ? 'var(--mantine-color-blue-filled)' : undefined } }}
                >
                  <Flex
                    justify="center"
                    style={{ display: store.filtersStore.showFilterHistograms ? 'flex' : 'none' }}
                  >
                    <BarChart
                      h={30}
                      style={{ width: 'calc(100% - 12px)' }}
                      barProps={{ barSize: '100%' }}
                      data={store.filtersStore.cell_saver_mlHistogramData}
                      dataKey="units"
                      withXAxis={false}
                      withYAxis={false}
                      withTooltip={false}
                      gridAxis="none"
                      series={[{ name: 'count', color: DEFAULT_DATA_COLOR }]}
                      ml={1}
                    />
                  </Flex>
                  <FilterRangeSlider varName="cell_saver_ml" />
                </Input.Wrapper>
              </Tooltip>
            </Accordion.Panel>
          </Accordion.Item>

          {/* Medication Filters */}
          <Accordion.Item value="medication-filters" key="medication-filters">
            <FilterHeader
              countName="medicationsFiltersAppliedCount"
              title="Medications Used"
              tooltipLabel="Number of medication filters applied"
              resetFunc={() => store.filtersStore.resetMedicationsFilters()}
            />
            <Accordion.Panel>
              <Stack gap={0}>
                <Grid>
                  <Grid.Col span={7}>
                    <Text
                      ta="right"
                      c={[
                        store.filtersStore.filterValues.b12,
                        store.filtersStore.filterValues.iron,
                        store.filtersStore.filterValues.antifibrinolytic,
                      ].some((v) => v === false)
                        ? 'blue'
                        : undefined}
                    >
                      False
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={2}>
                    <Text>Off</Text>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Text
                      c={[
                        store.filtersStore.filterValues.b12,
                        store.filtersStore.filterValues.iron,
                        store.filtersStore.filterValues.antifibrinolytic,
                      ].some((v) => v === true)
                        ? 'blue'
                        : undefined}
                    >
                      True
                    </Text>
                  </Grid.Col>
                </Grid>
                <Flex>
                  <Text w="45%" c={store.filtersStore.filterValues.b12 === null ? undefined : 'blue'}>
                    B12
                  </Text>
                  <Rating
                    value={
                      store.filtersStore.filterValues.b12 === true
                        ? 3
                        : store.filtersStore.filterValues.b12 === false
                          ? 1
                          : 2
                    }
                    color={DEFAULT_DATA_COLOR}
                    count={3}
                    highlightSelectedOnly
                    emptySymbol={(
                      <ThemeIcon variant="white" color={DEFAULT_DATA_COLOR} size="sm" mr="lg">
                        <IconCircle />
                      </ThemeIcon>
                    )}
                    fullSymbol={(
                      <ThemeIcon
                        variant="white"
                        color={
                          store.filtersStore.filterValues.b12 === null
                            ? DEFAULT_DATA_COLOR
                            : 'blue'
                        }
                        size="sm"
                        mr="lg"
                      >
                        <IconCircleFilled />
                      </ThemeIcon>
                    )}
                    onChange={(value) => store.filtersStore.setFilterValue(
                      'b12',
                      value === 3 ? true : value === 1 ? false : null,
                    )}
                  />
                </Flex>
                <Flex>
                  <Text w="45%" c={store.filtersStore.filterValues.iron === null ? undefined : 'blue'}>
                    Iron
                  </Text>
                  <Rating
                    value={
                      store.filtersStore.filterValues.iron === true
                        ? 3
                        : store.filtersStore.filterValues.iron === false
                          ? 1
                          : 2
                    }
                    color={DEFAULT_DATA_COLOR}
                    count={3}
                    highlightSelectedOnly
                    emptySymbol={(
                      <ThemeIcon variant="white" color={DEFAULT_DATA_COLOR} size="sm" mr="lg">
                        <IconCircle />
                      </ThemeIcon>
                    )}
                    fullSymbol={(
                      <ThemeIcon
                        variant="white"
                        color={
                          store.filtersStore.filterValues.iron === null
                            ? DEFAULT_DATA_COLOR
                            : 'blue'
                        }
                        size="sm"
                        mr="lg"
                      >
                        <IconCircleFilled />
                      </ThemeIcon>
                    )}
                    onChange={(value) => store.filtersStore.setFilterValue(
                      'iron',
                      value === 3 ? true : value === 1 ? false : null,
                    )}
                  />
                </Flex>
                <Flex>
                  <Text
                    w="45%"
                    c={
                      store.filtersStore.filterValues.antifibrinolytic === null
                        ? undefined
                        : 'blue'
                    }
                  >
                    Antifibrinolytic
                  </Text>
                  <Rating
                    value={
                      store.filtersStore.filterValues.antifibrinolytic === true
                        ? 3
                        : store.filtersStore.filterValues.antifibrinolytic === false
                          ? 1
                          : 2
                    }
                    color={DEFAULT_DATA_COLOR}
                    count={3}
                    highlightSelectedOnly
                    emptySymbol={(
                      <ThemeIcon variant="white" color={DEFAULT_DATA_COLOR} size="sm" mr="lg">
                        <IconCircle />
                      </ThemeIcon>
                    )}
                    fullSymbol={(
                      <ThemeIcon
                        variant="white"
                        color={
                          store.filtersStore.filterValues.antifibrinolytic === null
                            ? DEFAULT_DATA_COLOR
                            : 'blue'
                        }
                        size="sm"
                        mr="lg"
                      >
                        <IconCircleFilled />
                      </ThemeIcon>
                    )}
                    onChange={(value) => store.filtersStore.setFilterValue(
                      'antifibrinolytic',
                      value === 3 ? true : value === 1 ? false : null,
                    )}
                  />
                </Flex>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          {/* Outcome Filters */}
          <Accordion.Item value="outcome-filters" key="outcome-filters">
            <FilterHeader
              countName="outcomeFiltersAppliedCount"
              title="Patient Outcomes"
              tooltipLabel="Number of outcome filters applied"
              resetFunc={() => store.filtersStore.resetOutcomeFilters()}
            />
            <Accordion.Panel>
              <Stack gap={0}>
                <Grid>
                  <Grid.Col span={7}>
                    <Text
                      ta="right"
                      c={[
                        store.filtersStore.filterValues.death,
                        store.filtersStore.filterValues.vent,
                        store.filtersStore.filterValues.stroke,
                        store.filtersStore.filterValues.ecmo,
                      ].some((v) => v === false)
                        ? 'blue'
                        : undefined}
                    >
                      False
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={2}>
                    <Text>Off</Text>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Text
                      c={[
                        store.filtersStore.filterValues.death,
                        store.filtersStore.filterValues.vent,
                        store.filtersStore.filterValues.stroke,
                        store.filtersStore.filterValues.ecmo,
                      ].some((v) => v === true)
                        ? 'blue'
                        : undefined}
                    >
                      True
                    </Text>
                  </Grid.Col>
                </Grid>
                <Flex>
                  <Text w="45%" c={store.filtersStore.filterValues.death === null ? undefined : 'blue'}>
                    Death
                  </Text>
                  <Rating
                    value={
                      store.filtersStore.filterValues.death === true
                        ? 3
                        : store.filtersStore.filterValues.death === false
                          ? 1
                          : 2
                    }
                    color={DEFAULT_DATA_COLOR}
                    count={3}
                    highlightSelectedOnly
                    emptySymbol={(
                      <ThemeIcon variant="white" color={DEFAULT_DATA_COLOR} size="sm" mr="lg">
                        <IconCircle />
                      </ThemeIcon>
                    )}
                    fullSymbol={(
                      <ThemeIcon
                        variant="white"
                        color={
                          store.filtersStore.filterValues.death === null
                            ? DEFAULT_DATA_COLOR
                            : 'blue'
                        }
                        size="sm"
                        mr="lg"
                      >
                        <IconCircleFilled />
                      </ThemeIcon>
                    )}
                    onChange={(value) => store.filtersStore.setFilterValue(
                      'death',
                      value === 3 ? true : value === 1 ? false : null,
                    )}
                  />
                </Flex>
                <Flex>
                  <Text w="45%" c={store.filtersStore.filterValues.vent === null ? undefined : 'blue'}>
                    Vent
                  </Text>
                  <Rating
                    value={
                      store.filtersStore.filterValues.vent === true
                        ? 3
                        : store.filtersStore.filterValues.vent === false
                          ? 1
                          : 2
                    }
                    color={DEFAULT_DATA_COLOR}
                    count={3}
                    highlightSelectedOnly
                    emptySymbol={(
                      <ThemeIcon variant="white" color={DEFAULT_DATA_COLOR} size="sm" mr="lg">
                        <IconCircle />
                      </ThemeIcon>
                    )}
                    fullSymbol={(
                      <ThemeIcon
                        variant="white"
                        color={
                          store.filtersStore.filterValues.vent === null
                            ? DEFAULT_DATA_COLOR
                            : 'blue'
                        }
                        size="sm"
                        mr="lg"
                      >
                        <IconCircleFilled />
                      </ThemeIcon>
                    )}
                    onChange={(value) => store.filtersStore.setFilterValue(
                      'vent',
                      value === 3 ? true : value === 1 ? false : null,
                    )}
                  />
                </Flex>
                <Flex>
                  <Text w="45%" c={store.filtersStore.filterValues.stroke === null ? undefined : 'blue'}>
                    Stroke
                  </Text>
                  <Rating
                    value={
                      store.filtersStore.filterValues.stroke === true
                        ? 3
                        : store.filtersStore.filterValues.stroke === false
                          ? 1
                          : 2
                    }
                    color={DEFAULT_DATA_COLOR}
                    count={3}
                    highlightSelectedOnly
                    emptySymbol={(
                      <ThemeIcon variant="white" color={DEFAULT_DATA_COLOR} size="sm" mr="lg">
                        <IconCircle />
                      </ThemeIcon>
                    )}
                    fullSymbol={(
                      <ThemeIcon
                        variant="white"
                        color={
                          store.filtersStore.filterValues.stroke === null
                            ? DEFAULT_DATA_COLOR
                            : 'blue'
                        }
                        size="sm"
                        mr="lg"
                      >
                        <IconCircleFilled />
                      </ThemeIcon>
                    )}
                    onChange={(value) => store.filtersStore.setFilterValue(
                      'stroke',
                      value === 3 ? true : value === 1 ? false : null,
                    )}
                  />
                </Flex>
                <Flex>
                  <Text w="45%" c={store.filtersStore.filterValues.ecmo === null ? undefined : 'blue'}>
                    ECMO
                  </Text>
                  <Rating
                    value={
                      store.filtersStore.filterValues.ecmo === true
                        ? 3
                        : store.filtersStore.filterValues.ecmo === false
                          ? 1
                          : 2
                    }
                    color={DEFAULT_DATA_COLOR}
                    count={3}
                    highlightSelectedOnly
                    emptySymbol={(
                      <ThemeIcon variant="white" color={DEFAULT_DATA_COLOR} size="sm" mr="lg">
                        <IconCircle />
                      </ThemeIcon>
                    )}
                    fullSymbol={(
                      <ThemeIcon
                        variant="white"
                        color={
                          store.filtersStore.filterValues.ecmo === null
                            ? DEFAULT_DATA_COLOR
                            : 'blue'
                        }
                        size="sm"
                        mr="lg"
                      >
                        <IconCircleFilled />
                      </ThemeIcon>
                    )}
                    onChange={(value) => store.filtersStore.setFilterValue(
                      'ecmo',
                      value === 3 ? true : value === 1 ? false : null,
                    )}
                  />
                </Flex>
                <Divider my="xs" />
                <Input.Wrapper
                  label="Length of Stay"
                  mb="lg"
                  styles={{ label: { color: rangeChanged('los') ? 'var(--mantine-color-blue-filled)' : undefined } }}
                >
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
                        series={[{ name: 'count', color: DEFAULT_DATA_COLOR }]}
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
    </Box>
  ));
}
