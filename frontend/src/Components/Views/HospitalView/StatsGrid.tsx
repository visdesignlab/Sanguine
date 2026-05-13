import { IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react';
import {
  SimpleGrid, Text, Tooltip,
} from '@mantine/core';
import { useContext, useCallback } from 'react';
import { useObserver } from 'mobx-react-lite';
import { Sparkline } from '@mantine/charts';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import { Store } from '../../../Store/Store';
import { isMetricChangeGood } from '../../../Utils/dashboard';
import { DashboardAggYAxisVar, DashboardStatData } from '../../../Types/application';
import { getIconForVar } from '../../../Utils/icons';
import { getDepartmentContextLabel } from '../../../Utils/departmentContext';
import { StatCard } from '../../Shared/StatCard';

export function StatsGrid() {
  const {
    cardIconStroke, spacingPx, positiveColor, negativeColor,
  } = useThemeConstants();

  const store = useContext(Store);

  const handleRemoveStat = useCallback((statId: string) => {
    store.removeDashboardStat(statId);
  }, [store]);

  return useObserver(() => {
    const departmentLabel = getDepartmentContextLabel(
      store.filterValues.departments,
      store.procedureHierarchy?.departments,
    );

    const statCards = store.dashboardStatConfigs.map((statConfig) => {
      const aggregationKey = statConfig.aggregation || 'sum';
      const dataKey = `${aggregationKey}_${statConfig.yAxisVar}` as keyof typeof store.dashboardStatData;
      const statData = store.dashboardStatData[dataKey] as DashboardStatData[DashboardAggYAxisVar];
      const statValue = statData?.value || '0';
      const diff = statData?.diff || 0;
      const statSparklineData = statData?.sparklineData || [];

      const Icon = getIconForVar(statConfig.yAxisVar);
      const DiffIcon = diff > 0 ? IconArrowUpRight : IconArrowDownRight;
      const statColor = isMetricChangeGood(statConfig.yAxisVar, diff)
        ? positiveColor
        : negativeColor;

      const sparkline = (
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
      );

      const comparison = (
        <>
          <DiffIcon size={spacingPx.md} stroke={cardIconStroke} color={statColor} />
          <Text size="xs" component="span" color={statColor}>
            {diff}
            %
          </Text>
          <Text size="xs" ml={2}>
            {`last 30 days vs. ${statData?.comparedTo || 'previous period'}`}
          </Text>
        </>
      );

      const card = (
        <StatCard
          key={statConfig.statId}
          title={statConfig.title}
          value={statValue}
          icon={Icon}
          loading={statData?.value === undefined}
          onRemove={() => handleRemoveStat(statConfig.statId)}
          sparkline={sparkline}
          comparison={comparison}
        />
      );

      if (departmentLabel) {
        return (
          <Tooltip key={statConfig.statId} label={departmentLabel} position="bottom" withArrow openDelay={400}>
            {card}
          </Tooltip>
        );
      }

      return card;
    });

    return (
      // TODO: Breakpoints should be the same for the entire dashboard
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>{statCards}</SimpleGrid>
    );
  });
}
