import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconTrash,
} from '@tabler/icons-react';
import {
  Card,
  Flex, Group, LoadingOverlay, SimpleGrid, Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useState, useContext, useCallback } from 'react';
import { useObserver } from 'mobx-react-lite';
import { Sparkline } from '@mantine/charts';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import gridItemStyles from '../GridLayoutItem.module.css';
import statsGridStyles from './StatsGrid.module.css';
import { Store } from '../../../Store/Store';
import { isMetricChangeGood } from '../../../Utils/dashboard';
import { DashboardAggYAxisVar, DashboardStatData } from '../../../Types/application';
import { getIconForVar } from '../../../Utils/icons';
import { getDepartmentContextLabel } from '../../../Utils/departmentContext';

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
    store.removeDashboardStat(statId);
  }, [store]);

  return useObserver(() => {
    // Compute department context label for tooltips
    const departmentLabel = getDepartmentContextLabel(
      store.filterValues.departments,
      store.procedureHierarchy?.departments,
    );

    // For every stat config, create a card describing it.
    const statCards = store.dashboardStatConfigs.map((statConfig, idx) => {
      // Get the stat value from statData
      const aggregationKey = statConfig.aggregation || 'sum';
      const dataKey = `${aggregationKey}_${statConfig.yAxisVar}` as keyof typeof store.dashboardStatData;
      // Stat data for this card
      const statData = store.dashboardStatData[dataKey] as DashboardStatData[DashboardAggYAxisVar];
      const statValue = statData?.value || '0';
      const diff = statData?.diff || 0;
      const statSparklineData = statData?.sparklineData || [];

      // Get the icon for this stat
      const Icon = getIconForVar(statConfig.yAxisVar);

      // Get the value diff icon
      const DiffIcon = diff > 0 ? IconArrowUpRight : IconArrowDownRight;

      // Positive (green) or negative (red) color based on diff
      const statColor = isMetricChangeGood(statConfig.yAxisVar, diff)
        ? positiveColor
        : negativeColor;

      // Determine if this card is currently hovered
      const isHovered = hoveredIdx === idx;
      const CardIcon = isHovered ? IconTrash : Icon;

      const statCard = (
        <Card
          key={statConfig.statId}
          className={`${gridItemStyles.gridItem} ${isHovered ? gridItemStyles.gridItemHovered : ''}`.trim()}
          onMouseEnter={() => setHoveredIdx(idx)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <LoadingOverlay visible={statData?.value === undefined} zIndex={1} overlayProps={{ radius: 'sm', blur: 2 }} />
          <Group justify="space-between" align="center">
            {/** Stat Title */}
            <Text
              className={`${gridItemStyles.variableTitle} ${isHovered ? gridItemStyles.active : ''}`.trim()}
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: 'left',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={statConfig.title}
            >
              {statConfig.title}
            </Text>
            <Group gap={4} align="center" style={{ justifyContent: 'flex-end' }}>
              {/** Stat Icon */}
              <CardIcon
                className={`${statsGridStyles.icon} ${isHovered ? statsGridStyles.deleteIcon : ''}`.trim()}
                size={cardIconSize}
                stroke={cardIconStroke}
                onClick={isHovered ? () => handleRemoveStat(statConfig.statId) : undefined}
                style={{
                  cursor: isHovered ? 'pointer' : 'default',
                }}
              />
            </Group>
          </Group>
          <Flex align="center" gap={8} mt="sm" className={statsGridStyles.valueRow}>
            {/** Stat Value */}
            <Title
              order={2}
              className={statsGridStyles.metricValue}
            >
              {statValue}
            </Title>
            {/** Stat Sparkline */}
            <div className={statsGridStyles.sparklineWrap}>
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
            </div>
          </Flex>
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
              className={`${statsGridStyles.comparisonText} ${isHovered ? statsGridStyles.comparisonTextHovered : ''}`.trim()}
            >
              {`last 30 days vs. ${statData?.comparedTo || 'previous period'}`}
            </Text>
          </Group>
        </Card>
      );

      // Wrap in a Tooltip if departments are filtered
      if (departmentLabel) {
        return (
          <Tooltip key={statConfig.statId} label={departmentLabel} position="bottom" withArrow openDelay={400}>
            {statCard}
          </Tooltip>
        );
      }

      return statCard;
    });

    return (
      // TODO: Breakpoints should be the same for the entire dashboard
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>{statCards}</SimpleGrid>
    );
  });
}
