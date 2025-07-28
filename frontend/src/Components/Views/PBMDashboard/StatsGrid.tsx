import {
  IconArrowDownRight,
  IconArrowUpRight,
} from '@tabler/icons-react';
import {
  Group, Paper, SimpleGrid, Text,
} from '@mantine/core';
import { useState } from 'react';
import clsx from 'clsx';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import gridItemStyles from '../GridLayoutItem.module.css';
import statsGridStyles from './StatsGrid.module.css';
import { icons, stats } from './stats';

export function StatsGrid() {
  // Icon styles
  const { cardIconSize, cardIconStroke } = useThemeConstants();

  // Track hovered card index
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // For every stat, create a card describing it.
  const statCards = stats.map((stat, idx) => {
    const Icon = icons[stat.icon];
    // Positive or negative change in value
    const DiffIcon = stat.diff > 0 ? IconArrowUpRight : IconArrowDownRight;
    // Determine if this card is currently hovered
    const isHovered = hoveredIdx === idx;
    return (
      <Paper
        withBorder
        p="md"
        radius="md"
        key={stat.title}
        className={clsx(
          gridItemStyles.gridItem,
          isHovered && gridItemStyles.gridItemHovered,
        )}
        onMouseEnter={() => setHoveredIdx(idx)}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {/** Stat Text */}
        <Group justify="space-between">
          <Text
            className={clsx(
              gridItemStyles.variableTitle,
              isHovered && gridItemStyles.active,
            )}
          >
            {stat.title}
          </Text>
          <Icon
            className={clsx(
              statsGridStyles.icon,
              isHovered && statsGridStyles.iconHovered,
            )}
            size={cardIconSize}
            stroke={cardIconStroke}
          />
        </Group>

        <Group align="flex-end" gap="xs" mt={25}>
          {/** Stat Value */}
          <Text className={statsGridStyles.value}>{stat.value}</Text>
          {/** Stat % Change in Value */}
          <Text c={stat.diff > 0 ? 'teal' : 'red'} fz="sm" fw={500} className={statsGridStyles.diff}>
            <span>
              {stat.diff}
              %
            </span>
            <DiffIcon size={16} stroke={cardIconStroke} />
          </Text>
        </Group>
        {/** Comparison Text */}
        <Text fz="xs" c="dimmed" mt={7}>
          Compared to previous month
        </Text>
      </Paper>
    );
  });
  return (
    // TODO: Breakpoints should be the same for the entire dashboard
    <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>{statCards}</SimpleGrid>
  );
}
