import { useState } from 'react';
import {
  Title, Card, Group, Box, Text, Stack, useMantineTheme,
} from '@mantine/core';
import {
  IconArrowUpRight, IconCoin, IconTestPipe2, IconDropletHalf2Filled, IconVaccineBottle, IconRecycle,
} from '@tabler/icons-react';
import clsx from 'clsx';
import gridItemStyles from '../GridLayoutItem.module.css';
import presetState from './PresetStateCard.module.css';

export function ExploreView() {
  // Hovered preset card
  const [hoveredIdx, setHoveredIdx] = useState<{ group: number; card: number } | null>(null);

  // Icon styles
  const theme = useMantineTheme();
  const cardIconSize = theme.other.iconSizes.card;
  const cardIconStroke = theme.other.iconStroke.card;

  // Preset groups and options for the Explore view
  const presetGroups: {
    groupLabel: string;
    options: { question: string; Icon: React.FC; state: any }[];
  }[] = [
    {
      groupLabel: 'Guideline Adherence',
      options: [
        { question: 'In cases with preoperative anemia, how many RBCs were transfused per surgeon?', Icon: IconDropletHalf2Filled, state: '' },
        { question: 'What were the pre-op and post-op HGB levels of cases per surgeon?', Icon: IconTestPipe2, state: '' },
      ],
    },
    {
      groupLabel: 'Outcomes',
      options: [
        { question: 'What are the outcomes of cases using antifibrinolytics?', Icon: IconVaccineBottle, state: '' },
        { question: 'What are the outcomes of using cell salvage, for each anesthesiologist?', Icon: IconRecycle, state: '' },
      ],
    },
    {
      groupLabel: 'Cost / Savings',
      options: [
        { question: 'What are the costs and potential savings for surgical blood products?', Icon: IconCoin, state: '' },
      ],
    },
  ];

  return (
    <Stack>
      {/** Page Title */}
      <Title order={3} mb="md">Explore</Title>
      {/** Groups of preset states */}
      {presetGroups.map(({ groupLabel, options }, groupIdx) => (
        <Box key={groupLabel}>
          {/** Preset state group label */}
          <Text
            size="xs"
            mb="md"
            className={clsx(
              presetState.groupTitle,
              hoveredIdx && hoveredIdx.group === groupIdx && presetState.active,
            )}
          >
            {groupLabel}
          </Text>
          {/** Preset state, for each option in group */}
          <Stack>
            {options.map(({ question, Icon }, cardIdx) => (
              <Card
                key={question}
                withBorder
                className={clsx(presetState.presetStateCard, gridItemStyles.gridItem)}
                onMouseEnter={() => setHoveredIdx({ group: groupIdx, card: cardIdx })}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <Group className={presetState.presetStateContent}>
                  <Group className={presetState.question}>
                    {/** Preset state icon */}
                    <Box className={presetState.iconContainer}>
                      <Icon size={cardIconSize} stroke={cardIconStroke} />
                    </Box>
                    {/** Preset state question */}
                    <Text size="sm">{question}</Text>
                  </Group>
                  {/** Arrow Icon */}
                  <IconArrowUpRight
                    size={cardIconSize}
                    stroke={cardIconStroke}
                    className={`${presetState.arrow}`}
                  />
                </Group>
              </Card>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
