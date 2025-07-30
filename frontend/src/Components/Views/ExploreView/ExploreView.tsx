import React, { useState } from 'react';
import {
  Title, Card, Group, Box, Text, Stack, Flex, Button, ActionIcon, useMantineTheme,
  CloseButton,
} from '@mantine/core';
import {
  IconPlus, IconArrowUpRight, IconGripVertical, IconPercentage, IconSortAscending, IconSortDescending,
} from '@tabler/icons-react';
import clsx from 'clsx';
import { BarChart } from '@mantine/charts';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import gridItemStyles from '../GridLayoutItem.module.css';
import cardStyles from './PresetStateCard.module.css';
import { presetStateCards } from './PresetStateCards';

export function ExploreView() {
  // Hovered preset card
  const [hoveredIdx, setHoveredIdx] = useState<{ group: number; card: number } | null>(null);
  // State to show chart view
  const [showCostChart, setShowCostChart] = useState(false);
  // State for cost chart mode: true = average, false = total
  const [isAverage, setIsAverage] = useState(true);
  const [isSortActive, setSortActive] = useState(false);
  const [sortDescending, setSortDescending] = useState(true);

  const theme = useMantineTheme();
  // Sizes
  const {
    cardIconSize,
    cardIconStroke,
    toolbarWidth,
    buttonIconSize,
  } = useThemeConstants();
  const verticalMargin = 'md';

  const casesPerSurgeon: Record<string, number> = {
    'Dr. Smith': 12,
    'Dr. Lee': 8,
    'Dr. Patel': 15,
    'Dr. Jones': 7,
    'Dr. Kim': 10,
    'Dr. Garcia': 11,
    'Dr. Brown': 9,
    'Dr. Wilson': 13,
  };

  const chartDataAverage = [
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

  // "Total" is average * number of cases for each surgeon
  const chartDataTotal = chartDataAverage.map((row) => {
    const cases = casesPerSurgeon[row.surgeon] ?? 10;
    return {
      ...row,
      prbc: row.prbc * cases,
      ffp: row.ffp * cases,
      plt: row.plt * cases,
      cryo: row.cryo * cases,
      cell_saver: row.cell_saver * cases,
    };
  });

  const chartSeries = [
    { name: 'prbc', label: 'PRBC', color: 'red.6' },
    { name: 'ffp', label: 'FFP', color: 'blue.6' },
    { name: 'plt', label: 'Platelets', color: 'grape.6' },
    { name: 'cryo', label: 'Cryo', color: 'teal.6' },
    { name: 'cell_saver', label: 'Cell Saver', color: 'yellow.6' },
  ];

  const getSortedData = () => {
    const data = isAverage ? chartDataAverage : chartDataTotal;
    if (!isSortActive) return data;
    // Sort by total cost (sum of all products)
    const sorted = [...data].sort((a, b) => {
      const sumA = chartSeries.reduce((acc, s) => acc + (a[s.name as keyof typeof a] as number ?? 0), 0);
      const sumB = chartSeries.reduce((acc, s) => acc + (b[s.name as keyof typeof b] as number ?? 0), 0);
      return sortDescending ? sumB - sumA : sumA - sumB;
    });
    return sorted;
  };

  // Handler for clicking a preset card
  const handlePresetClick = (groupIdx: number, cardIdx: number) => {
    // Only show chart for Cost / Savings group (last group, first/only card)
    const isCost = presetStateCards[groupIdx].groupLabel === 'Cost / Savings' && cardIdx === 0;
    if (isCost) setShowCostChart(true);
  };

  return (
    <Stack>
      {/* Title, Add Chart Button */}
      <Flex direction="row" justify="space-between" align="center">
        <Title order={3}>Patient Blood Management Dashboard</Title>
        <Button>
          <IconPlus size={buttonIconSize} stroke={cardIconStroke} style={{ marginRight: 6 }} />
          Add Chart
        </Button>
      </Flex>

      {/* Show chart if cost/savings selected, else show preset cards */}
      {showCostChart ? (
        <Card
          withBorder
          className={gridItemStyles.gridItem}
        >
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
              <ActionIcon
                variant="subtle"
                color={isAverage ? theme.colors.indigo[6] : theme.colors.gray[6]}
                onClick={() => setIsAverage((v) => !v)}
                aria-pressed={isAverage}
                title={isAverage ? 'Show total cost/savings per case' : 'Show average cost/savings per case'}
              >
                <IconPercentage size={18} />
              </ActionIcon>
              <CloseButton onClick={() => { setShowCostChart(false); setIsAverage(true); }} />
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
            yAxisLabel="Surgeon"
            xAxisLabel="Cost ($)"
            series={chartSeries}
            withBarValueLabel
            gridAxis="none"
            tickLine="y"
            yAxisProps={{
              width: 100,
              tickMargin: -6,
            }}
          />
        </Card>
      ) : (
        presetStateCards.map(({ groupLabel, options }, groupIdx) => (
          <Box key={groupLabel}>
            {/* Preset state group label */}
            <Text
              mb={verticalMargin}
              className={clsx(
                gridItemStyles.variableTitle,
                hoveredIdx && hoveredIdx.group === groupIdx && gridItemStyles.active,
              )}
            >
              {groupLabel}
            </Text>
            {/* Preset state, for each option in group */}
            <Stack>
              {options.map(({ question, Icon }, cardIdx) => (
                <Card
                  key={question}
                  withBorder
                  style={{ height: toolbarWidth, cursor: 'pointer' }}
                  className={clsx(cardStyles.presetStateCard, gridItemStyles.gridItem)}
                  onMouseEnter={() => setHoveredIdx({ group: groupIdx, card: cardIdx })}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => handlePresetClick(groupIdx, cardIdx)}
                >
                  <Group className={cardStyles.presetStateContent}>
                    <Group className={cardStyles.question}>
                      {/* Preset state icon */}
                      <Box className={cardStyles.iconContainer}>
                        <Icon size={cardIconSize} stroke={cardIconStroke} />
                      </Box>
                      {/* Preset state question */}
                      <Text size="sm">{question}</Text>
                    </Group>
                    {/* Arrow Icon */}
                    <IconArrowUpRight
                      size={cardIconSize}
                      stroke={cardIconStroke}
                      className={`${cardStyles.arrow}`}
                    />
                  </Group>
                </Card>
              ))}
            </Stack>
          </Box>
        ))
      )}
    </Stack>
  );
}
