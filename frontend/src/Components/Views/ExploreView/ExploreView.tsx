import { useContext, useMemo, useState } from 'react';
import {
  Title, Card, Group, Box, Text, Stack, Flex, Button,
  Divider,
  Tooltip,
} from '@mantine/core';
import {
  IconPlus, IconArrowUpRight,
} from '@tabler/icons-react';
import clsx from 'clsx';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { useObserver } from 'mobx-react';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import cardStyles from './PresetStateCard.module.css';
import { presetStateCards } from './PresetStateCards';
import { Store } from '../../../Store/Store';
import classes from '../GridLayoutItem.module.css';
import { ExploreChartConfig } from '../../../Types/application';
import { CostChart } from './Charts/CostChart';

function renderChart(chartConfig: ExploreChartConfig) {
  switch (chartConfig.chartType) {
    case 'cost':
      return <CostChart chartConfig={chartConfig} />;
    default:
      return null;
  }
}

export function ExploreView() {
  const store = useContext(Store);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive) as any, []);

  // Hovered preset card
  const [hoveredIdx, setHoveredIdx] = useState<{ group: number; card: number } | null>(null);

  const verticalMargin = 'md';

  // const theme = useMantineTheme();
  // Sizes
  const {
    cardIconSize,
    cardIconStroke,
    toolbarWidth,
    buttonIconSize,
  } = useThemeConstants();

  // Handler for clicking a preset card
  const handlePresetClick = (groupIdx: number, cardIdx: number) => {
    const { chartConfigs, chartLayouts } = presetStateCards[groupIdx].options[cardIdx];
    // Add chart config to store
    store.exploreStore.chartConfigs = [...chartConfigs];
    // Add chart layout to store
    store.exploreStore.chartLayouts = {
      main: [...chartLayouts.main],
    };
  };

  return useObserver(() => (
    <Stack>
      {/* Title, Add Chart Button */}
      <Flex direction="row" justify="space-between" align="center" h={toolbarWidth / 2}>
        <Title order={3}>Explore</Title>

        <Flex direction="row" align="center" gap="md">
          <Tooltip label="Visible visits after filters" position="bottom">
            <Title order={5} c="dimmed">
              {`${store.filteredVisitsLength} / ${store.allVisitsLength}`}
              {' '}
              Visits
            </Title>
          </Tooltip>
          <Button>
            <IconPlus size={buttonIconSize} stroke={cardIconStroke} style={{ marginRight: 6 }} />
            Add Chart
          </Button>
        </Flex>
      </Flex>
      <Divider />

      {store.exploreStore.chartLayouts.main.length > 0 ? (
        <ResponsiveGridLayout
          className="layout"
          breakpoints={{
            main: 852, sm: 0,
          }}
          cols={{
            main: 2, sm: 1,
          }}
          rowHeight={300}
          containerPadding={[0, 0]}
          draggableHandle=".move-icon"
          onLayoutChange={(currentLayout: Layout[], newLayouts: Record<string, Layout[]>) => {
            store.exploreStore.chartLayouts = newLayouts;
          }}
          layouts={store.exploreStore.chartLayouts}
        >
          {/** Render each chart defined in the store. */}
          {store.exploreStore.chartConfigs.map((chartConfig) => (
            <Card
              key={chartConfig.chartId}
              withBorder
              className={classes.gridItem}
            >
              {renderChart(chartConfig)}
            </Card>
          ))}
        </ResponsiveGridLayout>
      ) : (
        presetStateCards.map(({ groupLabel, options }, groupIdx) => (
          <Box key={groupLabel}>
            {/* Preset state group label */}
            <Text
              mb={verticalMargin}
              className={clsx(
                classes.variableTitle,
                hoveredIdx && hoveredIdx.group === groupIdx && classes.active,
              )}
            >
              {groupLabel}
            </Text>
            {/* Preset state, for each option in group */}
            <Stack>
              {options.map(({ question, Icon }, cardIdx) => (
                <Card
                  key={question}
                  withBorder
                  style={{ height: toolbarWidth, cursor: 'pointer' }}
                  className={clsx(cardStyles.presetStateCard, classes.gridItem)}
                  onMouseEnter={() => setHoveredIdx({ group: groupIdx, card: cardIdx })}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => handlePresetClick(groupIdx, cardIdx)}
                >
                  <Group className={cardStyles.presetStateContent}>
                    <Group className={cardStyles.question}>
                      {/* Preset state icon */}
                      <Box className={cardStyles.iconContainer}>
                        <Icon size={cardIconSize} stroke={cardIconStroke} />
                      </Box>
                      {/* Preset state question */}
                      <Text size="sm">{question}</Text>
                    </Group>
                    {/* Arrow Icon */}
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
        ))
      )}
    </Stack>
  ));
}
