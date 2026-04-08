import {
  useCallback, useContext, useEffect, useMemo, useState, useRef,
} from 'react';
import {
  ActionIcon,
  Title, Card, Text, Stack, Flex, Button,
  Divider,
  Tooltip,
  Modal,
  Select,
  Popover,
  Box,
  ScrollArea,
} from '@mantine/core';
import {
  IconPlus, IconLayoutSidebarRightCollapse, IconLayoutSidebarRightExpand, IconFilter,
} from '@tabler/icons-react';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { useObserver } from 'mobx-react-lite';
import { useDisclosure } from '@mantine/hooks';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import { presetStateCards } from './PresetStateCards';
import { Store } from '../../../Store/Store';
import classes from '../GridLayoutItem.module.css';
import {
  costYAxisOptions, ExploreTableRowOptions, ExploreTableConfig,
  SCATTER_X_AXIS_OPTIONS, SCATTER_Y_AXIS_OPTIONS,
  ScatterXAxisVar, ScatterYAxisVar,
  DumbbellXAxisVar, DumbbellYAxisVar,
  DUMBBELL_X_AXIS_OPTIONS, DUMBBELL_Y_AXIS_OPTIONS,
} from '../../../Types/application';
import { DumbbellChart } from './Charts/DumbbellChart';
import ExploreTable from './Charts/ExploreTable';
import { ScatterPlot } from './Charts/ScatterPlot';
import { DepartmentProcedureFilter } from '../../Toolbar/Filters/DepartmentProcedureFilter';

