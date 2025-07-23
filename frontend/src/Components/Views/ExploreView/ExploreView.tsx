import {
  Title, Card, Group, Box, Text, Stack, ActionIcon,
} from '@mantine/core';
import {
  IconArrowUpRight,
  IconCoin,
  IconTestPipe2,
  IconDropletHalf2Filled,
  IconVaccineBottle,
  IconRecycle,
} from '@tabler/icons-react';
import { useState } from 'react';
import gridItemStyles from '../GridLayoutItem.module.css';

export function ExploreView() {
  const presetGroups: {
    groupLabel: string;
    options: { label: string; Icon: React.FC; state: any }[];
  }[] = [
    {
      groupLabel: 'Guideline Adherence',
      options: [
        { label: 'In cases with preoperative anemia, how many RBCs were transfused per surgeon?', Icon: IconDropletHalf2Filled, state: '' },
        { label: 'What were the pre-op and post-op HGB levels of cases per surgeon?', Icon: IconTestPipe2, state: '' },
      ],
    },
    {
      groupLabel: 'Outcomes',
      options: [
        { label: 'What are the outcomes of cases using antifibrinolytics?', Icon: IconVaccineBottle, state: '' },
        { label: 'What are the outcomes of using cell salvage, for each anesthesiologist?', Icon: IconRecycle, state: '' },
      ],
    },
    {
      groupLabel: 'Cost / Savings',
      options: [
        { label: 'What are the costs and potential savings for surgical blood products?', Icon: IconCoin, state: '' },
      ],
    },
  ];
  const [hoveredIdx, setHoveredIdx] = useState<{ group: number; card: number } | null>(null);

  const iconSize = 20;
  return (
    <Stack>
      <style>
        {`
          .default-state-card {
            cursor: pointer;
          }
          .default-state-card .explore-arrow {
            transition: transform 0.1s, color 0.2s;
            color: var(--mantine-color-dimmed);
          }
          .default-state-card:hover .explore-arrow {
            transform: translateY(-8px);
            color: var(--mantine-color-blue-6);
          }
          .default-state-card .explore-label {
            color: var(--mantine-color-dimmed);
            transition: color 0.2s;
          }
          .default-state-card:hover .explore-label {
            color: var(--mantine-color-black);
          }
          .default-state-card .explore-icon {
            color: light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-3));
            transition: color 0.2s;
          }
          .default-state-card:hover .explore-icon {
            color: var(--mantine-color-blue-6);
          }
          .title {
            font-weight: 700;
            text-transform: uppercase;
            color: var(--mantine-color-dimmed);
            transition: color 0.2s;
          }
          .title.active {
            color: var(--mantine-color-black);
          }
        `}
      </style>

      <Title order={3} mb="md">Explore</Title>
      {presetGroups.map(({ groupLabel, options }, groupIdx) => (
        <Box key={groupLabel}>
          <Text
            size="xs"
            mb="md"
            className={`title${hoveredIdx && hoveredIdx.group === groupIdx ? ' active' : ''}`}
          >
            {groupLabel}
          </Text>
          <Stack>
            {options.map(({ label, Icon }, cardIdx) => (
              <Card
                key={label}
                radius="md"
                p="lg"
                withBorder
                className={`default-state-card ${gridItemStyles.gridItem}`}
                style={{
                  width: '100%', minHeight: 80, display: 'flex', alignItems: 'center',
                }}
                onMouseEnter={() => setHoveredIdx({ group: groupIdx, card: cardIdx })}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <Group justify="space-between" align="center" style={{ width: '100%' }}>
                  <Group align="center">
                    <Box mr="sm" style={{ display: 'flex', alignItems: 'center' }}>
                      <Icon size={iconSize} stroke={1.5} className="explore-icon" />
                    </Box>
                    <Text size="sm" className="explore-label" style={{ fontStyle: 'italic' }}>{label}</Text>
                  </Group>
                  <ActionIcon variant="subtle" className="icon" size="lg">
                    <IconArrowUpRight
                      size={iconSize}
                      className="explore-arrow"
                    />
                  </ActionIcon>
                </Group>
              </Card>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}