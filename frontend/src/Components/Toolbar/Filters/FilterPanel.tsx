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
  ActionIcon,
  Title,
} from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { DateInput } from '@mantine/dates';
import {
  IconChartBar, IconCircle, IconCircleFilled, IconRestore,
} from '@tabler/icons-react';
import { useContext } from 'react';
import { useObserver } from 'mobx-react';
import { DEFAULT_DATA_COLOR, useThemeConstants } from '../../../Theme/mantineTheme';
import { FilterRangeSlider } from './FilterRangeSlider';
import { RootStore, Store } from '../../../Store/Store';
import { FilterHeader } from './FilterHeader';
import classes from '../../../Shell/Shell.module.css';
import { BLOOD_PRODUCT_COLOR_THEME } from '../../../Types/application';
import { FilterComponent } from './FilterComponent';

const dateSimplify = (date: Date) => date.toISOString().split('T')[0];

// Utility: Detect if a range filter has been applied
function rangeChanged(
  store: RootStore,
  key: 'rbc_units' | 'ffp_units' | 'plt_units' | 'cryo_units' | 'cell_saver_ml' | 'los',
) {
  const cur = store.filterValues[key];
  const init = store.initialFilterValues[key];
  return cur[0] !== init[0] || cur[1] !== init[1];
}

// Utility: Detect if a date filter has been applied
function dateChanged(
  store: RootStore,
  key: 'dateFrom' | 'dateTo',
) {
  return store.filterValues[key].getTime() !== store.initialFilterValues[key].getTime();
}

/**
 * @returns Filter Panel accordion with multiple filter sections
 */
