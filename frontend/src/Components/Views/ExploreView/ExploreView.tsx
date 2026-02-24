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
  IconPlus,
} from '@tabler/icons-react';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { useObserver } from 'mobx-react-lite';
import { useDisclosure } from '@mantine/hooks';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import cardStyles from './PresetStateCard.module.css';
import { presetStateCards } from './PresetStateCards';
import { Store } from '../../../Store/Store';
import classes from '../GridLayoutItem.module.css';
import {
  costYAxisOptions, ExploreTableRowOptions, ExploreTableConfig,
  SCATTER_X_AXIS_OPTIONS, SCATTER_Y_AXIS_OPTIONS,
  ScatterXAxisVar, ScatterYAxisVar,
} from '../../../Types/application';
import { DumbbellChart } from './Charts/DumbbellChart';
import ExploreTable from './Charts/ExploreTable';
import { ScatterPlot } from './Charts/ScatterPlot';

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

  const [chartType, setChartType] = useState<'cost' | 'dumbbell' | 'exploreTable' | 'scatterPlot'>('cost');
  const [aggregation, setAggregation] = useState<'sum' | 'avg' | 'none'>('sum');
  const [costGroupVar, setCostGroupVar] = useState<string>('');
  const [exploreTableGroupVar, setExploreTableGroupVar] = useState<string>('');
  const [scatterXVar, setScatterXVar] = useState<string>('');
  const [scatterYVar, setScatterYVar] = useState<string>('');

  const resetModal = useCallback(() => {
    setChartType('cost');
    setAggregation('sum');
    setCostGroupVar('');
    setExploreTableGroupVar('');
    setScatterXVar('');
    setScatterYVar('');
  }, []);

  const handleOpenAdd = () => {
    resetModal();
    openAddModal();
  };

  const handleAddChart = () => {
    const id = `explore-${Date.now()}`;
    if (chartType === 'cost') {
      if (!costGroupVar) return;
      const groupLabel = ExploreTableRowOptions.find((o) => o.value === costGroupVar)?.label || costGroupVar;

      store.addExploreChart({
        chartId: id,
        chartType: 'exploreTable',
        title: `Cost Savings Analysis per ${groupLabel}`,
        rowVar: costGroupVar as ExploreTableConfig['rowVar'],
        aggregation: (aggregation === 'none' ? 'sum' : aggregation) as 'sum' | 'avg',
        columns: [
          {
            colVar: 'drg_weight',
            aggregation: 'none',
            type: 'violin',
            title: 'DRG Weight',
          },
          {
            colVar: costGroupVar as ExploreTableConfig['rowVar'],
            aggregation: 'none',
            type: 'text',
            title: groupLabel,
          },
          {
            colVar: 'cases',
            aggregation: 'sum',
            type: 'numeric',
            title: 'Cases',
          },
          {
            colVar: 'total_cost',
            aggregation: 'avg',
            type: 'stackedBar',
            title: 'Average Cost per Visit',
          },
          {
            colVar: 'salvage_savings',
            aggregation: 'sum',
            type: 'numericBar',
            title: 'Savings from Cell Salvage',
          },
        ],
        twoValsPerRow: false,
      });
    } else if (chartType === 'exploreTable') {
      if (!exploreTableGroupVar) return;

      const groupLabel = ExploreTableRowOptions.find((o) => o.value === exploreTableGroupVar)?.label || exploreTableGroupVar;

      store.addExploreChart({
        chartId: id,
        chartType: 'exploreTable',
        title: `RBC Transfusions per ${groupLabel}`,
        rowVar: exploreTableGroupVar as ExploreTableConfig['rowVar'],
        aggregation: (aggregation === 'none' ? 'avg' : aggregation) as 'sum' | 'avg',
        columns: [
          {
            colVar: 'drg_weight',
            aggregation: 'none',
            type: 'violin',
            title: 'DRG Weight',
          },
          {
            colVar: exploreTableGroupVar,
            aggregation: 'none',
            type: 'text',
            title: groupLabel,
          },
          {
            colVar: 'cases',
            aggregation: 'sum',
            type: 'numeric',
            title: 'Cases',
          },
          {
            colVar: 'percent_1_rbc',
            aggregation: (aggregation === 'none' ? 'avg' : aggregation) as 'sum' | 'avg',
            type: 'heatmap',
            title: '1 RBC',
          },
          {
            colVar: 'percent_2_rbc',
            aggregation: (aggregation === 'none' ? 'avg' : aggregation) as 'sum' | 'avg',
            type: 'heatmap',
            title: '2 RBC',
          },
          {
            colVar: 'percent_3_rbc',
            aggregation: (aggregation === 'none' ? 'avg' : aggregation) as 'sum' | 'avg',
            type: 'heatmap',
            title: '3 RBC',
          },
          {
            colVar: 'percent_4_rbc',
            aggregation: (aggregation === 'none' ? 'avg' : aggregation) as 'sum' | 'avg',
            type: 'heatmap',
            title: '4 RBC',
          },
          {
            colVar: 'percent_above_5_rbc',
            aggregation: (aggregation === 'none' ? 'avg' : aggregation) as 'sum' | 'avg',
            type: 'heatmap',
            title: '≥5 RBC',
          },
        ],
        twoValsPerRow: false,
      });
    } else if (chartType === 'dumbbell') {
      store.addExploreChart({
        chartId: id,
        chartType: 'dumbbell',
        xAxisVar: 'provider_visit',
        yAxisVar: 'hgb',
        aggregation: 'none',
      });
    } else if (chartType === 'scatterPlot') {
      store.addExploreChart({
        chartId: id,
        chartType: 'scatterPlot',
        xAxisVar: (scatterXVar || 'pre_hgb') as ScatterXAxisVar,
        yAxisVar: (scatterYVar || 'post_hgb') as ScatterYAxisVar,
        aggregation: (aggregation === 'none' ? 'none' : aggregation) as 'sum' | 'avg' | 'none',
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
              { value: 'exploreTable', label: 'Heatmap' },
              { value: 'dumbbell', label: 'Dumbbell Chart' },
              { value: 'scatterPlot', label: 'Scatter Plot' },
            ]}
            onChange={(v) => {
              const val = (v as 'cost' | 'exploreTable' | 'dumbbell' | 'scatterPlot') || 'cost';
              setChartType(val);
              if (val === 'exploreTable') {
                setAggregation('avg');
              } else if (val === 'scatterPlot') {
                setAggregation('none');
              }
            }}
          />
          {(chartType === 'cost' || chartType === 'exploreTable' || chartType === 'scatterPlot') && (
            <Select
              label="Aggregation"
              value={aggregation}
              data={chartType === 'scatterPlot' ? [...aggregationOptions, { value: 'none', label: 'None' }] : aggregationOptions}
              onChange={(v) => setAggregation((v as 'sum' | 'avg' | 'none') || 'sum')}
            />
          )}

          {chartType === 'cost' ? (
            <Select
              label="Group By"
              placeholder="Choose grouping variable"
              value={costGroupVar}
              data={costGroupOptions}
              onChange={(v) => setCostGroupVar(v || '')}
            />
          ) : chartType === 'exploreTable' ? (
            <Select
              label="Group By"
              placeholder="Choose grouping variable"
              value={exploreTableGroupVar}
              data={ExploreTableRowOptions}
              onChange={(v) => setExploreTableGroupVar(v || '')}
            />
          ) : chartType === 'scatterPlot' ? (
            <Flex gap="md" direction="column">
              <Select
                label="X-Axis"
                placeholder="Choose X-axis variable"
                value={scatterXVar}
                data={SCATTER_X_AXIS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                onChange={(v) => setScatterXVar(v || '')}
              />
              <Select
                label="Y-Axis"
                placeholder="Choose Y-axis variable"
                value={scatterYVar}
                data={SCATTER_Y_AXIS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                onChange={(v) => setScatterYVar(v || '')}
              />
            </Flex>
          ) : null}

          {chartType === 'dumbbell' && (
            <Text c="dimmed" fs="italic" size="sm">
              Dumbbell chart groups by Provider and Visit automatically. No aggregation options available.
            </Text>
          )}
          <Button
            onClick={handleAddChart}
            disabled={
              (chartType === 'cost' && !costGroupVar)
              || (chartType === 'exploreTable' && !exploreTableGroupVar)
              || (chartType === 'scatterPlot' && (!scatterXVar || !scatterYVar))
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
            main: 4, sm: 1,
          }}
          rowHeight={150}
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
              {chartConfig.chartType === 'exploreTable' && <ExploreTable chartConfig={chartConfig} />}
              {chartConfig.chartType === 'dumbbell' && <DumbbellChart chartConfig={chartConfig} />}
              {chartConfig.chartType === 'scatterPlot' && <ScatterPlot chartConfig={chartConfig} />}
            </Card>
          ))}
        </ResponsiveGridLayout>
      ) : (
        presetStateCards.map(({ groupLabel, options }, groupIdx) => (
          <Box key={groupLabel}>
            {/* Preset state group label */}
            <Text
              mb={verticalMargin}
              className={`${classes.variableTitle} ${hoveredIdx && hoveredIdx.group === groupIdx ? classes.active : ''}`.trim()}
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
                  className={`${cardStyles.presetStateCard} ${classes.gridItem}`}
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
