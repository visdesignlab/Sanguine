import {
  ScrollArea,
  Accordion,
  Flex,
  Input,
  Stack,
  Divider,
  Grid,
  Text,
  Tooltip,
  Box,
  ActionIcon,
  Title,
} from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { DateInput } from '@mantine/dates';
import {
  IconChartBar, IconRestore,
} from '@tabler/icons-react';
import { useContext } from 'react';
import { useObserver } from 'mobx-react-lite';
import { DEFAULT_DATA_COLOR, useThemeConstants } from '../../../Theme/mantineTheme';
import { FilterRangeSlider } from './FilterRangeSlider';
import { RootStore, Store } from '../../../Store/Store';
import { FilterHeader } from './FilterHeader';
import { DepartmentProcedureFilter } from './DepartmentProcedureFilter';
import classes from '../../../Shell/Shell.module.css';
import { FilterHistogramWithSliderComponent } from './FilterHistogramWithSliderComponent';
import { BLOOD_PRODUCTS_ARRAY, BloodComponent } from '../../../Types/bloodProducts';
import { TrueFalseNotAppliedToggle } from './TrueFalseNotAppliedToggle';

const dateSimplify = (date: Date) => date.toISOString().split('T')[0];

// Utility: Detect if a range filter has been applied
function rangeChanged(
  store: RootStore,
  key: BloodComponent | 'los',
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
          pb="xl"
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
            <Accordion.Panel style={{ display: 'flex', flexDirection: 'column' }}>

              {BLOOD_PRODUCTS_ARRAY.map((bloodComponent) => (
                <FilterHistogramWithSliderComponent key={`filter-${bloodComponent}`} data={store.getHistogramData(bloodComponent) || []} unitName={bloodComponent} />
              ))}
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
                <TrueFalseNotAppliedToggle label="B12" currentFilterValue={store.filterValues.b12} setFilterCallback={(value) => store.setFilterValue('b12', value)} />

                <TrueFalseNotAppliedToggle label="Iron" currentFilterValue={store.filterValues.iron} setFilterCallback={(value) => store.setFilterValue('iron', value)} />
                <TrueFalseNotAppliedToggle label="Antifibrinolytic" currentFilterValue={store.filterValues.antifibrinolytic} setFilterCallback={(value) => store.setFilterValue('antifibrinolytic', value)} />

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
                <TrueFalseNotAppliedToggle label="Death" currentFilterValue={store.filterValues.death} setFilterCallback={(value) => store.setFilterValue('death', value)} />
                <TrueFalseNotAppliedToggle label="Vent" currentFilterValue={store.filterValues.vent} setFilterCallback={(value) => store.setFilterValue('vent', value)} />
                <TrueFalseNotAppliedToggle label="Stroke" currentFilterValue={store.filterValues.stroke} setFilterCallback={(value) => store.setFilterValue('stroke', value)} />
                <TrueFalseNotAppliedToggle label="ECMO" currentFilterValue={store.filterValues.ecmo} setFilterCallback={(value) => store.setFilterValue('ecmo', value)} />

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

          {/* Department & Procedure Filters */}
          <Accordion.Item value="department-procedure-filters" key="department-procedure-filters">
            <FilterHeader
              countName="procedureDepartmentsAppliedCount"
              title="Department & Procedure"
              tooltipLabel="Number of involved departments"
              resetFunc={() => store.resetProcedureFilters()}
            />
            <Accordion.Panel styles={{ content: { paddingLeft: 8, paddingRight: 8 } }}>
              <DepartmentProcedureFilter />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </ScrollArea>
    </Box>
  ));
}
