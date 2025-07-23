import {
  Title, Card, Group, Box, Text, Stack, ActionIcon,
} from '@mantine/core';
import {
  IconArrowUpRight,
  IconCoin,
  IconTestPipe2,
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
        { label: 'In cases with preoperative anemia, how many RBCs were transfused per surgeon?', Icon: IconTestPipe2, state: '' },
        { label: 'What were the pre-op and post-op HGB levels of cases per surgeon?', Icon: IconTestPipe2, state: '' },
      ],
    },
    {
      groupLabel: 'Outcomes',
      options: [
        { label: 'What are the outcomes of cases using antifibrinolytics?', Icon: IconTestPipe2, state: '' },
        { label: 'What are the outcomes of using cell salvage, for each anesthesiologist?', Icon: IconTestPipe2, state: '' },
      ],
    },
    {
      groupLabel: 'Cost / Savings',
      options: [
        { label: 'What are the costs and potential savings for surgical blood products?', Icon: IconCoin, state: '' },
      ],
    },
  ];
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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
        `}
      </style>
      {presetGroups.map(({ groupLabel, options }) => (
        <Box key={groupLabel}>
          <Title order={3} mb="md">{groupLabel}</Title>
          <Stack>
            {options.map(({ label, Icon }, idx) => (
              <Card
                key={label}
                radius="md"
                p="lg"
                withBorder
                className={`default-state-card ${gridItemStyles.gridItem}`}
                style={{ width: '100%', minHeight: 80, display: 'flex', alignItems: 'center' }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <Group justify="space-between" align="center" style={{ width: '100%' }}>
                  <Group align="center">
                    <Box mr="sm" style={{ display: 'flex', alignItems: 'center' }}>
                      <Icon size={24} stroke={1.5} />
                    </Box>
                    <Text size="md">{label}</Text>
                  </Group>
                  <ActionIcon variant="subtle" size="lg">
                    <IconArrowUpRight
                      size={24}
                      stroke={1.5}
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