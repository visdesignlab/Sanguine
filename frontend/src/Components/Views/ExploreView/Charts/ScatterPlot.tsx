// filepath: /Users/luke/Documents/Repos/VDL/Sanguine/frontend/src/Components/Views/ExploreView/Charts/ScatterPlot.tsx
import { Flex, Title, CloseButton } from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import { ScatterChart } from '@mantine/charts';
import { useContext } from 'react';
import { Store } from '../../../../Store/Store';
import { ExploreChartConfig } from '../../../../Types/application';

const dummyData = [
  {
    name: 'Group 1',
    color: 'blue',
    data: [
      { age: 25, BMI: 21 },
      { age: 30, BMI: 24 },
      { age: 35, BMI: 27 },
      { age: 40, BMI: 26 },
      { age: 45, BMI: 29 },
    ],
  },
  {
    name: 'Group 2',
    color: 'teal',
    data: [
      { age: 22, BMI: 23 },
      { age: 28, BMI: 22 },
      { age: 33, BMI: 25 },
      { age: 38, BMI: 28 },
      { age: 44, BMI: 30 },
    ],
  },
];

export function ScatterPlot({ chartConfig }: { chartConfig: ExploreChartConfig }) {
  const store = useContext(Store);

  return (
    <>
      <Flex direction="row" justify="space-between" align="center" pl="md">
        <Flex direction="row" align="center" gap="md" ml={-12}>
          <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
          <Title order={4}>Age vs BMI</Title>
        </Flex>
        <Flex direction="row" align="center" gap="sm">
          <CloseButton onClick={() => { store.exploreStore.removeChart(chartConfig.chartId); }} />
        </Flex>
      </Flex>
      <ScatterChart
        h={500}
        data={dummyData}
        dataKey={{ x: 'age', y: 'BMI' }}
        xAxisLabel="Age"
        yAxisLabel="BMI"
        withLegend
      />
    </>
  );
}