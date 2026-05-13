import { useContext } from 'react';
import { SimpleGrid, Text } from '@mantine/core';
import { useObserver } from 'mobx-react-lite';
import { Store } from '../../../Store/Store';
import { DepartmentStatData } from '../../../Types/application';
import { getIconForVar } from '../../../Utils/icons';
import { StatCard } from '../../Shared/StatCard';

export function DepartmentStatsGrid() {
  const store = useContext(Store);

  return useObserver(() => {
    if (store.departmentStatConfigs.length === 0) return null;

    const statCards = store.departmentStatConfigs.map((statConfig) => {
      const key = `${statConfig.aggregation}_${statConfig.yAxisVar}`;
      const statData = store.departmentStatData[key] as DepartmentStatData[string] | undefined;
      const statValue = statData?.value || '-';
      const Icon = getIconForVar(statConfig.yAxisVar);

      return (
        <StatCard
          key={statConfig.statId}
          title={statConfig.title}
          value={statValue}
          icon={Icon}
          loading={statData?.value === undefined}
          onRemove={() => store.removeDepartmentStat(statConfig.statId)}
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