export function FilterPanel() {
  const { toolbarWidth, iconStroke } = useThemeConstants();
  const store = useContext(Store);

  return useObserver(() => (
    <Box>
      {/* Panel Header */}
      <Flex direction="row" justify="space-between" align="center" h={40}>
        <Title order={3}>Filter Panel</Title>
        <Flex direction="row" align="center">
          <Tooltip label="Reset all filters" position="bottom">
            <ActionIcon
              aria-label="Reset all filters"
              onClick={() => { store.resetAllFilters(); }}
              className={classes.leftToolbarIcon}
              ml="xs"
            >
              <IconRestore stroke={iconStroke} size={21} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Toggle filter histograms" position="bottom">
            <ActionIcon
              aria-label="Toggle filter histograms"
              onClick={() => { store.actions.setUiState({ showFilterHistograms: !store.state.ui.showFilterHistograms }); }}
              data-active={store.state.ui.showFilterHistograms}
              className={classes.leftToolbarIcon}
              ml="xs"
            >
              <IconChartBar stroke={iconStroke} />
            </ActionIcon>
          </Tooltip>
        </Flex>
      </Flex>

      <ScrollArea
        h={`calc(100vh - ${toolbarWidth}px - 45px)`}
        type="scroll"
        overscrollBehavior="contain"
        mt="sm"
      >
        <Accordion
          multiple
          value={store.state.ui.filterPanelExpandedItems}
          onChange={(value) => store.actions.setUiState({ filterPanelExpandedItems: value })}
        >
          {/* Date Filters */}
          <Accordion.Item value="date-filters" key="date-filters">
            <FilterHeader
              countName="dateFiltersAppliedCount"
              title="Visit Date"
              tooltipLabel="Number of date filters applied"
              resetFunc={() => store.resetDateFilters()}
            />
            <Accordion.Panel>
              <Flex direction="row" justify="space-between" align="center">
                <DateInput
                  label="Date From"
                  styles={{ label: { color: dateChanged(store, 'dateFrom') ? 'var(--mantine-color-blue-filled)' : undefined } }}
                  value={dateSimplify(store.filterValues.dateFrom)}
                  onChange={(date) => date && store.setFilterValue('dateFrom', new Date(date))}
                  minDate={dateSimplify(store.initialFilterValues.dateFrom)}
                  maxDate={dateSimplify(store.initialFilterValues.dateTo)}
                  valueFormat="YYYY-MM-DD"
                  w="45%"
                />
                <DateInput
                  label="Date To"
                  styles={{ label: { color: dateChanged(store, 'dateTo') ? 'var(--mantine-color-blue-filled)' : undefined } }}
                  value={dateSimplify(store.filterValues.dateTo)}
                  onChange={(date) => date && store.setFilterValue('dateTo', new Date(date))}
                  minDate={dateSimplify(store.initialFilterValues.dateFrom)}
                  maxDate={dateSimplify(store.initialFilterValues.dateTo)}
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
              resetFunc={() => store.resetBloodComponentFilters()}
            />
            <Accordion.Panel>
              <Tooltip label="Filter for Visits That Used ..." position="top-start">
                <Input.Wrapper
                  label="RBC Units"
                  mb="lg"
                  styles={{ label: { color: rangeChanged(store, 'rbc_units') ? 'var(--mantine-color-blue-filled)' : undefined } }}
                >
                  <Flex
                    justify="center"
                    style={{ display: store.state.ui.showFilterHistograms ? 'flex' : 'none' }}
                  >
                    <FilterComponent data={store.rbc_unitsHistogramData || []} unitName="rbc_units" />
                  </Flex>
                  <FilterRangeSlider varName="rbc_units" />
                </Input.Wrapper>
              </Tooltip>

              <Tooltip label="Filter for Visits That Used ..." position="top-start">
                <Input.Wrapper
                  label="FFP Units"
                  mb="lg"
                  styles={{ label: { color: rangeChanged(store, 'ffp_units') ? 'var(--mantine-color-blue-filled)' : undefined } }}
                >
                  <Flex
                    justify="center"
                    style={{ display: store.state.ui.showFilterHistograms ? 'flex' : 'none' }}
                  >
                    <FilterComponent data={store.ffp_unitsHistogramData || []} unitName="ffp_units" />

                  </Flex>
                  <FilterRangeSlider varName="ffp_units" />
                </Input.Wrapper>
              </Tooltip>

              <Tooltip label="Filter for Visits That Used ..." position="top-start">
                <Input.Wrapper
                  label="Platelet Units"
                  mb="lg"
                  styles={{ label: { color: rangeChanged(store, 'plt_units') ? 'var(--mantine-color-blue-filled)' : undefined } }}
                >
                  <Flex
                    justify="center"
                    style={{ display: store.state.ui.showFilterHistograms ? 'flex' : 'none' }}
                  >
                    <FilterComponent data={store.plt_unitsHistogramData || []} unitName="plt_units" />
                  </Flex>
                  <FilterRangeSlider varName="plt_units" />
                </Input.Wrapper>
              </Tooltip>

              <Tooltip label="Filter for Visits That Used ..." position="top-start">
                <Input.Wrapper
                  label="Cryo Units"
                  mb="lg"
                  styles={{ label: { color: rangeChanged(store, 'cryo_units') ? 'var(--mantine-color-blue-filled)' : undefined } }}
                >
                  <Flex
                    justify="center"
                    style={{ display: store.state.ui.showFilterHistograms ? 'flex' : 'none' }}
                  >
                    <FilterComponent data={store.cryo_unitsHistogramData || []} unitName="cryo_units" />
                  </Flex>
                  <FilterRangeSlider varName="cryo_units" />
                </Input.Wrapper>
              </Tooltip>

              <Tooltip label="Filter for Visits That Used ..." position="top-start">
                <Input.Wrapper
                  label="Cell Saver (mL)"
                  mb="lg"
                  styles={{ label: { color: rangeChanged(store, 'cell_saver_ml') ? 'var(--mantine-color-blue-filled)' : undefined } }}
                >
                  <Flex
                    justify="center"
                    style={{ display: store.state.ui.showFilterHistograms ? 'flex' : 'none' }}
                  >
                    <FilterComponent data={store.cell_saver_mlHistogramData || []} unitName="cell_saver_ml" />
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
              resetFunc={() => store.resetMedicationsFilters()}
            />
            <Accordion.Panel>
              <Stack gap={0}>
                <Grid ml="sm">
                  <Grid.Col span={7}>
                    <Text
                      ta="right"
                      c={[
                        store.filterValues.b12,
                        store.filterValues.iron,
                        store.filterValues.antifibrinolytic,
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
                        store.filterValues.b12,
                        store.filterValues.iron,
                        store.filterValues.antifibrinolytic,
                      ].some((v) => v === true)
                        ? 'blue'
                        : undefined}
                    >
                      True
                    </Text>
                  </Grid.Col>
                </Grid>
                <Flex>
                  <Text w="45%" c={store.filterValues.b12 === null ? undefined : 'blue'}>
                    B12
                  </Text>
                  <Rating
                    value={
                      store.filterValues.b12 === true
                        ? 3
                        : store.filterValues.b12 === false
                          ? 1
                          : 2
                    }
                    color={DEFAULT_DATA_COLOR}
                    count={3}
                    highlightSelectedOnly
                    ml="sm"
                    emptySymbol={(
                      <ThemeIcon variant="white" color={DEFAULT_DATA_COLOR} size="sm" mr="lg">
                        <IconCircle />
                      </ThemeIcon>
                    )}
                    fullSymbol={(
                      <ThemeIcon
                        variant="white"
                        color={
                          store.filterValues.b12 === null
                            ? DEFAULT_DATA_COLOR
                            : 'blue'
                        }
                        size="sm"
                        mr="lg"
                      >
                        <IconCircleFilled />
                      </ThemeIcon>
                    )}
                    onChange={(value) => store.setFilterValue(
                      'b12',
                      value === 3 ? true : value === 1 ? false : null,
                    )}
                  />
                </Flex>
                <Flex>
                  <Text w="45%" c={store.filterValues.iron === null ? undefined : 'blue'}>
                    Iron
                  </Text>
                  <Rating
                    value={
                      store.filterValues.iron === true
                        ? 3
                        : store.filterValues.iron === false
                          ? 1
                          : 2
                    }
                    color={DEFAULT_DATA_COLOR}
                    count={3}
                    highlightSelectedOnly
                    ml="sm"
                    emptySymbol={(
                      <ThemeIcon variant="white" color={DEFAULT_DATA_COLOR} size="sm" mr="lg">
                        <IconCircle />
                      </ThemeIcon>
                    )}
                    fullSymbol={(
                      <ThemeIcon
                        variant="white"
                        color={
                          store.filterValues.iron === null
                            ? DEFAULT_DATA_COLOR
                            : 'blue'
                        }
                        size="sm"
                        mr="lg"
                      >
                        <IconCircleFilled />
                      </ThemeIcon>
                    )}
                    onChange={(value) => store.setFilterValue(
                      'iron',
                      value === 3 ? true : value === 1 ? false : null,
                    )}
                  />
                </Flex>
                <Flex>
                  <Text
                    w="45%"
                    c={
                      store.filterValues.antifibrinolytic === null
                        ? undefined
                        : 'blue'
                    }
                  >
                    Antifibrinolytic
                  </Text>
                  <Rating
                    value={
                      store.filterValues.antifibrinolytic === true
                        ? 3
                        : store.filterValues.antifibrinolytic === false
                          ? 1
                          : 2
                    }
                    color={DEFAULT_DATA_COLOR}
                    count={3}
                    highlightSelectedOnly
                    ml="sm"
                    emptySymbol={(
                      <ThemeIcon variant="white" color={DEFAULT_DATA_COLOR} size="sm" mr="lg">
                        <IconCircle />
                      </ThemeIcon>
                    )}
                    fullSymbol={(
                      <ThemeIcon
                        variant="white"
                        color={
                          store.filterValues.antifibrinolytic === null
                            ? DEFAULT_DATA_COLOR
                            : 'blue'
                        }
                        size="sm"
                        mr="lg"
                      >
                        <IconCircleFilled />
                      </ThemeIcon>
                    )}
                    onChange={(value) => store.setFilterValue(
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
              resetFunc={() => store.resetOutcomeFilters()}
            />
            <Accordion.Panel>
              <Stack gap={0}>
                <Grid>
                  <Grid.Col span={7}>
                    <Text
                      ta="right"
                      c={[
                        store.filterValues.death,
                        store.filterValues.vent,
                        store.filterValues.stroke,
                        store.filterValues.ecmo,
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
                        store.filterValues.death,
                        store.filterValues.vent,
                        store.filterValues.stroke,
                        store.filterValues.ecmo,
                      ].some((v) => v === true)
                        ? 'blue'
                        : undefined}
                    >
                      True
                    </Text>
                  </Grid.Col>
                </Grid>
                <Flex>
                  <Text w="45%" c={store.filterValues.death === null ? undefined : 'blue'}>
                    Death
                  </Text>
                  <Rating
                    value={
                      store.filterValues.death === true
                        ? 3
                        : store.filterValues.death === false
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
                          store.filterValues.death === null
                            ? DEFAULT_DATA_COLOR
                            : 'blue'
                        }
                        size="sm"
                        mr="lg"
                      >
                        <IconCircleFilled />
                      </ThemeIcon>
                    )}
                    onChange={(value) => store.setFilterValue(
                      'death',
                      value === 3 ? true : value === 1 ? false : null,
                    )}
                  />
                </Flex>
                <Flex>
                  <Text w="45%" c={store.filterValues.vent === null ? undefined : 'blue'}>
                    Vent
                  </Text>
                  <Rating
                    value={
                      store.filterValues.vent === true
                        ? 3
                        : store.filterValues.vent === false
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
                          store.filterValues.vent === null
                            ? DEFAULT_DATA_COLOR
                            : 'blue'
                        }
                        size="sm"
                        mr="lg"
                      >
                        <IconCircleFilled />
                      </ThemeIcon>
                    )}
                    onChange={(value) => store.setFilterValue(
                      'vent',
                      value === 3 ? true : value === 1 ? false : null,
                    )}
                  />
                </Flex>
                <Flex>
                  <Text w="45%" c={store.filterValues.stroke === null ? undefined : 'blue'}>
                    Stroke
                  </Text>
                  <Rating
                    value={
                      store.filterValues.stroke === true
                        ? 3
                        : store.filterValues.stroke === false
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
                          store.filterValues.stroke === null
                            ? DEFAULT_DATA_COLOR
                            : 'blue'
                        }
                        size="sm"
                        mr="lg"
                      >
                        <IconCircleFilled />
                      </ThemeIcon>
                    )}
                    onChange={(value) => store.setFilterValue(
                      'stroke',
                      value === 3 ? true : value === 1 ? false : null,
                    )}
                  />
                </Flex>
                <Flex>
                  <Text w="45%" c={store.filterValues.ecmo === null ? undefined : 'blue'}>
                    ECMO
                  </Text>
                  <Rating
                    value={
                      store.filterValues.ecmo === true
                        ? 3
                        : store.filterValues.ecmo === false
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
                          store.filterValues.ecmo === null
                            ? DEFAULT_DATA_COLOR
                            : 'blue'
                        }
                        size="sm"
                        mr="lg"
                      >
                        <IconCircleFilled />
                      </ThemeIcon>
                    )}
                    onChange={(value) => store.setFilterValue(
                      'ecmo',
                      value === 3 ? true : value === 1 ? false : null,
                    )}
                  />
                </Flex>
                <Divider my="xs" />
                <Input.Wrapper
                  label="Length of Stay"
                  styles={{ label: { color: rangeChanged(store, 'los') ? 'var(--mantine-color-blue-filled)' : undefined } }}
                >
                  {store.state.ui.showFilterHistograms && (
                    <Flex justify="center">
                      <BarChart
                        h={30}
                        style={{ width: 'calc(100% - 12px)' }}
                        barProps={{ barSize: '100%' }}
                        data={store.losHistogramData || []}
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
