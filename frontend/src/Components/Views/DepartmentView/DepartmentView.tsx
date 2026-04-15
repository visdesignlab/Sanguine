import {
  useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  ActionIcon,
  Title, Card, Text, Stack, Flex, Button, Box,
  Badge,
  Divider,
  Tooltip,
  Modal,
  Select,
  Menu,
} from '@mantine/core';
import {
  IconPlus,
  IconBuildingHospital, IconChartLine, IconNumbers,
  IconSearch, IconChevronLeft, IconChevronRight,
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
  exploreStatYAxisOptions,
  AGGREGATION_OPTIONS,
} from '../../../Types/application';
import { DumbbellChart } from './Charts/DumbbellChart';
import ExploreTable from './Charts/ExploreTable';
import { ScatterPlot } from './Charts/ScatterPlot';
import { DepartmentViewQuestions } from './DepartmentViewQuestions';
import { DepartmentStatsGrid } from './DepartmentStatsGrid';

export function DepartmentView() {
  const store = useContext(Store);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive) as any, []);

  // Initial Load Default Preset
  useEffect(() => {
    if (store.exploreChartConfigs.length === 0 && presetStateCards[0]?.options[0]) {
      const {
        chartConfigs, chartLayouts, question, statConfigs,
      } = presetStateCards[0].options[0];
      store.loadExplorePreset([...chartConfigs], { main: [...chartLayouts.main] }, question, statConfigs ? [...statConfigs] : undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sizes
  const {
    cardIconStroke,
    cardIconSize,
    toolbarWidth,
    buttonIconSize,
  } = useThemeConstants();

  // Add Chart Modal State ---------------------------------
  const [isAddModalOpen, { open: openAddModal, close: closeAddModal }] = useDisclosure(false);

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

  // Add Stat Modal State ---------------------------------
  const [isStatModalOpen, { open: openStatModal, close: closeStatModal }] = useDisclosure(false);
  const [statAggregation, setStatAggregation] = useState<'sum' | 'avg'>('avg');
  const [statYAxisVar, setStatYAxisVar] = useState<string>('');

  const handleAddStat = useCallback(() => {
    if (!statYAxisVar) return;
    const option = exploreStatYAxisOptions.find((o) => o.value === statYAxisVar);
    const aggLabel = statAggregation === 'sum' ? option?.label.sum : option?.label.avg;
    store.addExploreStat({
      statId: `stat-${Date.now()}`,
      yAxisVar: statYAxisVar as typeof exploreStatYAxisOptions[number]['value'],
      aggregation: statAggregation,
      title: aggLabel || statYAxisVar,
    });
    closeStatModal();
  }, [statYAxisVar, statAggregation, store, closeStatModal]);

  const handleOpenStatModal = useCallback(() => {
    setStatAggregation('avg');
    setStatYAxisVar('');
    openStatModal();
  }, [openStatModal]);

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

  // Department Select Options -----------------------------------------------
  const departmentOptions = useMemo(() => {
    if (!store.procedureHierarchy) return [];
    return store.procedureHierarchy.departments
      .map((dept) => ({
        value: dept.id,
        label: dept.name,
      }))
      .sort((a, b) => (store.departmentVisitCounts[b.value] || 0) - (store.departmentVisitCounts[a.value] || 0));
  }, [store.procedureHierarchy, store.departmentVisitCounts]);

  const renderDeptOption = useCallback(({ option }: { option: { value: string; label: string } }) => {
    const filteredCount = store.departmentVisitCounts[option.value] ?? 0;
    const totalCount = store.procedureHierarchy?.departments.find((dept) => dept.id === option.value)?.visit_count ?? filteredCount;
    const isAfterFilters = filteredCount < totalCount;

    return (
      <Flex justify="space-between" align="center" w="100%" gap="xs">
        <Text size="sm" style={{ flex: 1, minWidth: 0 }}>{option.label}</Text>
        <Tooltip
          label={(
            <Text size="sm">
              {`${filteredCount.toLocaleString()} Visits saw ${option.label}`}
              {isAfterFilters && (
                <>
                  {' ('}
                  <Text span size="xs" fs="italic">After Filters</Text>
                  )
                </>
              )}
            </Text>
          )}
          position="left"
        >
          <Badge size="xs" variant="light" color="gray" style={{ flexShrink: 0 }}>
            {filteredCount.toLocaleString()}
          </Badge>
        </Tooltip>
      </Flex>
    );
  }, [store.departmentVisitCounts, store.procedureHierarchy]);

  // -------------------------------------------------------
  return useObserver(() => (
    <Stack>
      {/* Title, Add Chart Button */}
      <Flex direction="row" justify="space-between" align="center" h={toolbarWidth / 2}>
        <Flex align="center" gap="xs">
          <Title order={3}>Department</Title>
          {(() => {
            if (!store.selectedDepartmentId || !store.procedureHierarchy) return null;
            const dept = store.procedureHierarchy.departments.find((d) => d.id === store.selectedDepartmentId);
            if (!dept) return null;
            return (
              <Text size="lg" fw={300} c="dimmed">
                {`- ${dept.name}`}
              </Text>
            );
          })()}
        </Flex>

        <Flex direction="row" align="center" gap="md">
          <Tooltip label="Visible visits after filters" position="bottom">
            <Text size="sm">
              <Text span fw={500}>
                {(store.selectedDepartmentId ? (store.departmentVisitCounts[store.selectedDepartmentId] || 0) : store.filteredVisitsLength).toLocaleString()}
              </Text>
              <Text span fw={300} c="dimmed">
                {` / ${store.allVisitsLength.toLocaleString()} Visits`}
              </Text>
            </Text>
          </Tooltip>
          <Select
            placeholder="Select department"
            value={store.selectedDepartmentId}
            onChange={(value) => store.setSelectedDepartment(value)}
            data={departmentOptions}
            renderOption={renderDeptOption}
            leftSection={<IconBuildingHospital size={18} stroke={1.2} color="black" />}
            styles={{
              input: {
                borderColor: 'black',
                borderWidth: '1px',
              },
            }}
            w={260}
            searchable
            allowDeselect={false}
          />
          <Menu width="md">
            <Menu.Target>
              <Button>
                <IconPlus size={buttonIconSize} stroke={cardIconStroke} style={{ marginRight: 6 }} />
                Add Item
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconNumbers size={cardIconSize} stroke={cardIconStroke} />}
                onClick={handleOpenStatModal}
              >
                Add Stat
              </Menu.Item>
              <Menu.Item
                leftSection={<IconChartLine size={cardIconSize} stroke={cardIconStroke} />}
                onClick={handleOpenAdd}
              >
                Add Chart
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Tooltip label="Chart Presets" position="bottom">
            <ActionIcon
              variant={store.departmentViewQuestionsOpened ? 'light' : 'default'}
              onClick={() => store.toggleDepartmentViewQuestions()}
              size="lg"
              aria-label="Chart Presets"
            >
              <Flex align="center" gap={1}>
                {store.departmentViewQuestionsOpened
                  ? (
                    <>
                      <IconSearch size={buttonIconSize - 4} />
                      <IconChevronRight size={buttonIconSize - 6} />
                    </>
                  )
                  : (
                    <>
                      <IconChevronLeft size={buttonIconSize - 6} />
                      <IconSearch size={buttonIconSize - 4} />
                    </>
                  )}
              </Flex>
            </ActionIcon>
          </Tooltip>
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
      {/* Add Stat Modal */}
      <Modal
        opened={isStatModalOpen}
        onClose={closeStatModal}
        title="Add Stat"
        centered
      >
        <Stack gap="md">
          <Select
            label="Aggregation"
            data={Object.entries(AGGREGATION_OPTIONS).map(([value, { label }]) => ({ value, label }))}
            value={statAggregation}
            onChange={(v) => setStatAggregation((v as 'sum' | 'avg') || 'avg')}
          />
          <Select
            label="Metric"
            placeholder="Choose metric"
            data={exploreStatYAxisOptions.map((opt) => ({
              value: opt.value,
              label: opt.label.base,
            }))}
            value={statYAxisVar}
            onChange={(v) => setStatYAxisVar(v || '')}
            searchable
          />
          <Button
            onClick={handleAddStat}
            disabled={!statYAxisVar}
            fullWidth
          >
            Done
          </Button>
        </Stack>
      </Modal>
      {/* Charts + Sidebar flex row */}
      <Flex gap="md" style={{ flex: 1, minHeight: 0 }}>
        <Box style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
          {/* Explore Stat Cards */}
          <DepartmentStatsGrid />
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
            <Text c="dimmed" fw={300} fs="italic" ta="center" pt="xl">
              Add Item or select a question from the
              {' '}
              <IconSearch size={14} style={{ verticalAlign: 'middle' }} />
              {' '}
              right sidebar.
            </Text>
          )}
        </Box>
        <Box
          style={{
            width: store.departmentViewQuestionsOpened ? store.departmentViewQuestionsWidth : 0,
            overflow: 'hidden',
            flexShrink: 0,
            transition: 'width 0.35s ease-in-out',
          }}
        >
          <DepartmentViewQuestions />
        </Box>
      </Flex>
    </Stack>
  ));
}
