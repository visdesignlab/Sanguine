import {
  beforeEach, describe, expect, test,
} from 'vitest';
import { Layout } from 'react-grid-layout';
import {
  RootStore, MANUAL_INFINITY,
  type ApplicationStatePatch,
} from './Store';
import type { DashboardChartConfig, DepartmentChartConfig } from '../Types/application';

describe('Store - RootStore', () => {
  let store: RootStore;

  beforeEach(() => {
    // Clear the URL hash so trrack's loadFromUrl does not bleed state across tests
    window.history.replaceState(null, '', window.location.pathname);
    store = new RootStore();
    // Initialize provenance so actions will work
    store.init();
  });

  describe('Initialization', () => {
    test('should create a new store instance', () => {
      expect(store).toBeInstanceOf(RootStore);
    });

    test('should initialize with default filter values', () => {
      expect(store._initialFilterValues).toBeDefined();
      expect(store._initialFilterValues.dateFrom).toBeInstanceOf(Date);
      expect(store._initialFilterValues.dateTo).toBeInstanceOf(Date);
    });

    test('should have empty dashboard chart data initially', () => {
      expect(store.dashboardChartData).toEqual({});
    });

    test('should have empty department chart data initially', () => {
      expect(store.departmentChartData).toEqual({});
    });

    test('should have empty histogram data initially', () => {
      expect(store.histogramData).toEqual({});
    });

    test('should initialize selected visits as empty array', () => {
      expect(Array.isArray(store.selectedVisits)).toBe(true);
      expect(store.selectedVisits).toHaveLength(0);
    });

    test('should initialize with ProvidersStore', () => {
      expect(store.providersStore).toBeDefined();
    });
  });

  describe('Dashboard Chart Management', () => {
    test('should get default dashboard chart configs', () => {
      const configs = store.dashboardChartConfigs;
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0);
    });

    test('should add a new dashboard chart', () => {
      const initialCount = store.dashboardChartConfigs.length;
      const newConfig: DashboardChartConfig = {
        chartId: 'test-chart',
        xAxisVar: 'month',
        yAxisVar: 'rbc_units',
        aggregation: 'sum',
        chartType: 'bar',
      };

      store.addDashboardChart(newConfig);
      expect(store.dashboardChartConfigs.length).toBeGreaterThan(initialCount);
    });

    test('allows adding the same chart config twice (no duplicate detection)', () => {
      const config: DashboardChartConfig = {
        chartId: 'test-chart',
        xAxisVar: 'month',
        yAxisVar: 'rbc_units',
        aggregation: 'sum',
        chartType: 'bar',
      };

      const initialCount = store.dashboardChartConfigs.length;
      store.addDashboardChart(config);
      store.addDashboardChart(config);
      expect(store.dashboardChartConfigs.length).toBe(initialCount + 2);
      expect(store.dashboardChartConfigs.filter((c) => c.chartId === 'test-chart')).toHaveLength(2);
    });

    test('should remove a dashboard chart by ID', () => {
      const config: DashboardChartConfig = {
        chartId: 'remove-test',
        xAxisVar: 'month',
        yAxisVar: 'plt_units',
        aggregation: 'avg',
        chartType: 'line',
      };

      store.addDashboardChart(config);
      const beforeCount = store.dashboardChartConfigs.length;
      store.removeDashboardChart('remove-test');
      expect(store.dashboardChartConfigs.length).toBeLessThan(beforeCount);
    });
  });

  describe('Dashboard Stat Management', () => {
    test('should get default dashboard stat configs', () => {
      const configs = store.dashboardStatConfigs;
      expect(Array.isArray(configs)).toBe(true);
    });

    test('should add a new dashboard stat', () => {
      const initialCount = store.dashboardStatConfigs.length;
      store.addDashboardStat('rbc_units', 'sum');
      expect(store.dashboardStatConfigs.length).toBeGreaterThan(initialCount);
    });

    test('should remove a dashboard stat by ID', () => {
      store.addDashboardStat('ffp_units', 'avg');
      const { statId } = store.dashboardStatConfigs[store.dashboardStatConfigs.length - 1];

      const beforeCount = store.dashboardStatConfigs.length;
      store.removeDashboardStat(statId);
      expect(store.dashboardStatConfigs.length).toBeLessThan(beforeCount);
    });
  });

  describe('Dashboard Layout Management', () => {
    test('should get default dashboard layouts', () => {
      const layouts = store.dashboardChartLayouts;
      expect(layouts).toBeDefined();
      expect(typeof layouts).toBe('object');
    });

    test('should update dashboard layout', () => {
      const newLayout: Layout[] = [
        {
          i: '0', x: 0, y: 0, w: 3, h: 1, maxH: 2,
        },
      ];

      store.updateDashboardLayout({ main: newLayout });
      expect(store.dashboardChartLayouts.main).toEqual(newLayout);
    });

    test('should set entire chart layouts', () => {
      const layouts = {
        main: [{
          i: '0', x: 0, y: 0, w: 2, h: 2, maxH: 2,
        }],
      };
      store.dashboardChartLayouts = layouts;
      expect(store.dashboardChartLayouts).toEqual(layouts);
    });
  });

  describe('Filter Management', () => {
    test('should update a filter value', () => {
      const dateFrom = '2020-01-01';
      store.actions.updateFilter('dateFrom', dateFrom);
      expect(store.state.filterValues.dateFrom).toBe(dateFrom);
    });

    test('should update blood component filters', () => {
      const filters = { rbc_units: [0, 100] as [number, number] };
      store.actions.updateFilter('rbc_units', filters.rbc_units);
      expect(store.state.filterValues.rbc_units).toEqual(filters.rbc_units);
    });

    test('should reset all filters to initial values', () => {
      store.actions.updateFilter('rbc_units', [50, 200] as [number, number]);
      store.actions.resetAllFilters();

      const state = store.state.filterValues;
      expect(state.rbc_units[0]).toBe(0);
      expect(state.rbc_units[1]).toBeGreaterThan(0);
    });

    test('should update procedure filters', () => {
      const filters = { departments: ['ICU', 'OR'], procedureIds: ['proc1', 'proc2'] };
      store.actions.updateProcedureFilters(filters);
      expect(store.state.filterValues.departments).toEqual(filters.departments);
      expect(store.state.filterValues.procedureIds).toEqual(filters.procedureIds);
    });
  });

  describe('Selection Management', () => {
    test('should get selected time periods', () => {
      const periods = store.selectedTimePeriods;
      expect(Array.isArray(periods)).toBe(true);
    });

    test('should update selection with time periods', () => {
      const periods = ['2024-Jan', '2024-Feb'];
      store.actions.updateSelection(periods);
      expect(store.state.selections.selectedTimePeriods).toEqual(periods);
    });

    test('should clear all selections', () => {
      store.actions.updateSelection(['2024-Jan', '2024-Feb']);
      store.actions.clearSelection();
      expect(store.state.selections.selectedTimePeriods).toHaveLength(0);
    });

    test('should track selected visits', () => {
      const visits = [{ visit_no: 1, patient_id: '123' }];
      store.selectedVisits = visits;
      expect(store.selectedVisits).toEqual(visits);
    });
  });

  describe('Unit Costs Management', () => {
    test('should get unit costs', () => {
      const costs = store.unitCosts;
      expect(costs).toBeDefined();
      expect(typeof costs).toBe('object');
    });

    test('should set unit costs', () => {
      const newCosts = {
        rbc_units_cost: 100,
        ffp_units_cost: 150,
        plt_units_cost: 120,
        cryo_units_cost: 160,
        whole_cost: 180,
        cell_saver_cost: 200,
      };

      store.unitCosts = newCosts;
      expect(store.unitCosts).toMatchObject(newCosts);
    });
  });

  describe('State Equality', () => {
    test('should compare identical states as equal', () => {
      const stateA = store.getBaseInitialState();
      const stateB = store.getBaseInitialState();
      expect(store.areStatesEqual(stateA, stateB)).toBe(true);
    });

    test('should detect difference in filters', () => {
      const stateA = store.getBaseInitialState();
      const stateB = store.getBaseInitialState();
      stateB.filterValues.rbc_units = [10, 100];
      expect(store.areStatesEqual(stateA, stateB)).toBe(false);
    });

    test('should detect difference in dashboard config', () => {
      const stateA = store.getBaseInitialState();
      const stateB = store.getBaseInitialState();
      stateB.dashboard.chartConfigs = [];
      expect(store.areStatesEqual(stateA, stateB)).toBe(false);
    });

    test('should detect difference in selections', () => {
      const stateA = store.getBaseInitialState();
      const stateB = store.getBaseInitialState();
      stateB.selections.selectedTimePeriods = ['2024-01'];
      expect(store.areStatesEqual(stateA, stateB)).toBe(false);
    });

    test('should detect difference in unit costs', () => {
      const stateA = store.getBaseInitialState();
      const stateB = store.getBaseInitialState();
      stateB.settings.unitCosts.rbc_units_cost = 50;
      expect(store.areStatesEqual(stateA, stateB)).toBe(false);
    });
  });

  describe('Histogram Data Accessors', () => {
    test('should get RBC units histogram data', () => {
      store.histogramData.rbc_units = [{ units: '1', count: 5 }, { units: '2', count: 3 }];
      expect(store.rbc_unitsHistogramData).toBeDefined();
      expect(store.rbc_unitsHistogramData).toHaveLength(2);
    });

    test('should get FFP units histogram data', () => {
      store.histogramData.ffp_units = [{ units: '1', count: 2 }];
      expect(store.ffp_unitsHistogramData).toBeDefined();
      expect(store.ffp_unitsHistogramData).toHaveLength(1);
    });

    test('should get PLT units histogram data', () => {
      store.histogramData.plt_units = [{ units: '3', count: 7 }];
      expect(store.plt_unitsHistogramData).toBeDefined();
    });

    test('should get CRYO units histogram data', () => {
      store.histogramData.cryo_units = [{ units: '0', count: 10 }];
      expect(store.cryo_unitsHistogramData).toBeDefined();
    });

    test('should get cell saver ML histogram data', () => {
      store.histogramData.cell_saver_ml = [{ units: '500', count: 4 }];
      expect(store.cell_saver_mlHistogramData).toBeDefined();
    });

    test('should get LOS histogram data', () => {
      store.histogramData.los = [{ units: '5', count: 8 }];
      expect(store.losHistogramData).toBeDefined();
    });

    test('should get histogram by blood product key', () => {
      store.histogramData.rbc_units = [{ units: '1', count: 5 }];
      const data = store.getHistogramData('rbc_units');
      expect(data).toBeDefined();
      expect(data).toHaveLength(1);
    });
  });

  describe('Visit Count Tracking', () => {
    test('should track all visits length', () => {
      store.allVisitsLength = 1000;
      expect(store.allVisitsLength).toBe(1000);
    });

    test('should track filtered visits length', () => {
      store.filteredVisitsLength = 500;
      expect(store.filteredVisitsLength).toBe(500);
    });

    test('should initialize visit counts to zero', () => {
      const newStore = new RootStore();
      expect(newStore.allVisitsLength).toBe(0);
      expect(newStore.filteredVisitsLength).toBe(0);
    });
  });

  describe('Department View State', () => {
    test('should track department view questions opened state', () => {
      expect(store.departmentViewQuestionsOpened).toBe(true);
      store.departmentViewQuestionsOpened = false;
      expect(store.departmentViewQuestionsOpened).toBe(false);
    });

    test('should toggle department view questions', () => {
      const initial = store.departmentViewQuestionsOpened;
      store.toggleDepartmentViewQuestions();
      expect(store.departmentViewQuestionsOpened).toBe(!initial);
    });

    test('should track department view questions width', () => {
      expect(store.departmentViewQuestionsWidth).toBe(380);
      store.setDepartmentViewQuestionsWidth(400);
      expect(store.departmentViewQuestionsWidth).toBe(400);
    });

    test('should track active department view question', () => {
      expect(store.activeDepartmentViewQuestion).toBeNull();
      store.activeDepartmentViewQuestion = 'question-1';
      expect(store.activeDepartmentViewQuestion).toBe('question-1');
    });
  });

  describe('Department State Management', () => {
    test('should initialize department chart configs', () => {
      expect(Array.isArray(store.departmentInitialChartConfigs)).toBe(true);
    });

    test('should initialize department chart layouts', () => {
      expect(store.departmentInitialChartLayouts).toBeDefined();
      expect(typeof store.departmentInitialChartLayouts).toBe('object');
    });

    test('should update department state', () => {
      const newConfigs: DepartmentChartConfig[] = [
        {
          chartId: 'department-1',
          title: 'Test Department Table',
          chartType: 'departmentTable',
          rowVar: 'quarter',
          columns: [],
          aggregation: 'sum',
        },
      ];
      store.actions.updateDepartmentState({ chartConfigs: newConfigs });
      expect(store.state.department.chartConfigs).toEqual(newConfigs);
    });

    test('should track department stat data', () => {
      expect(store.departmentStatData).toBeDefined();
      expect(typeof store.departmentStatData).toBe('object');
    });
  });

  describe('Procedure Hierarchy', () => {
    test('should initialize procedure hierarchy as null', () => {
      expect(store.procedureHierarchy).toBeNull();
    });

    test('should set procedure hierarchy', () => {
      const hierarchy = {
        version: '1',
        source: 'test',
        department_level: 'department' as const,
        procedure_level: 'procedure' as const,
        departments: [
          {
            id: 'dept1', name: 'Department 1', visit_count: 0, procedures: [],
          },
        ],
      };
      store.procedureHierarchy = hierarchy;
      expect(store.procedureHierarchy).toEqual(hierarchy);
    });
  });

  describe('Selected Visits', () => {
    test('should initialize selected visit numbers as empty array', () => {
      expect(Array.isArray(store.selectedVisitNos)).toBe(true);
      expect(store.selectedVisitNos).toHaveLength(0);
    });

    test('should update selected visit numbers', () => {
      store.selectedVisitNos = [1, 2, 3];
      expect(store.selectedVisitNos).toEqual([1, 2, 3]);
    });

    test('should track selected visits with data', () => {
      const visits = [
        { visit_no: 1, patient_id: '123', age: 45 },
        { visit_no: 2, patient_id: '456', age: 67 },
      ];
      store.selectedVisits = visits;
      expect(store.selectedVisits).toHaveLength(2);
      expect(store.selectedVisits[0].visit_no).toBe(1);
    });
  });

  describe('UI State Management', () => {
    test('should get UI state', () => {
      const { uiState } = store;
      expect(uiState).toBeDefined();
      expect(uiState.activeTab).toBe('Hospital');
    });

    test('should set UI state', () => {
      store.actions.setUiState({ activeTab: 'Provider' });
      expect(store.uiState.activeTab).toBe('Provider');
    });

    test('should toggle private mode', () => {
      const initial = store.uiState.isInPrivateMode;
      store.actions.togglePrivateMode();
      expect(store.uiState.isInPrivateMode).toBe(!initial);
    });

    test('should track department view department selection', () => {
      expect(store.uiState.departmentViewDepartment).toBeNull();
      store.actions.setUiState({ departmentViewDepartment: 'Cardiology' });
      expect(store.uiState.departmentViewDepartment).toBe('Cardiology');
    });

    test('should track left toolbar opened state', () => {
      expect(typeof store.uiState.leftToolbarOpened).toBe('boolean');
    });

    test('should track selected visit number in UI', () => {
      expect(store.uiState.selectedVisitNo).toBeNull();
      store.actions.setUiState({ selectedVisitNo: 123 });
      expect(store.uiState.selectedVisitNo).toBe(123);
    });
  });

  describe('Chart Data Accessors', () => {
    test('should get dashboard chart data', () => {
      expect(store.dashboardChartData).toBeDefined();
      expect(typeof store.dashboardChartData).toBe('object');
    });

    test('should set dashboard chart data', () => {
      const chartData = {
        chart1: { timePeriod: 'Jan', value: 100 },
      };
      store.dashboardChartData = chartData;
      expect(store.dashboardChartData).toEqual(chartData);
    });

    test('should get dashboard stat data', () => {
      expect(store.dashboardStatData).toBeDefined();
      expect(typeof store.dashboardStatData).toBe('object');
    });

    test('should set dashboard stat data', () => {
      const statData = {
        stat1: { value: 42.5 },
      };
      store.dashboardStatData = statData;
      expect(store.dashboardStatData).toEqual(statData);
    });
  });

  describe('Initial Filter Values', () => {
    test('should have blood component filter ranges', () => {
      const { _initialFilterValues: initial } = store;
      expect(initial.rbc_units).toEqual([0, MANUAL_INFINITY]);
      expect(initial.ffp_units).toEqual([0, MANUAL_INFINITY]);
      expect(initial.plt_units).toEqual([0, MANUAL_INFINITY]);
      expect(initial.cryo_units).toEqual([0, MANUAL_INFINITY]);
    });

    test('should have boolean medication filters', () => {
      const { _initialFilterValues: initial } = store;
      expect(initial.b12).toBeNull();
      expect(initial.iron).toBeNull();
      expect(initial.antifibrinolytic).toBeNull();
    });

    test('should have outcome filter ranges', () => {
      const { _initialFilterValues: initial } = store;
      expect(initial.los).toEqual([0, MANUAL_INFINITY]);
      expect(initial.death).toBeNull();
      expect(initial.vent).toBeNull();
      expect(initial.stroke).toBeNull();
      expect(initial.ecmo).toBeNull();
    });

    test('should have empty department and procedure arrays', () => {
      const { _initialFilterValues: initial } = store;
      expect(initial.departments).toEqual([]);
      expect(initial.procedureIds).toEqual([]);
    });
  });

  describe('Current State', () => {
    test('should get current state', () => {
      const current = store.currentState;
      expect(current).toBeDefined();
      expect(current.filterValues).toBeDefined();
      expect(current.selections).toBeDefined();
      expect(current.dashboard).toBeDefined();
    });

    test('should get state via state getter', () => {
      const { state } = store;
      expect(state).toEqual(store.currentState);
    });

    test('should update state through actions', () => {
      const dateFrom = '2020-01-01';
      store.actions.updateFilter('dateFrom', dateFrom);
      expect(store.state.filterValues.dateFrom).toBe(dateFrom);
    });

    test('should hydrate a partial application state patch into provenance', () => {
      const originalLayouts = store.currentState.dashboard.chartLayouts;
      const patch: ApplicationStatePatch = {
        filterValues: {
          dateFrom: '2024-01-01T00:00:00.000Z',
        },
        dashboard: {
          chartConfigs: [
            {
              chartId: 'llm-chart-1',
              xAxisVar: 'month',
              yAxisVar: 'rbc_units',
              aggregation: 'avg',
              chartType: 'line',
            },
          ],
        },
        ui: {
          activeTab: 'Provider',
        },
      };

      const applied = store.applyApplicationStatePatch(patch);

      expect(applied).toBe(true);
      expect(store.currentState.filterValues.dateFrom).toBe(patch.filterValues?.dateFrom);
      expect(store.currentState.dashboard.chartConfigs).toEqual(patch.dashboard?.chartConfigs);
      expect(store.currentState.dashboard.chartLayouts).toEqual(originalLayouts);
      expect(store.currentState.ui.activeTab).toBe('Provider');
    });

    test('should synthesize department layouts when the patch only provides chart configs', () => {
      const patch: ApplicationStatePatch = {
        department: {
          chartConfigs: [
            {
              chartId: 'dept-llm-1',
              title: 'Provider Breakdown',
              chartType: 'departmentTable',
              rowVar: 'attending_provider',
              aggregation: 'avg',
              columns: [],
            },
          ],
        },
      };

      const applied = store.applyApplicationStatePatch(patch);

      expect(applied).toBe(true);
      expect(store.currentState.department.chartConfigs).toEqual(patch.department?.chartConfigs);
      expect(store.currentState.department.chartLayouts.main).toHaveLength(1);
      expect(store.currentState.department.chartLayouts.main[0].i).toBe('dept-llm-1');
    });
  });

  describe('Settings Management', () => {
    test('should update settings', () => {
      const costs = {
        rbc_units_cost: 100,
        ffp_units_cost: 150,
        plt_units_cost: 120,
        cryo_units_cost: 160,
        whole_cost: 180,
        cell_saver_cost: 200,
      };
      store.actions.updateSettings(costs);
      expect(store.state.settings.unitCosts).toMatchObject(costs);
    });
  });

  describe('Reset Operations', () => {
    test('should reset date filters', () => {
      const dates = { dateFrom: '2020-01-01', dateTo: '2021-01-01' };
      store.actions.resetDateFilters(dates);
      expect(store.state.filterValues.dateFrom).toBe(dates.dateFrom);
      expect(store.state.filterValues.dateTo).toBe(dates.dateTo);
    });

    test('should reset blood component filters', () => {
      const filters = {
        rbc_units: [0, 100] as [number, number],
        ffp_units: [0, 50] as [number, number],
        plt_units: [0, 150] as [number, number],
        cryo_units: [0, 80] as [number, number],
        cell_saver_ml: [0, 500] as [number, number],
      };
      store.actions.resetBloodComponentFilters(filters);
      expect(store.state.filterValues.rbc_units).toEqual(filters.rbc_units);
    });

    test('should reset medication filters', () => {
      const filters = { b12: true, iron: false, antifibrinolytic: true };
      store.actions.resetMedicationsFilters(filters);
      expect(store.state.filterValues.b12).toBe(true);
      expect(store.state.filterValues.iron).toBe(false);
    });

    test('should reset outcome filters', () => {
      const filters = {
        los: [0, 15] as [number, number],
        death: true,
        vent: false,
        stroke: true,
        ecmo: false,
      };
      store.actions.resetOutcomeFilters(filters);
      expect(store.state.filterValues.los).toEqual(filters.los);
    });

    test('should reset procedure filters', () => {
      const filters = {
        departments: ['ICU', 'OR'],
        procedureIds: ['proc1', 'proc2'],
      };
      store.actions.resetProcedureFilters(filters);
      expect(store.state.filterValues.departments).toEqual(filters.departments);
    });
  });

  describe('Filters Applied Count', () => {
    test('dateFiltersAppliedCount is 0 by default', () => {
      expect(store.dateFiltersAppliedCount).toBe(0);
    });

    test('dateFiltersAppliedCount is 1 after changing dateFrom', () => {
      store.actions.updateFilter('dateFrom', new Date('2020-01-01').toISOString());
      expect(store.dateFiltersAppliedCount).toBe(1);
    });

    test('dateFiltersAppliedCount is 0 when activeTab is Provider', () => {
      store.actions.updateFilter('dateFrom', new Date('2020-01-01').toISOString());
      store.actions.setUiState({ activeTab: 'Provider' });
      expect(store.dateFiltersAppliedCount).toBe(0);
    });

    test('bloodComponentFiltersAppliedCount counts narrowed ranges', () => {
      expect(store.bloodComponentFiltersAppliedCount).toBe(0);
      store.actions.updateFilter('rbc_units', [10, 100]);
      expect(store.bloodComponentFiltersAppliedCount).toBe(1);
      store.actions.updateFilter('ffp_units', [5, 50]);
      expect(store.bloodComponentFiltersAppliedCount).toBe(2);
    });

    test('medicationsFiltersAppliedCount counts non-null medication filters', () => {
      expect(store.medicationsFiltersAppliedCount).toBe(0);
      store.actions.updateFilter('b12', true);
      store.actions.updateFilter('iron', false);
      expect(store.medicationsFiltersAppliedCount).toBe(2);
    });

    test('outcomeFiltersAppliedCount counts narrowed los and non-null booleans', () => {
      expect(store.outcomeFiltersAppliedCount).toBe(0);
      store.actions.updateFilter('los', [0, 30]);
      expect(store.outcomeFiltersAppliedCount).toBe(1);
      store.actions.updateFilter('death', true);
      store.actions.updateFilter('vent', false);
      expect(store.outcomeFiltersAppliedCount).toBe(3);
    });

    test('procedureFiltersAppliedCount counts departments and procedureIds independently', () => {
      expect(store.procedureFiltersAppliedCount).toBe(0);
      store.actions.updateProcedureFilters({ departments: ['ICU'], procedureIds: [] });
      expect(store.procedureFiltersAppliedCount).toBe(1);
      store.actions.updateProcedureFilters({ departments: ['ICU'], procedureIds: ['p1'] });
      expect(store.procedureFiltersAppliedCount).toBe(2);
    });

    test('providerDepartmentAppliedCount unions departments with procedureId prefixes', () => {
      store.actions.updateProcedureFilters({
        departments: ['ICU'],
        procedureIds: ['ICU__proc1', 'OR__proc2', 'noprefix'],
      });
      // ICU (from both) + OR (from procedureId prefix) = 2 unique departments
      expect(store.providerDepartmentAppliedCount).toBe(2);
    });

    test('procedureGroupsAppliedCount is 0 when hierarchy is null', () => {
      store.actions.updateProcedureFilters({ departments: [], procedureIds: ['p1'] });
      expect(store.procedureHierarchy).toBeNull();
      expect(store.procedureGroupsAppliedCount).toBe(0);
    });

    test('procedureGroupsAppliedCount counts groups with at least one selected procedure', () => {
      store.procedureHierarchy = {
        version: '1',
        source: 'test',
        department_level: 'department' as const,
        procedure_level: 'procedure' as const,
        departments: [
          {
            id: 'dept1',
            name: 'Department 1',
            visit_count: 0,
            procedures: [{
              id: 'p1', name: 'Proc 1', visit_count: 0, cpt_codes: [],
            }],
          },
          {
            id: 'dept2',
            name: 'Department 2',
            visit_count: 0,
            procedures: [{
              id: 'p2', name: 'Proc 2', visit_count: 0, cpt_codes: [],
            }],
          },
        ],
      };

      store.actions.updateProcedureFilters({ departments: [], procedureIds: ['p1'] });
      expect(store.procedureGroupsAppliedCount).toBe(1);

      store.actions.updateProcedureFilters({ departments: [], procedureIds: ['p1', 'p2'] });
      expect(store.procedureGroupsAppliedCount).toBe(2);
    });

    test('totalFiltersAppliedCount sums all filter category counts', () => {
      store.actions.updateFilter('dateFrom', new Date('2020-01-01').toISOString());
      store.actions.updateFilter('rbc_units', [10, 100]);
      store.actions.updateFilter('b12', true);
      store.actions.updateFilter('los', [0, 30]);
      store.actions.updateProcedureFilters({ departments: ['ICU'], procedureIds: [] });

      const expected = store.dateFiltersAppliedCount
        + store.bloodComponentFiltersAppliedCount
        + store.medicationsFiltersAppliedCount
        + store.outcomeFiltersAppliedCount
        + store.procedureFiltersAppliedCount;

      expect(store.totalFiltersAppliedCount).toBe(expected);
      expect(store.totalFiltersAppliedCount).toBe(5);
    });
  });

  describe('Saved State Name Generation', () => {
    test('returns "State 1" when only "Initial State" exists', () => {
      expect(store.getNextStateName()).toBe('State 1');
    });

    test('returns "State 2" after saving "State 1"', () => {
      store.saveState('State 1');
      expect(store.getNextStateName()).toBe('State 2');
    });

    test('returns "State N+1" based on the highest existing State number', () => {
      store.saveState('State 5');
      expect(store.getNextStateName()).toBe('State 6');
    });

    test('non-"State N" names do not affect the counter', () => {
      store.saveState('My snapshot');
      expect(store.getNextStateName()).toBe('State 1');
    });
  });

  describe('Selection Time Period Expansion', () => {
    test('adding a year populates 17 entries (year + 4 quarters + 12 months)', async () => {
      await store.addSelectedTimePeriod('2024');
      expect(store.selectedTimePeriods).toHaveLength(17);
      expect(store.selectedTimePeriods).toContain('2024');
      expect(store.selectedTimePeriods).toContain('2024-Q1');
      expect(store.selectedTimePeriods).toContain('2024-Q4');
      expect(store.selectedTimePeriods).toContain('2024-Jan');
      expect(store.selectedTimePeriods).toContain('2024-Dec');
    });

    test('adding a quarter populates the quarter plus its 3 months', async () => {
      await store.addSelectedTimePeriod('2024-Q2');
      expect(store.selectedTimePeriods).toHaveLength(4);
      expect(store.selectedTimePeriods).toEqual(
        expect.arrayContaining(['2024-Q2', '2024-Apr', '2024-May', '2024-Jun']),
      );
    });

    test('adding a month populates exactly that one entry', async () => {
      await store.addSelectedTimePeriod('2024-Jan');
      expect(store.selectedTimePeriods).toEqual(['2024-Jan']);
    });

    test('adding the same year twice does not duplicate entries', async () => {
      await store.addSelectedTimePeriod('2024');
      await store.addSelectedTimePeriod('2024');
      expect(store.selectedTimePeriods).toHaveLength(17);
    });

    test('removing a quarter removes only its sub-periods', async () => {
      await store.addSelectedTimePeriod('2024');
      await store.removeSelectedTimePeriod('2024-Q1');
      // Started with 17 (year + 4 quarters + 12 months); removed Q1 + Jan/Feb/Mar = 4 entries
      expect(store.selectedTimePeriods).toHaveLength(13);
      expect(store.selectedTimePeriods).not.toContain('2024-Q1');
      expect(store.selectedTimePeriods).not.toContain('2024-Jan');
      expect(store.selectedTimePeriods).not.toContain('2024-Feb');
      expect(store.selectedTimePeriods).not.toContain('2024-Mar');
      expect(store.selectedTimePeriods).toContain('2024');
      expect(store.selectedTimePeriods).toContain('2024-Q2');
      expect(store.selectedTimePeriods).toContain('2024-Apr');
    });

    test('adding an empty string is a no-op', async () => {
      await store.addSelectedTimePeriod('');
      expect(store.selectedTimePeriods).toHaveLength(0);
    });
  });

  describe('Department View Width Clamping', () => {
    test('clamps values below 250 up to 250', () => {
      store.setDepartmentViewQuestionsWidth(100);
      expect(store.departmentViewQuestionsWidth).toBe(250);
    });

    test('clamps values above 800 down to 800', () => {
      store.setDepartmentViewQuestionsWidth(1000);
      expect(store.departmentViewQuestionsWidth).toBe(800);
    });

    test('keeps values within range unchanged', () => {
      store.setDepartmentViewQuestionsWidth(500);
      expect(store.departmentViewQuestionsWidth).toBe(500);
    });
  });

  describe('Filter Values Merging', () => {
    test('exposes dateFrom and dateTo as Date instances', () => {
      expect(store.filterValues.dateFrom).toBeInstanceOf(Date);
      expect(store.filterValues.dateTo).toBeInstanceOf(Date);
    });

    test('reflects updated blood-component range while keeping other defaults', () => {
      store.actions.updateFilter('rbc_units', [5, 50]);
      expect(store.filterValues.rbc_units).toEqual([5, 50]);
      expect(store.filterValues.ffp_units).toEqual([0, MANUAL_INFINITY]);
      expect(store.filterValues.b12).toBeNull();
    });

    test('falls back to initial defaults for departments and procedureIds when state is empty', () => {
      // Default state should expose arrays for both
      expect(Array.isArray(store.filterValues.departments)).toBe(true);
      expect(Array.isArray(store.filterValues.procedureIds)).toBe(true);
      expect(store.filterValues.departments).toEqual([]);
      expect(store.filterValues.procedureIds).toEqual([]);
    });
  });
});

describe('Store - ProvidersStore', () => {
  let store: RootStore;

  beforeEach(() => {
    store = new RootStore();
  });

  test('should initialize providers store', () => {
    expect(store.providersStore).toBeDefined();
  });

  test('should have empty provider list initially', () => {
    expect(store.providersStore.providerList).toHaveLength(0);
  });

  test('should initialize chart configs for providers', () => {
    expect(store.providersStore.chartConfigs).toBeDefined();
    expect(Array.isArray(store.providersStore.chartConfigs)).toBe(true);
  });

  test('should have null selected provider initially', () => {
    expect(store.providersStore.selectedProvider).toBeNull();
  });

  test('should initialize provider chart data as empty', () => {
    expect(store.providersStore.providerChartData).toEqual({});
  });
});
