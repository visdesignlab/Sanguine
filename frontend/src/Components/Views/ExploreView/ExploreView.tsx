import {
  useCallback, useContext, useMemo, useState,
} from 'react';
import {
  Title, Card, Group, Box, Text, Stack, Flex, Button,
  Divider,
  Tooltip,
  Modal,
  Select,
} from '@mantine/core';
import {
  IconPlus, IconArrowUpRight,
} from '@tabler/icons-react';
import clsx from 'clsx';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { useObserver } from 'mobx-react';
import { useDisclosure } from '@mantine/hooks';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import cardStyles from './PresetStateCard.module.css';
import { presetStateCards } from './PresetStateCards';
import { Store } from '../../../Store/Store';
import classes from '../GridLayoutItem.module.css';
import {
  BLOOD_COMPONENT_OPTIONS, costYAxisOptions, costYAxisVars, dashboardXAxisVars, dashboardYAxisOptions, dashboardYAxisVars, LAB_RESULT_OPTIONS, TIME_AGGREGATION_OPTIONS,
} from '../../../Types/application';
import { CostChart } from './Charts/CostChart';
import { ScatterPlot } from './Charts/ScatterPlot';
import ExploreTable from './Charts/ExploreTable';

export function ExploreView() {
  const store = useContext(Store);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive) as any, []);

  // Hovered preset card
  const [hoveredIdx, setHoveredIdx] = useState<{ group: number; card: number } | null>(null);
  const verticalMargin = 'md';

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
    store.loadExplorePreset([...chartConfigs], {
      main: [...chartLayouts.main],
    });
  };

  // Add Chart Modal State ---------------------------------
  const [isAddModalOpen, { open: openAddModal, close: closeAddModal }] = useDisclosure(false);
  const [chartType, setChartType] = useState<'cost' | 'scatter'>('cost');
  const [aggregation, setAggregation] = useState<'sum' | 'avg'>('sum');
  const [costGroupVar, setCostGroupVar] = useState<string>('');
  const [scatterXAxisVar, setScatterXAxisVar] = useState<string>('quarter');
  const [scatterYAxisVar, setScatterYAxisVar] = useState<string>('');

  const resetModal = useCallback(() => {
    setChartType('cost');
    setAggregation('sum');
    setCostGroupVar('');
    setScatterXAxisVar('quarter');
    setScatterYAxisVar('');
  }, []);

  const handleOpenAdd = () => {
    resetModal();
    openAddModal();
  };

  const handleAddChart = () => {
    const id = `explore-${Date.now()}`;
    if (chartType === 'cost') {
      if (!costGroupVar) return;
      store.addExploreChart({
        chartId: id,
        chartType: 'cost',
        xAxisVar: 'cost',
        yAxisVar: costGroupVar as typeof costYAxisVars[number],
        aggregation,
      });
    } else {
      if (!scatterXAxisVar || !scatterYAxisVar) return;
      store.addExploreChart({
        chartId: id,
        chartType: 'scatterPlot',
        xAxisVar: scatterXAxisVar as typeof dashboardXAxisVars[number],
        yAxisVar: scatterYAxisVar as typeof dashboardYAxisVars[number],
        aggregation,
      });
    }
    closeAddModal();
  };

  // Options ------------------------------------------------------
  const aggregationOptions = [
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
  ];

  const costGroupOptions = costYAxisOptions.map((o) => ({ value: o.value, label: o.label }));

  const scatterXOptions = [
    // Time aggregations
    ...Object.entries(TIME_AGGREGATION_OPTIONS).map(([value, { label }]) => ({
      value,
      label,
    })),
    // Blood components
    ...BLOOD_COMPONENT_OPTIONS.map((b) => ({
      value: b.value,
      label: b.label.base,
    })),
  ];

  const scatterYOptions = [
    ...dashboardYAxisOptions.map((o) => ({
      value: o.value,
      label: o.label.base,
    })),
    ...LAB_RESULT_OPTIONS.map((l) => ({
      value: l.value,
      label: l.label.base,
    })),
  ];

  // -------------------------------------------------------
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
          <Button onClick={handleOpenAdd}>
            <IconPlus size={buttonIconSize} stroke={cardIconStroke} style={{ marginRight: 6 }} />
            Add Chart
          </Button>
        </Flex>
      </Flex>
      <Divider />
      {/* Add Chart Modal */}
      <Modal
        opened={isAddModalOpen}
        onClose={closeAddModal}
        title="Add Chart"
        centered
      >
        <Stack gap="md">
          <Select
            label="Chart Type"
            value={chartType}
            data={[
              { value: 'cost', label: 'Costs & Savings' },
              { value: 'scatter', label: 'Scatter' },
            ]}
            onChange={(v) => setChartType((v as 'cost' | 'scatter') || 'cost')}
          />
          <Select
            label="Aggregation"
            value={aggregation}
            data={aggregationOptions}
            onChange={(v) => setAggregation((v as 'sum' | 'avg') || 'sum')}
          />

          {chartType === 'cost' ? (
            <Select
              label="Group By"
              placeholder="Choose grouping variable"
              value={costGroupVar}
              data={costGroupOptions}
              onChange={(v) => setCostGroupVar(v || '')}
            />
          ) : (
            <>
              <Select
                label="X Variable"
                placeholder="Choose X variable"
                value={scatterXAxisVar}
                data={scatterXOptions}
                onChange={(v) => setScatterXAxisVar(v || '')}
              />
              <Select
                label="Y Variable"
                placeholder="Choose Y variable"
                value={scatterYAxisVar}
                data={scatterYOptions}
                onChange={(v) => setScatterYAxisVar(v || '')}
              />
            </>
          )}
          <Button
            onClick={handleAddChart}
            disabled={
              (chartType === 'cost' && !costGroupVar)
              || (chartType === 'scatter' && (!scatterXAxisVar || !scatterYAxisVar))
            }
            fullWidth
          >
            Done
          </Button>
        </Stack>
      </Modal>
      {store.exploreChartLayouts.main.length > 0 ? (
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
          onDragStop={(_layout: Layout[], _oldItem: Layout, _newItem: Layout, _placeholder: Layout, _e: MouseEvent, _element: HTMLElement) => {
            store.updateExploreLayout({ main: _layout });
          }}
          onResizeStop={(_layout: Layout[], _oldItem: Layout, _newItem: Layout, _placeholder: Layout, _e: MouseEvent, _element: HTMLElement) => {
            store.updateExploreLayout({ main: _layout });
          }}
          layouts={store.exploreChartLayouts}
        >
          {/** Render each chart defined in the store. */}
          {store.exploreChartConfigs.map((chartConfig) => (
            <Card
              key={chartConfig.chartId}
              withBorder
              className={classes.gridItem}
            >
              {chartConfig.chartType === 'cost' && <CostChart chartConfig={chartConfig} />}
              {chartConfig.chartType === 'scatterPlot' && <ScatterPlot chartConfig={chartConfig} />}
              {chartConfig.chartType === 'exploreTable' && <ExploreTable chartConfig={chartConfig} />}
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
