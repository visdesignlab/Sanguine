import {
  Flex, Title, ActionIcon, CloseButton, useMantineTheme,
} from '@mantine/core';
import {
  IconGripVertical, IconSortDescending, IconSortAscending,
} from '@tabler/icons-react';
import { BarChart } from '@mantine/charts';
import { useContext, useMemo, useState } from 'react';
import { chartColors, COST_OPTIONS, CostBarData, CostChartConfig, costXAxisOptions, costYAxisOptions } from '../../../../Types/application';
import { Store } from '../../../../Store/Store';

const costSeries = COST_OPTIONS.map((c, idx) => ({
  name: c.value,
  label: c.label.base,
  color: chartColors[idx % chartColors.length],
}));

type CostSeriesKey = typeof costSeries[number]['name'];

export function CostChart({ chartConfig }: { chartConfig: CostChartConfig }) {
  const store = useContext(Store);
  const theme = useMantineTheme();

  const [isSortActive, setSortActive] = useState(false);
  const [sortDescending, setSortDescending] = useState(true);
  const isAverage = chartConfig.aggregation === 'avg';

  // Find data for chart {aggregation}_{yAxisVar}_{xAxisVar}
  const dataKeyString = useMemo(
    () => `${chartConfig.aggregation}_${chartConfig.yAxisVar}_${chartConfig.xAxisVar}`,
    [chartConfig.aggregation, chartConfig.yAxisVar, chartConfig.xAxisVar],
  );

  const rawData = store.exploreStore.chartData[dataKeyString] as CostBarData || [];

  // Sort data if needed
  const sortedData = useMemo(() => {
    if (!isSortActive) return rawData;
    const clone = [...rawData];
    clone.sort((a, b) => {
      const totalA = costSeries.reduce(
        (sum, s) => sum + (typeof a[s.name] === 'number' ? (a[s.name] as number) : 0),
        0,
      );
      const totalB = costSeries.reduce(
        (sum, s) => sum + (typeof b[s.name] === 'number' ? (b[s.name] as number) : 0),
        0,
      );
      return sortDescending ? totalB - totalA : totalA - totalB;
    });
    return clone;
  }, [rawData, isSortActive, sortDescending]);

  const groupLabel = costYAxisOptions.find((o) => o.value === chartConfig.yAxisVar)?.label
    || chartConfig.yAxisVar;
  const xLabel = costXAxisOptions.find((o) => o.value === chartConfig.xAxisVar)?.label
    || chartConfig.xAxisVar;

  return (
    <>
      <Flex direction="row" justify="space-between" align="center" pl="md">
        <Flex direction="row" align="center" gap="md" ml={-12}>
          <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
          <Title order={4}>
            {isAverage
              ? `Average Costs per ${groupLabel}`
              : `Total Costs per ${groupLabel}`}
          </Title>
        </Flex>

        <Flex direction="row" align="center" gap="sm">
          <ActionIcon
            variant="subtle"
            color={isSortActive ? theme.colors.indigo[6] : theme.colors.gray[6]}
            onClick={() => {
              if (!isSortActive) {
                setSortActive(true);
                setSortDescending(true);
              } else if (sortDescending) {
                setSortDescending(false);
              } else {
                setSortActive(false);
                setSortDescending(true);
              }
            }}
            title="Toggle sort by total cost"
          >
            {sortDescending ? <IconSortDescending size={18} /> : <IconSortAscending size={18} />}
          </ActionIcon>
          <CloseButton onClick={() => { store.exploreStore.removeChart(chartConfig.chartId); }} />
        </Flex>
      </Flex>
      <BarChart
        h={500}
        data={sortedData}
        dataKey={chartConfig.yAxisVar}
        type="stacked"
        orientation="vertical"
        textColor="gray.9"
        withLegend
        yAxisLabel={groupLabel}
        xAxisLabel={xLabel}
        series={costSeries.map((s) => ({
          name: s.name as CostSeriesKey,
          label: s.label,
          color: s.color,
        }))}
        withBarValueLabel
        gridAxis="none"
        tickLine="y"
        yAxisProps={{
          width: 100,
          tickMargin: -6,
        }}
      />
    </>
  );
}