function FilteredDepartmentsText({ names }: { names: string[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isAtEnd, setIsAtEnd] = useState(false);

  const checkScroll = useCallback(() => {
    if (viewportRef.current) {
      const { scrollWidth, clientWidth, scrollLeft } = viewportRef.current;
      setIsAtEnd(scrollWidth <= clientWidth || scrollLeft >= scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll, names]);

  return (
    <>
      <Text size="lg" fw={300} c="dimmed" style={{ flexShrink: 0 }}>
        {' - '}
      </Text>
      <ScrollArea
        viewportRef={viewportRef}
        type="never"
        onScrollPositionChange={checkScroll}
        style={{
          flex: 1,
          maskImage: isAtEnd ? 'none' : 'linear-gradient(to right, black 85%, transparent 100%)',
          WebkitMaskImage: isAtEnd ? 'none' : 'linear-gradient(to right, black 85%, transparent 100%)',
        }}
      >
        <Text size="lg" fw={300} c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          {names.join(', ')}
        </Text>
      </ScrollArea>
    </>
  );
}

export function DepartmentView() {
  const store = useContext(Store);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive) as any, []);

  // Initial Load Default Preset
  useEffect(() => {
    if (store.exploreChartConfigs.length === 0 && presetStateCards[0]?.options[0]) {
      const { chartConfigs, chartLayouts, question } = presetStateCards[0].options[0];
      store.loadExplorePreset([...chartConfigs], { main: [...chartLayouts.main] }, question);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sizes
  const {
    cardIconStroke,
    toolbarWidth,
    buttonIconSize,
  } = useThemeConstants();

  // Add Chart Modal State ---------------------------------
  const [isAddModalOpen, { open: openAddModal, close: closeAddModal }] = useDisclosure(false);
  const [filterPopoverOpened, setFilterPopoverOpened] = useState(false);

  const [chartType, setChartType] = useState<'cost' | 'dumbbell' | 'exploreTable' | 'scatterPlot'>('cost');
  const [aggregation, setAggregation] = useState<'sum' | 'avg' | 'none'>('sum');
  const [costGroupVar, setCostGroupVar] = useState<string>('');
  const [exploreTableGroupVar, setExploreTableGroupVar] = useState<string>('');
  const [dumbbellXVar, setDumbbellXVar] = useState<string>('');
  const [dumbbellYVar, setDumbbellYVar] = useState<string>('');
  const [scatterXVar, setScatterXVar] = useState<string>('');
  const [scatterYVar, setScatterYVar] = useState<string>('');

  const resetModal = useCallback(() => {
    setChartType('cost');
    setAggregation('sum');
    setCostGroupVar('');
    setExploreTableGroupVar('');
    setDumbbellXVar('surgeon');
    setDumbbellYVar('hgb');
    setScatterXVar('surgeon');
    setScatterYVar('pre_fibrinogen');
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
            colVar: 'percent_0_rbc',
            aggregation: aggregation as 'sum' | 'avg',
            type: 'heatmap',
            title: '0 RBC',
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
        xAxisVar: (dumbbellXVar || 'surgeon') as DumbbellXAxisVar,
        yAxisVar: (dumbbellYVar || 'hgb') as DumbbellYAxisVar,
        aggregation: 'none',
      });
    } else if (chartType === 'scatterPlot') {
      store.addExploreChart({
        chartId: id,
        chartType: 'scatterPlot',
        xAxisVar: (scatterXVar || 'surgeon') as ScatterXAxisVar,
        yAxisVar: (scatterYVar || 'pre_fibrinogen') as ScatterYAxisVar,
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
      <Flex direction="row" justify="space-between" align="center" h={toolbarWidth / 2} w="100%">
        <Flex align="center" gap="xs" style={{ flex: 1, minWidth: 0, paddingRight: '1rem' }}>
          <Title order={3} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>Department Charts</Title>
          {(() => {
            if (!store.procedureHierarchy) return null;
            const deps = store.state.explore.departmentIds;
            const procs = store.state.explore.procedureIds;
            if (deps.length === 0 && procs.length === 0) return null;

            const names: string[] = [];
            const deptMap = new Map(store.procedureHierarchy.departments.map((d) => [d.id, d.name]));
            deps.forEach((id: string) => {
              if (deptMap.has(id)) names.push(deptMap.get(id)!);
            });

            if (procs.length > 0) {
              store.procedureHierarchy.departments.forEach((d) => {
                d.procedures.forEach((p) => {
                  if (procs.includes(p.id)) {
                    if (!deps.includes(d.id)) {
                      names.push(p.name);
                    }
                  }
                });
              });
            }

            if (names.length === 0) return null;
            return <FilteredDepartmentsText names={names} />;
          })()}
        </Flex>

        <Flex direction="row" align="center" gap="md" style={{ flexShrink: 0 }}>
          <Tooltip label="Visits shown, out of all visits hospital-wide" position="bottom">
            <Title order={5} c="dimmed">
              {`${store.exploreFilteredVisitsLength.toLocaleString()} / ${store.allVisitsLength.toLocaleString()} Visits`}
            </Title>
          </Tooltip>
          <Popover opened={filterPopoverOpened} onChange={setFilterPopoverOpened} position="bottom-end" shadow="md" withArrow>
            <Popover.Target>
              <Button onClick={() => setFilterPopoverOpened((o) => !o)}>
                <IconFilter size={buttonIconSize} stroke={cardIconStroke} style={{ marginRight: 6 }} />
                Select Department
              </Button>
            </Popover.Target>
            <Popover.Dropdown p="sm">
              <Box w={350}>
                <Text fw={700} mb="xs">Department Charts Filters</Text>
                <DepartmentProcedureFilter
                  mode="department"
                  selectedDepartmentIds={store.state.explore.departmentIds}
                  selectedProcedureIds={store.state.explore.procedureIds}
                  onChange={(deps, procs) => store.actions.setExploreProcedureFilters(deps, procs)}
                />
              </Box>
            </Popover.Dropdown>
          </Popover>
          <Button onClick={handleOpenAdd}>
            <IconPlus size={buttonIconSize} stroke={cardIconStroke} style={{ marginRight: 6 }} />
            Add Chart
          </Button>
          <ActionIcon
            variant={store.departmentViewQuestionsOpened ? 'light' : 'subtle'}
            onClick={() => store.toggleDepartmentViewQuestions()}
            size="lg"
            aria-label="Toggle Preset Questions Panel"
          >
            {store.departmentViewQuestionsOpened ? <IconLayoutSidebarRightCollapse size={buttonIconSize} /> : <IconLayoutSidebarRightExpand size={buttonIconSize} />}
          </ActionIcon>
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
              } else if (val === 'scatterPlot' || val === 'dumbbell') {
                setAggregation('none');
              }
            }}
          />
          {(chartType === 'cost' || chartType === 'exploreTable') && (
            <Select
              label="Aggregation"
              value={aggregation}
              data={aggregationOptions}
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
          ) : chartType === 'dumbbell' ? (
            <Flex gap="md" direction="column">
              <Select
                label="X-Axis"
                placeholder="Choose X-axis variable"
                value={dumbbellXVar}
                data={DUMBBELL_X_AXIS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                onChange={(v) => setDumbbellXVar(v || '')}
              />
              <Select
                label="Y-Axis"
                placeholder="Choose Y-axis variable"
                value={dumbbellYVar}
                data={DUMBBELL_Y_AXIS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                onChange={(v) => setDumbbellYVar(v || '')}
              />
            </Flex>
          ) : null}
          <Button
            onClick={handleAddChart}
            disabled={
              (chartType === 'cost' && !costGroupVar)
              || (chartType === 'exploreTable' && !exploreTableGroupVar)
              || (chartType === 'scatterPlot' && (!scatterXVar || !scatterYVar))
              || (chartType === 'dumbbell' && (!dumbbellXVar || !dumbbellYVar))
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
        <Text c="dimmed" p="md">No charts loaded. Select a preset question from the right sidebar.</Text>
      )}
    </Stack>
  ));
}
