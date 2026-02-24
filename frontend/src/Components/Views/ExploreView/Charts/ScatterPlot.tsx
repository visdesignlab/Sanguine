import { useContext, useRef } from 'react';
import { Title, Box, Flex, CloseButton } from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import { useObserver } from 'mobx-react-lite';
import { Store } from '../../../../Store/Store';
import { ScatterPlotConfig } from '../../../../Types/application';

interface ScatterPlotProps {
  chartConfig: ScatterPlotConfig;
}

export function ScatterPlot({ chartConfig }: ScatterPlotProps) {
  const store = useContext(Store);
  const ref = useRef<HTMLDivElement>(null);

  return useObserver(() => (
    <Box h="100%" display="flex" style={{ flexDirection: 'column' }}>
      {/* Header */}
      <Flex direction="row" justify="space-between" align="center" pl="md" pr="md" pt="xs">
        <Flex direction="row" align="center" gap="md" ml={-12}>
          <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
          <Title order={4}>Scatter Plot</Title>
        </Flex>
        <Flex direction="row" align="center" gap="xs">
          <CloseButton onClick={() => store.removeExploreChart(chartConfig.chartId)} />
        </Flex>
      </Flex>

      {/* Chart Area */}
      <div style={{ flex: 1, minHeight: 0, width: '100%' }} ref={ref} />
    </Box>
  ));
}
