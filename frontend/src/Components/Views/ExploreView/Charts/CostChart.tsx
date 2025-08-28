import {
  Flex, Title, ActionIcon, CloseButton, useMantineTheme,
} from '@mantine/core';
import {
  IconGripVertical, IconSortDescending, IconSortAscending,
} from '@tabler/icons-react';
import { BarChart } from '@mantine/charts';
import { useContext, useState } from 'react';
import { CostChartConfig, costXAxisOptions, costYAxisOptions } from '../../../../Types/application';
import { Store } from '../../../../Store/Store';

function getSortedData() {
  // Get date
  return [
    {
      surgeon: 'Dr. Smith', prbc: 600, ffp: 950, plt: 900, cryo: 850, cell_saver: 800,
    },
    {
      surgeon: 'Dr. Lee', prbc: 400, ffp: 800, plt: 750, cryo: 700, cell_saver: 650,
    },
    {
      surgeon: 'Dr. Patel', prbc: 700, ffp: 1000, plt: 950, cryo: 900, cell_saver: 850,
    },
    {
      surgeon: 'Dr. Jones', prbc: 300, ffp: 700, plt: 650, cryo: 600, cell_saver: 550,
    },
    {
      surgeon: 'Dr. Kim', prbc: 500, ffp: 900, plt: 850, cryo: 800, cell_saver: 750,
    },
    {
      surgeon: 'Dr. Garcia', prbc: 650, ffp: 970, plt: 920, cryo: 870, cell_saver: 820,
    },
    {
      surgeon: 'Dr. Brown', prbc: 450, ffp: 820, plt: 770, cryo: 720, cell_saver: 670,
    },
    {
      surgeon: 'Dr. Wilson', prbc: 680, ffp: 990, plt: 940, cryo: 890, cell_saver: 840,
    },
  ];
}

export function CostChart({ chartConfig }: { chartConfig: CostChartConfig }) {
  const store = useContext(Store);
  const theme = useMantineTheme();

  const [isSortActive, setSortActive] = useState(false);
  const [sortDescending, setSortDescending] = useState(true);
  const isAverage = chartConfig.aggregation === 'avg';

  return (
    <>
      <Flex direction="row" justify="space-between" align="center" pl="md">
        <Flex direction="row" align="center" gap="md" ml={-12}>
          <IconGripVertical size={18} className="move-icon" style={{ cursor: 'move' }} />
          <Title order={4}>
            {isAverage ? 'Average Cost / Savings Per Case' : 'Total Cost / Savings'}
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
            aria-pressed={isAverage}
            title={isAverage ? 'Show total cost/savings per case' : 'Show average cost/savings per case'}
          >
            {sortDescending ? <IconSortDescending size={18} /> : <IconSortAscending size={18} />}
          </ActionIcon>
          {/* <ActionIcon
            variant="subtle"
            color={isAverage ? theme.colors.indigo[6] : theme.colors.gray[6]}
            onClick={() => setIsAverage((v) => !v)}
            aria-pressed={isAverage}
            title={isAverage ? 'Show total cost/savings per case' : 'Show average cost/savings per case'}
          >
            <IconPercentage size={18} />
          </ActionIcon> */}
          <CloseButton onClick={() => { store.exploreStore.removeChart(chartConfig.chartId); }} />
        </Flex>
      </Flex>
      <BarChart
        h={500}
        data={getSortedData()}
        dataKey="surgeon"
        type="stacked"
        orientation="vertical"
        textColor="gray.9"
        withLegend
        yAxisLabel={costYAxisOptions.find((opt) => opt.value === chartConfig.yAxisVar)!.label}
        xAxisLabel={costXAxisOptions.find((opt) => opt.value === chartConfig.xAxisVar)!.label}
        series={[
          { name: 'prbc', label: 'PRBC', color: 'red.6' },
          { name: 'ffp', label: 'FFP', color: 'blue.6' },
          { name: 'plt', label: 'Platelets', color: 'grape.6' },
          { name: 'cryo', label: 'Cryo', color: 'teal.6' },
          { name: 'cell_saver', label: 'Cell Saver', color: 'yellow.6' },
        ]}
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
