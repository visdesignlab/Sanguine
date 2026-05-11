import { useContext } from 'react';
import { SimpleGrid, Text } from '@mantine/core';
import { useObserver } from 'mobx-react-lite';
import { Store } from '../../../Store/Store';
import { ExploreStatData } from '../../../Types/application';
import { getIconForVar } from '../../../Utils/icons';
import { StatCard } from '../../Shared/StatCard';

export function DepartmentStatsGrid() {
  const store = useContext(Store);

  return useObserver(() => {
    if (store.exploreStatConfigs.length === 0) return null;

    const statCards = store.exploreStatConfigs.map((statConfig) => {
      const key = `${statConfig.aggregation}_${statConfig.yAxisVar}`;
      const statData = store.exploreStatData[key] as ExploreStatData[string] | undefined;
      const statValue = statData?.value || '-';
      const Icon = getIconForVar(statConfig.yAxisVar);

      return (
        <StatCard
          key={statConfig.statId}
          title={statConfig.title}
          value={statValue}
          icon={Icon}
          loading={statData?.value === undefined}
          onRemove={() => store.removeExploreStat(statConfig.statId)}
          comparison={<Text size="xs" c="dimmed">All Time</Text>}
        />
      );
    });

    return (
      <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} mb="md">
        {statCards}
      </SimpleGrid>
    );
  });
}
