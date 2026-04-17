import { useContext, useState } from 'react';
import {
  Card, CloseButton, Group, SimpleGrid, Text, Title,
} from '@mantine/core';
import { useObserver } from 'mobx-react-lite';
import gridItemStyles from '../GridLayoutItem.module.css';
import { Store } from '../../../Store/Store';
import { ExploreStatData } from '../../../Types/application';
import { getIconForVar } from '../../../Utils/icons';
import { useThemeConstants } from '../../../Theme/mantineTheme';

export function DepartmentStatsGrid() {
  const store = useContext(Store);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const { cardIconSize, cardIconStroke } = useThemeConstants();

  const handleRemove = (statId: string) => {
    store.removeExploreStat(statId);
  };

  return useObserver(() => {
    if (store.exploreStatConfigs.length === 0) return null;

    const statCards = store.exploreStatConfigs.map((statConfig, idx) => {
      const key = `${statConfig.aggregation}_${statConfig.yAxisVar}`;
      const statData = store.exploreStatData[key] as ExploreStatData[string] | undefined;
      const statValue = statData?.value || '-';
      const isHovered = hoveredIdx === idx;
      const Icon = getIconForVar(statConfig.yAxisVar);

      return (
        <Card
          key={statConfig.statId}
          withBorder
          p="sm"
          className={`${gridItemStyles.gridItem} ${isHovered ? gridItemStyles.gridItemHovered : ''}`.trim()}
          onMouseEnter={() => setHoveredIdx(idx)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
              <Icon size={cardIconSize} stroke={cardIconStroke} style={{ flexShrink: 0, color: 'var(--mantine-color-gray-5)' }} />
              <div style={{ minWidth: 0 }}>
                <Text
                  className={`${gridItemStyles.variableTitle} ${isHovered ? gridItemStyles.active : ''}`.trim()}
                  lineClamp={1}
                >
                  {statConfig.title}
                </Text>
                <Group gap={6} align="baseline" mt={2}>
                  <Title order={4}>{statValue}</Title>
                  <Text size="xs" c="dimmed">All Time</Text>
                </Group>
              </div>
            </Group>
            {isHovered && (
              <CloseButton size="xs" onClick={() => handleRemove(statConfig.statId)} />
            )}
          </Group>
        </Card>
      );
    });

    return (
      <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} mb="md">
        {statCards}
      </SimpleGrid>
    );
  });
}
