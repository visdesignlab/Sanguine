import { useContext } from 'react';
import { useObserver } from 'mobx-react-lite';
import {
  Accordion, Badge, Divider, Flex, Grid, Input, Rating, Stack, Text, ThemeIcon, Title,
} from '@mantine/core';
import { IconCircle, IconCircleFilled } from '@tabler/icons-react';
import { BarChart } from '@mantine/charts';
import { Store } from '../../../Store/Store';
import { FilterRangeSlider } from './FilterRangeSlider';

export function OutcomeFilters() {
  const store = useContext(Store);

  return useObserver(() => (
    <Accordion.Item value="outcome-filters" key="outcome-filters">
      <Accordion.Control px="xs">
        <Flex justify="space-between" align="center" gap="xs" mr="xs">
          <Title order={4} c={store.filtersStore.patientOutcomeFiltersAppliedCount > 0 ? 'blue.6' : undefined}>Patient Outcome</Title>
          {store.filtersStore.patientOutcomeFiltersAppliedCount > 0 ? (
            <Badge color="blue" radius="sm" variant="light">
              {store.filtersStore.patientOutcomeFiltersAppliedCount}
            </Badge>
          ) : null}
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
  ));
}
