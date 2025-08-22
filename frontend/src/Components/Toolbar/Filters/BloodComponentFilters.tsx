import { useContext } from 'react';
import {
  Accordion, Flex, ActionIcon, Tooltip, Title, Input,
  Badge,
} from '@mantine/core';
import { useObserver } from 'mobx-react';
import { IconRestore } from '@tabler/icons-react';
import { BarChart } from '@mantine/charts';
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import { FilterRangeSlider } from './FilterRangeSlider';

export function BloodComponentFilters() {
  const store = useContext(Store);
  const { toolbarWidth } = useThemeConstants();
  return useObserver(() => (
    <Accordion.Item value="blood-component-filters" key="blood-component-filters">
      <Flex align="center">
        <Accordion.Control px="xs">
          <Flex justify="space-between" align="center" gap="xs" mr="xs" h={toolbarWidth / 2}>
            <Title order={4} c={store.filtersStore.bloodComponentFiltersAppliedCount > 0 ? 'blue' : undefined}>Blood Products Used</Title>
            {/** Filter count badge */}
            {store.filtersStore.bloodComponentFiltersAppliedCount > 0 ? (
              <Badge color="blue" radius="sm" variant="light">
                {store.filtersStore.bloodComponentFiltersAppliedCount}
              </Badge>
            ) : null}
          </Flex>
        </Accordion.Control>
        <Tooltip label="Reset Blood Product Filters">
          <ActionIcon size="sm" onClick={() => store.filtersStore.resetBloodComponentFilters()}>
            <IconRestore stroke={1} />
          </ActionIcon>
        </Tooltip>
      </Flex>
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
  ));
}
