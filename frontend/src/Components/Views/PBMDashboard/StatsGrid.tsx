import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCoin, IconTestPipe2, IconShieldHeart, IconMedicineSyrup,
  IconDropletHalf2Filled,
} from '@tabler/icons-react';
import {
  Group, Paper, SimpleGrid, Text,
  Title,
} from '@mantine/core';
import { useState, useContext } from 'react';
import clsx from 'clsx';
import { useObserver } from 'mobx-react';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import gridItemStyles from '../GridLayoutItem.module.css';
import statsGridStyles from './StatsGrid.module.css';
import { Store } from '../../../Store/Store';
import {
  BLOOD_COMPONENT_OPTIONS,
  GUIDELINE_ADHERENCE_OPTIONS,
  OUTCOME_OPTIONS,
  PROPHYL_MED_OPTIONS,
  TOTAL_GUIDELINE_ADHERENCE,
  type DashboardStatConfig,
} from '../../../Types/application';

export const icons = {
  bloodComponent: IconDropletHalf2Filled,
  adherence: IconTestPipe2,
  outcome: IconShieldHeart,
  prophylMed: IconMedicineSyrup,
  costSavings: IconCoin,
};

// Choose icon based on variable name
const getIconForVar = (varName: DashboardStatConfig['var']) => {
  const bloodComponent = BLOOD_COMPONENT_OPTIONS.find((opt) => opt.value === varName);
  if (bloodComponent) return 'bloodComponent';

  const adherence = GUIDELINE_ADHERENCE_OPTIONS.find((opt) => opt.value === varName);
  if (adherence) return 'adherence';
  if (adherence || varName === TOTAL_GUIDELINE_ADHERENCE.value) return 'adherence';

  const outcome = OUTCOME_OPTIONS.find((opt) => opt.value === varName);
  if (outcome) return 'outcome';

  const prophylMed = PROPHYL_MED_OPTIONS.find((opt) => opt.value === varName);
  if (prophylMed) return 'prophylMed';

  // Default
  return 'bloodComponent';
};

export function StatsGrid() {
  // Icon styles
  const { cardIconSize, cardIconStroke, spacingPx } = useThemeConstants();

  // Get store context
  const store = useContext(Store);

  // Track hovered card index
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return useObserver(() => {
    // For every stat config, create a card describing it.
    const statCards = store.dashboardStore._statConfigs.map((statConfig, idx) => {
      // Get the stat value from statData
      const aggregationKey = statConfig.aggregation || 'sum';
      const dataKey = `${aggregationKey}_${statConfig.var}` as keyof typeof store.dashboardStore.statData;
      // Stat data for this card
      const statData = store.dashboardStore.statData[dataKey];
      const statValue = statData?.data || '0';
      const diff = statData?.diff || 0;

      // Get the icon for this stat
      const iconKey = getIconForVar(statConfig.var);
      const Icon = icons[iconKey];
      // Get the value diff icon
      const DiffIcon = diff > 0 ? IconArrowUpRight : IconArrowDownRight;
      const diffClassName = store.dashboardStore.isMetricChangeGood(statConfig.var, diff)
        ? statsGridStyles.diffGood
        : statsGridStyles.diffBad;

      // Determine if this card is currently hovered
      const isHovered = hoveredIdx === idx;

      return (
        <Paper
          key={statConfig.i}
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
              {statConfig.title}
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
            <Title order={1}>{statValue}</Title>
            {/** Stat % Change in Value */}
            <Text className={diffClassName}>
              <span>
                {diff}
                %
              </span>
              <DiffIcon size={spacingPx.sm} stroke={cardIconStroke} />
            </Text>
          </Group>
          {/** Comparison Text */}
          <Text fz="xs" c="dimmed" mt="xs">
            {`Last 30 days compared to ${statData.comparedTo || 'previous period'}`}
          </Text>
        </Paper>
      );
    });

    return (
      // TODO: Breakpoints should be the same for the entire dashboard
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>{statCards}</SimpleGrid>
    );
  });
}
