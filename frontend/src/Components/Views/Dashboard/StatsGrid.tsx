import {
  IconArrowDownRight,
  IconArrowUpRight,
} from '@tabler/icons-react';
import {
  CloseButton,
  Group, Paper, SimpleGrid, Text,
  Title,
} from '@mantine/core';
import { useState, useContext, useCallback } from 'react';
import clsx from 'clsx';
import { useObserver } from 'mobx-react';
import { Sparkline } from '@mantine/charts';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import gridItemStyles from '../GridLayoutItem.module.css';
import statsGridStyles from './StatsGrid.module.css';
import { Store } from '../../../Store/Store';
import { getIconForVar, isMetricChangeGood } from '../../../Utils/dashboard';
import { DashboardAggYAxisVar, DashboardStatData } from '../../../Types/application';

export function StatsGrid() {
  // Icon styles
  const {
    cardIconSize, cardIconStroke, spacingPx, positiveColor, negativeColor,
  } = useThemeConstants();

  // Get store context
  const store = useContext(Store);

  // Track hovered card index
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Remove stat handler
  const handleRemoveStat = useCallback((statId: string) => {
    store.dashboardStore.removeStat(statId);
  }, [store.dashboardStore]);

  return useObserver(() => {
    // For every stat config, create a card describing it.
    const statCards = store.dashboardStore._statConfigs.map((statConfig, idx) => {
      // Get the stat value from statData
      const aggregationKey = statConfig.aggregation || 'sum';
      const dataKey = `${aggregationKey}_${statConfig.var}` as keyof typeof store.dashboardStore.statData;
      // Stat data for this card
      const statData = store.dashboardStore.statData[dataKey] as DashboardStatData[DashboardAggYAxisVar];
      const statValue = statData?.value || '0';
      const diff = statData?.diff || 0;
      const statSparklineData = statData?.sparklineData || [];

      // Get the icon for this stat
      const Icon = getIconForVar(statConfig.var);

      // Get the value diff icon
      const DiffIcon = diff > 0 ? IconArrowUpRight : IconArrowDownRight;

      // Positive (green) or negative (red) color based on diff
      const statColor = isMetricChangeGood(statConfig.var, diff)
        ? positiveColor
        : negativeColor;

      // Determine if this card is currently hovered
      const isHovered = hoveredIdx === idx;

      return (
        <Paper
          key={statConfig.statId}
          className={clsx(
            gridItemStyles.gridItem,
            isHovered && gridItemStyles.gridItemHovered,
          )}
          onMouseEnter={() => setHoveredIdx(idx)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <Group justify="space-between" align="center">
            {/** Stat Title */}
            <Text
              className={clsx(
                gridItemStyles.variableTitle,
                isHovered && gridItemStyles.active,
              )}
              style={{ flex: 1, textAlign: 'left' }}
            >
              {statConfig.title}
            </Text>
            <Group gap={4} align="center" style={{ justifyContent: 'flex-end' }}>
              {/** Stat Icon */}
              <Icon
                className={clsx(
                  statsGridStyles.icon,
                  isHovered && statsGridStyles.iconHovered,
                )}
                size={cardIconSize}
                stroke={cardIconStroke}
              />
              {/** Stat Close / Delete Button */}
              {isHovered && (
              <CloseButton size="xs" onClick={() => handleRemoveStat(statConfig.statId)} />
              )}
            </Group>
          </Group>
          <Group align="center" gap={5} mt="sm">
            {/** Stat Value */}
            <Title order={2}>{statValue}</Title>
            {/** Stat Sparkline */}
            <Sparkline
              w={60}
              h={25}
              data={statSparklineData}
              curveType="linear"
              fillOpacity={0.4}
              strokeWidth={0.6}
              color={statColor}
              mb={-4}
            />
          </Group>
          {/* Comparison Text */}
          {/** Stat % Change in Value */}
          <Group align="center" mt="sm" gap={2}>
            <DiffIcon size={spacingPx.md} stroke={cardIconStroke} color={statColor} />
            <Text
              size="xs"
              component="span"
              color={statColor}
            >
              {diff}
              %
            </Text>
            {/** Comparison Text */}
            <Text
              size="xs"
              ml={2}
              className={clsx(
                statsGridStyles.comparisonText,
                isHovered && statsGridStyles.comparisonTextHovered,
              )}
            >
              {`last 30 days vs. ${statData.comparedTo || 'previous period'}`}
            </Text>
          </Group>
        </Paper>
      );
    });

    return (
      // TODO: Breakpoints should be the same for the entire dashboard
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>{statCards}</SimpleGrid>
    );
  });
}
