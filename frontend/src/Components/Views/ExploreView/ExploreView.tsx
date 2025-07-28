import { useState } from 'react';
import {
  Title, Card, Group, Box, Text, Stack, Flex, Button,
} from '@mantine/core';
import { IconPlus, IconArrowUpRight } from '@tabler/icons-react';
import clsx from 'clsx';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import gridItemStyles from '../GridLayoutItem.module.css';
import cardStyles from './PresetStateCard.module.css';
import { presetStateCards } from './PresetStateCards';

export function ExploreView() {
  // Hovered preset card
  const [hoveredIdx, setHoveredIdx] = useState<{ group: number; card: number } | null>(null);

  // Sizes
  const {
    cardIconSize,
    cardIconStroke,
    toolbarWidth,
    buttonIconSize,
  } = useThemeConstants();
  const verticalMargin = 'md';

  return (
    <Stack>
      {/* Title, Add Chart Button */}
      <Flex direction="row" justify="space-between" align="center">
        <Title order={3}>Patient Blood Management Dashboard</Title>
        <Button>
          <IconPlus size={buttonIconSize} stroke={cardIconStroke} style={{ marginRight: 6 }} />
          Add Chart
        </Button>
      </Flex>
      {/** Groups of preset state cards */}
      {presetStateCards.map(({ groupLabel, options }, groupIdx) => (
        <Box key={groupLabel}>
          {/** Preset state group label */}
          <Text
            mb={verticalMargin}
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
                style={{ height: toolbarWidth }}
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
