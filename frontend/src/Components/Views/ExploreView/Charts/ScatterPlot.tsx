// ...existing code...
import { Flex, Title, CloseButton } from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import { ScatterChart } from '@mantine/charts';
import { useContext, useMemo } from 'react';
import { Store } from '../../../../Store/Store';
import { ScatterPlotConfig, ScatterPlotData } from '../../../../Types/application';

export function ScatterPlot({ chartConfig }: { chartConfig: ScatterPlotConfig }) {
  const store = useContext(Store);

  const dataKeyString = useMemo(
    () => `${chartConfig.aggregation}_${chartConfig.yAxisVar}_${chartConfig.xAxisVar}`,
    [chartConfig.aggregation, chartConfig.yAxisVar, chartConfig.xAxisVar],
  );

  const data = store.exploreChartData[dataKeyString] as ScatterPlotData || [];

  return (
    <>
      <Flex direction="row" justify="space-between" align="center" pl="md">
        <Flex direction="row" align="center" gap="md" ml={-12}>
          <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
          <Title order={4}>
            {`${chartConfig.yAxisVar} over ${chartConfig.xAxisVar}`}
          </Title>
        </Flex>
        <Flex direction="row" align="center" gap="sm">
          <CloseButton onClick={() => { store.removeExploreChart(chartConfig.chartId); }} />
        </Flex>
      </Flex>
      <ScatterChart
        h={500}
        data={data}
        dataKey={{ x: chartConfig.xAxisVar, y: chartConfig.yAxisVar }}
        xAxisLabel={chartConfig.xAxisVar}
        yAxisLabel={chartConfig.yAxisVar}
        withLegend
      />
    </>
  );
}
