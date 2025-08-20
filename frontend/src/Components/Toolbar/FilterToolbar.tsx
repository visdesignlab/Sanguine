import { DateInput } from '@mantine/dates';
import { useContext, useEffect, useState } from 'react';
import {
  Accordion, ActionIcon, Badge, Flex, Grid, Input, RangeSlider, Rating, ScrollArea, Stack, Text, ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { useObserver } from 'mobx-react';
import {
  IconChartBar, IconCircle, IconCircleFilled, IconHelpSquare, IconRestore,
} from '@tabler/icons-react';
import { BarChart } from '@mantine/charts';
import { Store } from '../../Store/Store';
import { useThemeConstants } from '../../Theme/mantineTheme';
import shellStyles from '../../Shell/Shell.module.css';

const dateSimplify = (date: Date) => date.toISOString().split('T')[0]; // Format as YYYY-MM-DD;

export function FilterToolbar() {
  const store = useContext(Store);
  const [showBloodComponentHistogram, setShowBloodComponentHistogram] = useState(false);
  const {
    dateFiltersAppliedCount: dateFilterCount,
    bloodComponentFiltersAppliedCount: bloodComponentFilterCount,
    patientOutcomeFiltersAppliedCount: outcomeFilterCount,
  } = store.filtersStore;
  const { toolbarWidth } = useThemeConstants();

  const [rbcRange, setRbcRange] = useState(store.filtersStore.filterValues.visitRBCs);
  useEffect(() => {
    if (store.filtersStore.filterValues.visitRBCs[0] !== rbcRange[0] || store.filtersStore.filterValues.visitRBCs[1] !== rbcRange[1]) {
      setRbcRange(store.filtersStore.filterValues.visitRBCs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.filtersStore.filterValues.visitRBCs]);
  const [ffpRange, setFfpRange] = useState(store.filtersStore.filterValues.visitFFPs);
  useEffect(() => {
    if (store.filtersStore.filterValues.visitFFPs[0] !== ffpRange[0] || store.filtersStore.filterValues.visitFFPs[1] !== ffpRange[1]) {
      setFfpRange(store.filtersStore.filterValues.visitFFPs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.filtersStore.filterValues.visitFFPs]);
  const [pltRange, setPltRange] = useState(store.filtersStore.filterValues.visitPLTs);
  useEffect(() => {
    if (store.filtersStore.filterValues.visitPLTs[0] !== pltRange[0] || store.filtersStore.filterValues.visitPLTs[1] !== pltRange[1]) {
      setPltRange(store.filtersStore.filterValues.visitPLTs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.filtersStore.filterValues.visitPLTs]);
  const [cryoRange, setCryoRange] = useState(store.filtersStore.filterValues.visitCryo);
  useEffect(() => {
    if (store.filtersStore.filterValues.visitCryo[0] !== cryoRange[0] || store.filtersStore.filterValues.visitCryo[1] !== cryoRange[1]) {
      setCryoRange(store.filtersStore.filterValues.visitCryo);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.filtersStore.filterValues.visitCryo]);
  const [cellSaverRange, setCellSaverRange] = useState(store.filtersStore.filterValues.visitCellSaver);
  useEffect(() => {
    if (store.filtersStore.filterValues.visitCellSaver[0] !== cellSaverRange[0] || store.filtersStore.filterValues.visitCellSaver[1] !== cellSaverRange[1]) {
      setCellSaverRange(store.filtersStore.filterValues.visitCellSaver);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.filtersStore.filterValues.visitCellSaver]);

  return useObserver(() => (
    <ScrollArea h={`calc(100vh - ${toolbarWidth}px - 45px)`} type="scroll" overscrollBehavior="contain">
      <Accordion multiple defaultValue={['date-filters', 'blood-component-filters', 'outcome-filters']} mt="xs">
        <Accordion.Item value="date-filters" key="date-filters">
          <Accordion.Control px="xs">
            <Flex justify="space-between" align="center" gap="xs" mr="xs">
              <Title order={4} c={dateFilterCount > 0 ? 'blue.6' : undefined}>Visit Date</Title>
              {dateFilterCount > 0 && (
                <Badge
                  color="blue"
                  radius="sm"
                  variant="light"
                >
                  {dateFilterCount}
                </Badge>
              )}
            </Flex>
          </Accordion.Control>
          <Accordion.Panel>
            <Flex justify="flex-start" align="center" gap="sm" mt={0} mb="xs">
              <Tooltip label="Reset Date Filters">
                <ActionIcon size="sm" onClick={() => store.filtersStore.resetDateFilters()}>
                  <IconRestore stroke={1} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Explain Date Filters">
                <ActionIcon size="sm">
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
              <Title order={4} c={bloodComponentFilterCount > 0 ? 'blue' : undefined}>Blood Component Used</Title>
              {bloodComponentFilterCount > 0 && (
                <Badge
                  color="blue"
                  radius="sm"
                  variant="light"
                >
                  {bloodComponentFilterCount}
                </Badge>
              )}
            </Flex>
          </Accordion.Control>
          <Accordion.Panel>
            <Flex justify="flex-start" align="center" gap="sm" mt={0} mb="xs">
              <Tooltip label="Reset Blood Component Filters">
                <ActionIcon size="sm" onClick={() => store.filtersStore.resetBloodComponentFilters()}>
                  <IconRestore stroke={1} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Show Visit Count Histograms">
                <ActionIcon
                  size="sm"
                  onClick={() => setShowBloodComponentHistogram((prev) => !prev)}
                  data-active={showBloodComponentHistogram}
                  className={shellStyles.leftToolbarIcon}
                >
                  <IconChartBar stroke={1} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Explain Blood Component Filters">
                <ActionIcon size="sm">
                  <IconHelpSquare stroke={1} />
                </ActionIcon>
              </Tooltip>
            </Flex>
            <Input.Wrapper label="RBC Units" mb="lg">
              {showBloodComponentHistogram && (
              <Flex justify="center">
                <BarChart
                  h={30}
                  style={{ width: 'calc(100% - 12px)' }}
                  barProps={{ barSize: '100%' }}
                  data={store.filtersStore.rbcUnitsHistogramData}
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
              <RangeSlider
                defaultValue={store.filtersStore.filterValues.visitRBCs}
                value={rbcRange}
                onChange={setRbcRange}
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
              {showBloodComponentHistogram && (
              <Flex justify="center">
                <BarChart
                  h={30}
                  style={{ width: 'calc(100% - 12px)' }}
                  barProps={{ barSize: '100%' }}
                  data={store.filtersStore.ffpUnitsHistogramData}
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
              <RangeSlider
                defaultValue={store.filtersStore.filterValues.visitFFPs}
                value={ffpRange}
                onChange={setFfpRange}
                onChangeEnd={(value) => store.filtersStore.setFilterValue('visitFFPs', value)}
                min={store.filtersStore.initialFilterValues.visitFFPs[0]}
                max={store.filtersStore.initialFilterValues.visitFFPs[1]}
                step={1}
                marks={store.filtersStore.initialFilterValues.visitFFPs.map((val) => ({ value: val, label: String(val) }))}
                minRange={1}
              />
            </Input.Wrapper>

            <Input.Wrapper label="Platelet Units" mb="lg">
              {showBloodComponentHistogram && (
              <Flex justify="center">
                <BarChart
                  h={30}
                  style={{ width: 'calc(100% - 12px)' }}
                  barProps={{ barSize: '100%' }}
                  data={store.filtersStore.pltUnitsHistogramData}
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
              <RangeSlider
                defaultValue={store.filtersStore.filterValues.visitPLTs}
                value={pltRange}
                onChange={setPltRange}
                onChangeEnd={(value) => store.filtersStore.setFilterValue('visitPLTs', value)}
                min={store.filtersStore.initialFilterValues.visitPLTs[0]}
                max={store.filtersStore.initialFilterValues.visitPLTs[1]}
                step={1}
                marks={store.filtersStore.initialFilterValues.visitPLTs.map((val) => ({ value: val, label: String(val) }))}
                minRange={1}
              />
            </Input.Wrapper>

            <Input.Wrapper label="Cryo Units" mb="lg">
              {showBloodComponentHistogram && (
              <Flex justify="center">
                <BarChart
                  h={30}
                  style={{ width: 'calc(100% - 12px)' }}
                  barProps={{ barSize: '100%' }}
                  data={store.filtersStore.cryoUnitsHistogramData}
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
              <RangeSlider
                defaultValue={store.filtersStore.filterValues.visitCryo}
                value={cryoRange}
                onChange={setCryoRange}
                onChangeEnd={(value) => store.filtersStore.setFilterValue('visitCryo', value)}
                min={store.filtersStore.initialFilterValues.visitCryo[0]}
                max={store.filtersStore.initialFilterValues.visitCryo[1]}
                step={1}
                marks={store.filtersStore.initialFilterValues.visitCryo.map((val) => ({ value: val, label: String(val) }))}
                minRange={1}
              />
            </Input.Wrapper>

            <Input.Wrapper label="Cell Saver (mL)" mb="lg">
              {showBloodComponentHistogram && (
              <Flex justify="center">
                <BarChart
                  h={30}
                  style={{ width: 'calc(100% - 12px)' }}
                  barProps={{ barSize: '100%' }}
                  data={store.filtersStore.cellSaverHistogramData}
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
              <RangeSlider
                defaultValue={store.filtersStore.filterValues.visitCellSaver}
                value={cellSaverRange}
                onChange={setCellSaverRange}
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
            <Flex justify="space-between" align="center" gap="xs" mr="xs">
              <Title order={4} c={outcomeFilterCount > 0 ? 'blue.6' : undefined}>Patient Outcome</Title>
              {outcomeFilterCount > 0 && (
                <Badge
                  color="blue"
                  radius="sm"
                  variant="light"
                >
                  {outcomeFilterCount}
                </Badge>
              )}
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
