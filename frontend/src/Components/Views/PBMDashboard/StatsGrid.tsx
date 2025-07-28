import {
  IconArrowDownRight,
  IconArrowUpRight,
} from '@tabler/icons-react';
import {
  Group, Paper, SimpleGrid, Text,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import clsx from 'clsx';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import gridItemStyles from '../GridLayoutItem.module.css';
import statsGridStyles from './StatsGrid.module.css';
import { icons, stats } from './stats';

export function StatsGrid() {
  // Icon styles
  const { cardIconSize, cardIconStroke, spacingPx } = useThemeConstants();

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

        <Group align="flex-end" gap="sm" mt="md">
          {/** Stat Value */}
          <Title order={1}>{stat.value}</Title>
          {/** Stat % Change in Value */}
          <Text
            className={clsx(
              statsGridStyles.diff,
              stat.diff > 0 ? statsGridStyles.diffPositive : statsGridStyles.diffNegative,
            )}
          >
            <span>
              {stat.diff}
              %
            </span>
            <DiffIcon size={spacingPx.sm} stroke={cardIconStroke} />
          </Text>
        </Group>
        {/** Comparison Text */}
        <Text fz="xs" c="dimmed" mt="xs">
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
