import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCoin,
  IconTestPipe2,
  IconShieldHeart,
} from '@tabler/icons-react';
import {
  Group, Paper, SimpleGrid, Text, useMantineTheme,
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
  // Icon size
  const theme = useMantineTheme();
  const cardIconSize = theme.other.iconSizes.card;
  const cardIconStroke = theme.other.iconStroke.card;

  // For every stat, create a card describing it.
  const stats = data.map((stat) => {
    const Icon = icons[stat.icon];
    // Positive or negative change in value
    const DiffIcon = stat.diff > 0 ? IconArrowUpRight : IconArrowDownRight;

    return (
      <Paper withBorder p="md" radius="md" key={stat.title} className={gridItemStyles.gridItem}>
        {/** Stat Text */}
        <Group justify="space-between">
          <Text c="dimmed" className={statsGridStyles.title}>
            {stat.title}
          </Text>
          <Icon className={statsGridStyles.icon} size={cardIconSize} stroke={cardIconStroke} />
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
    <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>{stats}</SimpleGrid>
  );
}
