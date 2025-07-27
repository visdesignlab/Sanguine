import { useState } from 'react';
import {
  Title, Card, Group, Box, Text, Stack, useMantineTheme,
} from '@mantine/core';
import { IconArrowUpRight } from '@tabler/icons-react';
import clsx from 'clsx';
import gridItemStyles from '../GridLayoutItem.module.css';
import cardStyles from './PresetStateCard.module.css';
import { presetStateCards } from './PresetStateCards';

export function ExploreView() {
  // Hovered preset card
  const [hoveredIdx, setHoveredIdx] = useState<{ group: number; card: number } | null>(null);

  // Icon styles
  const theme = useMantineTheme();
  const cardIconSize = theme.other.iconSizes.card;
  const cardIconStroke = theme.other.iconStroke.card;

  return (
    <Stack>
      {/** Page Title */}
      <Title order={3} mb="md">Explore</Title>
      {/** Groups of preset state cards */}
      {presetStateCards.map(({ groupLabel, options }, groupIdx) => (
        <Box key={groupLabel}>
          {/** Preset state group label */}
          <Text
            mb="md"
            className={clsx(
              gridItemStyles.variableTitle,
              hoveredIdx && hoveredIdx.group === groupIdx && gridItemStyles.active,
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
                className={clsx(cardStyles.presetStateCard, gridItemStyles.gridItem)}
                onMouseEnter={() => setHoveredIdx({ group: groupIdx, card: cardIdx })}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <Group className={cardStyles.presetStateContent}>
                  <Group className={cardStyles.question}>
                    {/** Preset state icon */}
                    <Box className={cardStyles.iconContainer}>
                      <Icon size={cardIconSize} stroke={cardIconStroke} />
                    </Box>
                    {/** Preset state question */}
                    <Text size="sm">{question}</Text>
                  </Group>
                  {/** Arrow Icon */}
                  <IconArrowUpRight
                    size={cardIconSize}
                    stroke={cardIconStroke}
                    className={`${cardStyles.arrow}`}
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
