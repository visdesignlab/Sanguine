import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCoin,
  IconTestPipe2,
  IconShieldHeart,
} from '@tabler/icons-react';
import {
  Group, Paper, SimpleGrid, Text,
} from '@mantine/core';
import gridItemStyles from '../GridLayoutItem.module.css';
import statsGridStyles from './StatsGrid.module.css';

const icons = {
  coin: IconCoin,
  tube: IconTestPipe2,
  shield: IconShieldHeart,
};

const data = [
  {
    title: 'Estimated Savings', icon: 'coin', value: '$13,456', diff: 34,
  },
  {
    title: 'Guideline Adherence', icon: 'tube', value: '85%', diff: 18,
  },
  {
    title: 'AVG Length of Stay', icon: 'shield', value: '10 days', diff: -30,
  },
] as const;

export function StatsGrid() {
  const stats = data.map((stat) => {
    const Icon = icons[stat.icon];
    const DiffIcon = stat.diff > 0 ? IconArrowUpRight : IconArrowDownRight;

    return (
      <Paper withBorder p="md" radius="md" key={stat.title} className={gridItemStyles.gridItem}>
        <Group justify="space-between">
          <Text size="xs" c="dimmed" className={statsGridStyles.title}>
            {stat.title}
          </Text>
          <Icon className={statsGridStyles.icon} size={22} stroke={1.5} />
        </Group>

        <Group align="flex-end" gap="xs" mt={25}>
          <Text className={statsGridStyles.value}>{stat.value}</Text>
          <Text c={stat.diff > 0 ? 'teal' : 'red'} fz="sm" fw={500} className={statsGridStyles.diff}>
            <span>
              {stat.diff}
              %
            </span>
            <DiffIcon size={16} stroke={1.5} />
          </Text>
        </Group>

        <Text fz="xs" c="dimmed" mt={7}>
          Compared to previous month
        </Text>
      </Paper>
    );
  });
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>{stats}</SimpleGrid>
  );
}
