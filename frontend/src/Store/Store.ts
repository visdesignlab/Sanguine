// region Imports
import {
  makeAutoObservable, reaction, runInAction, observable, computed,
} from 'mobx';
import { createContext } from 'react';
import { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import { initProvenance, Provenance, NodeID } from '@visdesignlab/trrack';
import LZString from 'lz-string';
import { Layout } from 'react-grid-layout';
// @ts-expect-error: rgl utils not typed
import { compact } from 'react-grid-layout/build/utils';

import {
  AGGREGATION_OPTIONS,
  Cost,
  DashboardAggYAxisVar,
  DashboardChartConfig,
  DashboardChartData,
  DashboardStatConfig,
  DashboardStatData,
  ExploreChartConfig,
  ExploreChartData,
  TimeAggregation,
  TimePeriod,
  dashboardXAxisVars,
  dashboardYAxisOptions,
  DEFAULT_UNIT_COSTS,
} from '../Types/application';
import { compareTimePeriods, safeParseDate } from '../Utils/dates';
import { formatValueForDisplay } from '../Utils/dashboard';
import { expandTimePeriod } from '../Utils/expandTimePeriod';

// endregion

// region Constants
export const DEFAULT_CHART_LAYOUTS: { [key: string]: Layout[] } = {
  main: [
    {
      i: '0', x: 0, y: 0, w: 2, h: 1, maxH: 2,
    },
    {
      i: '1', x: 0, y: 1, w: 1, h: 1, maxH: 2,
    },
    {
      i: '2', x: 1, y: 1, w: 1, h: 1, maxH: 2,
    },
  ],
};

export const DEFAULT_CHART_CONFIGS: DashboardChartConfig[] = [
  {
    chartId: '0', xAxisVar: 'month', yAxisVar: 'rbc_units', aggregation: 'sum', chartType: 'line',
  },
  {
    chartId: '1', xAxisVar: 'quarter', yAxisVar: 'los', aggregation: 'avg', chartType: 'line',
  },
  {
    chartId: '2', xAxisVar: 'quarter', yAxisVar: 'total_blood_product_cost', aggregation: 'sum', chartType: 'bar',
  },
];

export const DEFAULT_STAT_CONFIGS: DashboardStatConfig[] = [
  {
    statId: '1', yAxisVar: 'rbc_units', aggregation: 'avg', title: 'Average RBCs Transfused Per Visit',
  },
  {
    statId: '2', yAxisVar: 'plt_units', aggregation: 'avg', title: 'Average Platelets Transfused Per Visit',
  },
  {
    statId: '3', yAxisVar: 'cell_saver_ml', aggregation: 'sum', title: 'Total Cell Salvage Volume (ml) Used',
  },
  {
    statId: '4', yAxisVar: 'total_blood_product_cost', aggregation: 'sum', title: 'Total Blood Product Costs',
  },
  {
    statId: '5', yAxisVar: 'rbc_adherent', aggregation: 'avg', title: 'Guideline Adherent RBC Transfusions',
  },
  {
    statId: '6', yAxisVar: 'plt_adherent', aggregation: 'avg', title: 'Guideline Adherent Platelet Transfusions',
  },
];
// endregion

// region Types
export interface ApplicationState {
  filterValues: {
    dateFrom: string; // Store dates as strings in Trrack
    dateTo: string;
    rbc_units: [number, number];
    ffp_units: [number, number];
    plt_units: [number, number];
    cryo_units: [number, number];
    cell_saver_ml: [number, number];
    b12: boolean | null;
    iron: boolean | null;
    antifibrinolytic: boolean | null;
    los: [number, number];
    death: boolean | null;
    vent: boolean | null;
    stroke: boolean | null;
    ecmo: boolean | null;
  };
  selections: {
    selectedTimePeriods: string[];
  };
  dashboard: {
    chartConfigs: DashboardChartConfig[];
    statConfigs: DashboardStatConfig[];
    chartLayouts: { [key: string]: Layout[] };
  };
  explore: {
    chartConfigs: ExploreChartConfig[];
    chartLayouts: { [key: string]: Layout[] };
  };
  settings: {
    unitCosts: Record<Cost, number>;
  };
  ui: {
    activeTab: string;
    leftToolbarOpened: boolean;
    activeLeftPanel: number | null;
    selectedVisitNo: number | null;
    filterPanelExpandedItems: string[];
    showFilterHistograms: boolean;
  };
}

export interface StateAnnotation {
  type: string;
  value: string;
}
// endregion

export class RootStore {
  // region Initial State
  provenance: Provenance<ApplicationState, string, StateAnnotation> | null = null;

  graphVersion = 0;

  deletedStateIds: Set<NodeID> = new Set();

  duckDB: AsyncDuckDBConnection | null = null;

  // --- Dashboard State ---
  _baseDashboardLayouts: { [key: string]: Layout[] } | null = null;

  dashboardChartData: DashboardChartData = {} as DashboardChartData;

  dashboardStatData: DashboardStatData = {} as DashboardStatData;

  // --- Explore State ---
  exploreInitialChartConfigs: ExploreChartConfig[] = [];

  exploreInitialChartLayouts: { [key: string]: Layout[] } = { main: [] };

  _transientExploreLayouts: { [key: string]: Layout[] } | null = null;

  exploreDummyData: ExploreChartData = {
    sum_post_op_hgb_cell_saver_ml: [
      {
        name: 'Anesth 101',
        color: 'blue',
        data: [
          { cell_saver_ml: 50, post_op_hgb: 11.2 },
          { cell_saver_ml: 120, post_op_hgb: 10.8 },
          { cell_saver_ml: 180, post_op_hgb: 10.5 },
          { cell_saver_ml: 240, post_op_hgb: 10.1 },
          { cell_saver_ml: 310, post_op_hgb: 9.7 },
          { cell_saver_ml: 400, post_op_hgb: 9.4 },
        ],
      },
      {
        name: 'Anesth 204',
        color: 'teal',
        data: [
          { cell_saver_ml: 40, post_op_hgb: 12.0 },
          { cell_saver_ml: 90, post_op_hgb: 11.6 },
          { cell_saver_ml: 150, post_op_hgb: 11.1 },
          { cell_saver_ml: 200, post_op_hgb: 10.9 },
          { cell_saver_ml: 270, post_op_hgb: 10.2 },
          { cell_saver_ml: 350, post_op_hgb: 9.9 },
        ],
      },
      {
        name: 'Anesth 317',
        color: 'grape',
        data: [
          { cell_saver_ml: 30, post_op_hgb: 12.5 },
          { cell_saver_ml: 70, post_op_hgb: 12.1 },
          { cell_saver_ml: 110, post_op_hgb: 11.7 },
          { cell_saver_ml: 160, post_op_hgb: 11.3 },
          { cell_saver_ml: 220, post_op_hgb: 10.8 },
          { cell_saver_ml: 300, post_op_hgb: 10.4 },
        ],
      },
    ],
    sum_surgeon_prov_id_cost: [
      {
        surgeon_prov_id: 'Dr. Smith',
        rbc_units_cost: 600,
        ffp_units_cost: 950,
        plt_units_cost: 900,
        cryo_units_cost: 850,
        cell_saver_cost: 800,
      },
      {
        surgeon_prov_id: 'Dr. Lee',
        rbc_units_cost: 400,
        ffp_units_cost: 800,
        plt_units_cost: 750,
        cryo_units_cost: 700,
        cell_saver_cost: 650,
      },
      {
        surgeon_prov_id: 'Dr. Patel',
        rbc_units_cost: 700,
        ffp_units_cost: 1000,
        plt_units_cost: 950,
        cryo_units_cost: 900,
        cell_saver_cost: 850,
      },
      {
        surgeon_prov_id: 'Dr. Jones',
        rbc_units_cost: 300,
        ffp_units_cost: 700,
        plt_units_cost: 650,
        cryo_units_cost: 600,
        cell_saver_cost: 550,
      },
    ],
  };

  exploreChartData: ExploreChartData = { ...this.exploreDummyData };

  // --- Filters State ---
  _initialFilterValues = {
    dateFrom: new Date(new Date().getFullYear() - 5, 0, 1),
    dateTo: new Date(),
    rbc_units: [0, Number.MAX_SAFE_INTEGER] as [number, number],
    ffp_units: [0, Number.MAX_SAFE_INTEGER] as [number, number],
    plt_units: [0, Number.MAX_SAFE_INTEGER] as [number, number],
    cryo_units: [0, Number.MAX_SAFE_INTEGER] as [number, number],
    cell_saver_ml: [0, Number.MAX_SAFE_INTEGER] as [number, number],
    b12: null as boolean | null,
    iron: null as boolean | null,
    antifibrinolytic: null as boolean | null,
    los: [0, Number.MAX_SAFE_INTEGER] as [number, number],
    death: null as boolean | null,
    vent: null as boolean | null,
    stroke: null as boolean | null,
    ecmo: null as boolean | null,
  };

  histogramData: Record<string, { units: string, count: number }[] | undefined> = {};

  get rbc_unitsHistogramData() { return this.histogramData.rbc_units; }

  get ffp_unitsHistogramData() { return this.histogramData.ffp_units; }

  get plt_unitsHistogramData() { return this.histogramData.plt_units; }

  get cryo_unitsHistogramData() { return this.histogramData.cryo_units; }

  get cell_saver_mlHistogramData() { return this.histogramData.cell_saver_ml; }

  get losHistogramData() { return this.histogramData.los; }

  // --- Selections State ---
  selectedVisits: { visit_no: number, [key: string]: unknown }[] = [];

  selectedVisitNos: number[] = [];

  // --- Common ---
  allVisitsLength = 0;

  filteredVisitsLength = 0;
  // endregion

  // region Constructor
  constructor() {
    makeAutoObservable(this, {
      provenance: false,
      graphVersion: observable,
      savedStates: computed,
      canUndo: computed,
      canRedo: computed,
      currentState: computed,
      uiState: computed,
      dashboardChartData: observable.ref,
      exploreChartData: observable.ref,
      selectedVisits: observable.ref,
      selectedVisitNos: observable.ref,
    });

    this.initReactions();
  }

  // --- Common Helpers ---
  get state() {
    return this.currentState;
  }
  // endregion

  // region Actions ---
  actions = {
    updateFilter: (filterKey: keyof ApplicationState['filterValues'], value: ApplicationState['filterValues'][typeof filterKey]) => {
      this.applyAction(`Update Filter: ${filterKey}`, (state, val) => ({
        ...state,
        filterValues: {
          ...state.filterValues,
          ...val,
        },
      }), { [filterKey]: value });
    },
    resetAllFilters: () => {
      this.applyAction('Reset All Filters', (state) => {
        const initial = this.initialFilterValues;

        // Deep copy to avoid reference issues
        const initialFiltersStringified = JSON.parse(JSON.stringify({
          dateFrom: initial.dateFrom.toISOString(),
          dateTo: initial.dateTo.toISOString(),
          rbc_units: initial.rbc_units,
          ffp_units: initial.ffp_units,
          plt_units: initial.plt_units,
          cryo_units: initial.cryo_units,
          cell_saver_ml: initial.cell_saver_ml,
          b12: initial.b12,
          iron: initial.iron,
          antifibrinolytic: initial.antifibrinolytic,
          los: initial.los,
          death: initial.death,
          vent: initial.vent,
          stroke: initial.stroke,
          ecmo: initial.ecmo,
        }));

        return {
          ...state,
          filterValues: initialFiltersStringified,
        };
      }, null);
    },
    updateSelection: (timePeriods: string[]) => {
      this.applyAction('Update Selection', (state, periods) => ({
        ...state,
        selections: {
          ...state.selections,
          selectedTimePeriods: periods,
        },
      }), timePeriods);
    },
    updateDashboardState: (dashboardState: Partial<ApplicationState['dashboard']>, label: string = 'Update Dashboard') => {
      this.applyAction(label, (state, partial) => ({
        ...state,
        dashboard: {
          ...state.dashboard,
          ...partial,
        },
      }), dashboardState);
    },
    setUiState: (partialUiState: Partial<ApplicationState['ui']>) => {
      this.applyAction('Update UI State', (state, partial) => ({
        ...state,
        ui: {
          ...state.ui,
          ...partial,
        },
      }), partialUiState);
    },
    updateExploreState: (exploreState: Partial<ApplicationState['explore']>, label: string = 'Update Explore State') => {
      this.applyAction(label, (state, partial) => ({
        ...state,
        explore: {
          ...state.explore,
          ...partial,
        },
      }), exploreState);
    },
    updateSettings: (unitCosts: Record<Cost, number>) => {
      this.applyAction('Update Settings', (state, costs) => ({
        ...state,
        settings: {
          ...state.settings,
          unitCosts: costs,
        },
      }), unitCosts);
    },
    resetDateFilters: (initialDates: { dateFrom: string, dateTo: string }) => {
      this.applyAction('Reset Date Filters', (state, dates) => ({
        ...state,
        filterValues: {
          ...state.filterValues,
          dateFrom: dates.dateFrom,
          dateTo: dates.dateTo,
        },
      }), initialDates);
    },
    resetBloodComponentFilters: (initialFilters: Pick<ApplicationState['filterValues'], 'rbc_units' | 'ffp_units' | 'plt_units' | 'cryo_units' | 'cell_saver_ml'>) => {
      this.applyAction('Reset Blood Component Filters', (state, filters) => ({
        ...state,
        filterValues: {
          ...state.filterValues,
          ...filters,
        },
      }), initialFilters);
    },
    resetMedicationsFilters: (initialFilters: Pick<ApplicationState['filterValues'], 'b12' | 'iron' | 'antifibrinolytic'>) => {
      this.applyAction('Reset Medication Filters', (state, filters) => ({
        ...state,
        filterValues: {
          ...state.filterValues,
          ...filters,
        },
      }), initialFilters);
    },
    resetOutcomeFilters: (initialFilters: Pick<ApplicationState['filterValues'], 'los' | 'death' | 'vent' | 'stroke' | 'ecmo'>) => {
      this.applyAction('Reset Outcome Filters', (state, filters) => ({
        ...state,
        filterValues: {
          ...state.filterValues,
          ...filters,
        },
      }), initialFilters);
    },
  };
  // endregion

  // region Provenance
  /**
   * Initialize the provenance store with current store values.
   * This should be called after data is loaded and default filter values are calculated.
   */
  init() {
    if (this.provenance) {
      console.warn('ProvenanceStore already initialized');
      return;
    }
    const rawInitialState: ApplicationState = {
      filterValues: {
        dateFrom: this.initialFilterValues.dateFrom.toISOString(),
        dateTo: this.initialFilterValues.dateTo.toISOString(),
        rbc_units: [...this.initialFilterValues.rbc_units],
        ffp_units: [...this.initialFilterValues.ffp_units],
        plt_units: [...this.initialFilterValues.plt_units],
        cryo_units: [...this.initialFilterValues.cryo_units],
        cell_saver_ml: [...this.initialFilterValues.cell_saver_ml],
        b12: this.initialFilterValues.b12,
        iron: this.initialFilterValues.iron,
        antifibrinolytic: this.initialFilterValues.antifibrinolytic,
        los: [...this.initialFilterValues.los],
        death: this.initialFilterValues.death,
        vent: this.initialFilterValues.vent,
        stroke: this.initialFilterValues.stroke,
        ecmo: this.initialFilterValues.ecmo,
      },
      selections: {
        selectedTimePeriods: [],
      },
      dashboard: {
        chartConfigs: JSON.parse(JSON.stringify(DEFAULT_CHART_CONFIGS || [])),
        statConfigs: JSON.parse(JSON.stringify(DEFAULT_STAT_CONFIGS || [])),
        chartLayouts: JSON.parse(JSON.stringify(DEFAULT_CHART_LAYOUTS || {})),
      },
      explore: {
        chartConfigs: JSON.parse(JSON.stringify(this.exploreInitialChartConfigs || [])),
        chartLayouts: JSON.parse(JSON.stringify(this.exploreInitialChartLayouts || {})),
      },
      settings: {
        unitCosts: { ...DEFAULT_UNIT_COSTS },
      },
      ui: {
        activeTab: 'Dashboard',
        leftToolbarOpened: true,
        activeLeftPanel: null,
        selectedVisitNo: null,
        filterPanelExpandedItems: ['date-filters', 'blood-component-filters'],
        showFilterHistograms: false,
      },
    };

    const initialState = JSON.parse(JSON.stringify(rawInitialState));

    // Create new provenance instance
    this.provenance = initProvenance<ApplicationState, string, StateAnnotation>(initialState, {
      loadFromUrl: true,
    });

    // Set up observer
    this.provenance.addGlobalObserver((_graph, _changeType) => {
      runInAction(() => {
        this.graphVersion += 1;
      });
    });

    this.provenance.done();

    // Check for provState key
    const hasUrlParam = window.location.search.includes('provState') || window.location.hash.includes('provState');

    if (this.provenance.current.id === this.provenance.root.id && !hasUrlParam) {
      this.provenance.apply({
        apply: (state: ApplicationState) => ({
          state,
          label: 'Initial State',
          stateSaveMode: 'Complete',
          actionType: 'Regular',
          eventType: 'Regular',
          event: 'Initial State',
        } as any),
      }, 'Initial State');
    }
  }

  /**
   * Helper to apply an action to the provenance graph reducing boilerplate.
   */
  applyAction<T>(
    label: string,
    updater: (state: ApplicationState, payload: T) => ApplicationState,
    payload: T,
  ) {
    if (!this.provenance) return;
    this.provenance.apply({
      apply: (state: ApplicationState) => {
        const newState = updater(state, payload);
        return {
          state: newState,
          label,
          stateSaveMode: 'Complete',
          actionType: 'Regular',
          eventType: 'Regular',
          event: label,
        } as any;
      },
    }, label);
  }

  // Save/Restore --------------------------------------------------------------

  saveState(name: string, screenshot?: string) {
    if (!this.provenance) return;
    const currentNodeId = this.provenance.current.id;
    this.provenance.addArtifact({ type: 'name', value: name }, currentNodeId);
    if (screenshot) {
      this.provenance.addArtifact({ type: 'screenshot', value: screenshot }, currentNodeId);
    }

    // Trigger reactivity so UI updates
    runInAction(() => {
      this.graphVersion += 1;
    });
  }

  removeState(nodeId: NodeID) {
    this.deletedStateIds.add(nodeId);
    // Trigger reactivity
    runInAction(() => {
      this.graphVersion += 1;
    });
  }

  renameState(nodeId: NodeID, newName: string) {
    if (!this.provenance) return;
    this.provenance.addArtifact({ type: 'name', value: newName }, nodeId);
    // Trigger reactivity
    runInAction(() => {
      this.graphVersion += 1;
    });
  }

  get savedStates() {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.graphVersion;

    const { provenance } = this;
    // Return a list of nodes that have the 'name' artifact
    if (!provenance) return [];
    const nodes = Object.values(provenance.graph.nodes);

    return nodes.filter((node) => {
      if (this.deletedStateIds.has(node.id)) return false;
      const artifacts = provenance.getAllArtifacts(node.id);
      return artifacts.some((a) => a.artifact.type === 'name');
    })
      .map((node) => {
        const artifacts = provenance.getAllArtifacts(node.id);
        // Find the latest name artifact
        const nameArtifact = artifacts.filter((a) => a.artifact.type === 'name').pop();
        const screenshotArtifact = artifacts.find((a) => a.artifact.type === 'screenshot');
        return {
          id: node.id,
          name: nameArtifact?.artifact.value,
          screenshot: screenshotArtifact?.artifact.value,
          timestamp: (node as any).createdOn || node.metadata?.createdOn || 0, // eslint-disable-line @typescript-eslint/no-explicit-any
        };
      });
  }

  get canUndo() {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.graphVersion;

    if (!this.provenance) return false;
    const { current } = this.provenance;
    const { root } = this.provenance;

    // Disable undo if at root OR if at the "Initial State" node (our artificial root)
    return current.id !== root.id && current.label !== 'Initial State';
  }

  get canRedo() {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.graphVersion;

    if (!this.provenance) return false;
    const { current } = this.provenance;
    return current.children.length > 0;
  }

  get currentState(): ApplicationState {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.graphVersion;

    if (!this.provenance) {
      // Return default/empty state if not initialized
      return {
        filterValues: {},
        selections: {},
        dashboard: {},
        explore: {},
        settings: {},
        ui: {
          activeTab: 'Dashboard',
          leftToolbarOpened: true,
          activeLeftPanel: null,
          selectedVisitNo: null,
          filterPanelExpandedItems: [],
          showFilterHistograms: false,
        },
      } as unknown as ApplicationState;
    }
    return this.provenance.getState(this.provenance.current);
  }

  get uiState() {
    return this.currentState.ui;
  }

  restoreState(nodeId: NodeID) {
    if (!this.provenance) return;
    this.provenance.goToNode(nodeId);
  }

  restoreToInitialState() {
    if (!this.provenance) return;

    // Find the node labeled "Initial State"
    const nodes = Object.values(this.provenance.graph.nodes);
    const initialNode = nodes.find((n) => n.label === 'Initial State');

    if (initialNode) {
      this.provenance.goToNode(initialNode.id);
    } else {
      console.error("Could not find 'Initial State' node to restore to.");
    }
  }

  getShareUrl(nodeId: NodeID): string | null {
    if (!this.provenance) return null;

    const state = this.provenance.getState(nodeId);

    // Try accessing Trrack's serializer, fallback to manual LZString
    let serializedState: string | null = null;
    const serializer = (this.provenance.config as any)._serializer; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (serializer) {
      serializedState = serializer(state);
    } else {
      console.warn('⚠️ [ProvenanceStore] Serializer not found on config. Using fallback LZString.');
      try {
        serializedState = LZString.compressToEncodedURIComponent(JSON.stringify(state));
      } catch (e) {
        console.error('Error serializing state:', e);
      }
    }

    if (serializedState) {
      const baseUrl = window.location.origin + window.location.pathname;
      return `${baseUrl}?config=${serializedState}`;
    }
    return null;
  }
  // endregion

  // region Computed Accessors
  get unitCosts() {
    const { state } = this;
    return (state && state.settings && state.settings.unitCosts) ? state.settings.unitCosts : DEFAULT_UNIT_COSTS;
  }

  set unitCosts(costs: Record<Cost, number>) {
    this.actions.updateSettings(costs);
  }

  get selectedTimePeriods() {
    return this.state.selections.selectedTimePeriods;
  }
  // endregion

  // region Dashboard

  get dashboardChartLayouts() {
    if (this._baseDashboardLayouts) {
      return this._baseDashboardLayouts;
    }
    const { state } = this;
    return (state && state.dashboard && state.dashboard.chartLayouts) ? state.dashboard.chartLayouts : DEFAULT_CHART_LAYOUTS;
  }

  set dashboardChartLayouts(input: { [key: string]: Layout[] }) {
    if (this.state.ui.activeTab !== 'Dashboard') return;
    this._baseDashboardLayouts = input;
  }

  updateDashboardLayout(input: { [key: string]: Layout[] }) {
    this.actions.updateDashboardState({ chartLayouts: input }, 'Update Dashboard Layout');
    this._baseDashboardLayouts = null;
  }

  get dashboardChartConfigs() {
    const { state } = this;
    return (state && state.dashboard && state.dashboard.chartConfigs) ? state.dashboard.chartConfigs : DEFAULT_CHART_CONFIGS;
  }

  set dashboardChartConfigs(input: DashboardChartConfig[]) {
    this.actions.updateDashboardState({ chartConfigs: input }, 'Update Dashboard Config');
  }

  get dashboardStatConfigs() {
    const { state } = this;
    return (state && state.dashboard && state.dashboard.statConfigs) ? state.dashboard.statConfigs : DEFAULT_STAT_CONFIGS;
  }

  set dashboardStatConfigs(input: DashboardStatConfig[]) {
    this.actions.updateDashboardState({ statConfigs: input }, 'Update Stat Configs');
  }

  setDashboardChartConfig(chartId: string, input: DashboardChartConfig) {
    const currentConfigs = this.dashboardChartConfigs;
    const newConfigs = currentConfigs.map((config) => {
      if (config.chartId === chartId) return { ...config, ...input };
      return config;
    });
    this.actions.updateDashboardState({ chartConfigs: newConfigs }, 'Update Dashboard Config');
  }

  removeDashboardChart(chartId: string) {
    const currentLayouts = this.dashboardChartLayouts;
    const currentConfigs = this.dashboardChartConfigs;
    const filteredMain = (currentLayouts.main || []).filter((layout) => layout.i !== chartId);
    const filteredSm = (currentLayouts.sm || []).filter((layout) => layout.i !== chartId);

    const newLayouts = {
      main: compact(filteredMain, 'vertical', 2),
      sm: compact(filteredSm, 'vertical', 1),
    };
    const newConfigs = currentConfigs.filter((config) => config.chartId !== chartId);
    this.actions.updateDashboardState({ chartConfigs: newConfigs, chartLayouts: newLayouts }, 'Remove Chart');
  }

  addDashboardChart(config: DashboardChartConfig) {
    const currentConfigs = this.dashboardChartConfigs;
    const currentLayouts = this.dashboardChartLayouts;
    const newConfigs = [config, ...currentConfigs];

    const newMainLayouts = currentLayouts.main.map((layout) => ({ ...layout, y: layout.y + 1 }));
    newMainLayouts.unshift({
      i: config.chartId, x: 0, y: 0, w: 2, h: 1, maxH: 2,
    });

    const newSmLayouts = currentLayouts.sm ? currentLayouts.sm.map((layout) => ({ ...layout, y: layout.y + 1 })) : [];
    if (currentLayouts.sm) {
      newSmLayouts.unshift({
        i: config.chartId, x: 0, y: 0, w: 1, h: 1, maxH: 2,
      });
    }

    const newLayouts = {
      ...currentLayouts,
      main: compact(newMainLayouts, 'vertical', 2),
      ...(currentLayouts.sm && { sm: compact(newSmLayouts, 'vertical', 1) }),
    };

    this.actions.updateDashboardState({ chartConfigs: newConfigs, chartLayouts: newLayouts }, 'Add Chart');
  }

  addDashboardStat(statVar: DashboardStatConfig['yAxisVar'], aggregation: DashboardStatConfig['aggregation']) {
    const statId = `stat-${Date.now()}`;
    const opt = dashboardYAxisOptions.find((o) => o.value === statVar);
    const title = opt?.label?.[aggregation || 'sum'] || statVar;
    const fullStatConfig: DashboardStatConfig = {
      statId, yAxisVar: statVar, aggregation, title,
    };
    const currentStats = this.dashboardStatConfigs;
    this.actions.updateDashboardState({ statConfigs: [...currentStats, fullStatConfig] }, 'Add Stat');
  }

  removeDashboardStat(statId: string) {
    const currentStats = this.dashboardStatConfigs;
    this.actions.updateDashboardState({ statConfigs: currentStats.filter((config) => config.statId !== statId) }, 'Remove Stat');
  }

  resetDashboard() {
    this.actions.updateDashboardState({
      chartConfigs: JSON.parse(JSON.stringify(DEFAULT_CHART_CONFIGS)),
      statConfigs: JSON.parse(JSON.stringify(DEFAULT_STAT_CONFIGS)),
      chartLayouts: JSON.parse(JSON.stringify(DEFAULT_CHART_LAYOUTS)),
    }, 'Reset Dashboard to Defaults');
  }

  async computeDashboardChartData() {
    if (!this.duckDB) return;
    const result = {} as DashboardChartData;
    const selectClauses = this.dashboardChartConfigs.flatMap(({ yAxisVar }) => (
      Object.keys(AGGREGATION_OPTIONS).flatMap((aggregation) => {
        const aggFn = aggregation.toUpperCase();
        if (yAxisVar === 'total_blood_product_cost') {
          return [
            `${aggFn}(rbc_units_cost) AS ${aggregation}_rbc_units_cost`,
            `${aggFn}(plt_units_cost) AS ${aggregation}_plt_units_cost`,
            `${aggFn}(ffp_units_cost) AS ${aggregation}_ffp_units_cost`,
            `${aggFn}(cryo_units_cost) AS ${aggregation}_cryo_units_cost`,
            `${aggFn}(cell_saver_cost) AS ${aggregation}_cell_saver_cost`,
          ];
        }
        if (yAxisVar === 'case_mix_index') {
          return `SUM(ms_drg_weight) / COUNT(visit_no) AS ${aggregation}_case_mix_index`;
        }
        return `${aggFn}(${yAxisVar}) AS ${aggregation}_${yAxisVar}`;
      })
    ));

    const query = `
      SELECT 
        month,
        quarter,
        year,
        COUNT(visit_no) AS visit_count,
        ${selectClauses.join(',\n')}
      FROM filteredVisits
      GROUP BY month, quarter, year
      ORDER BY year, quarter, month;
    `;
    const queryResult = await this.duckDB.query(query);
    const rows = queryResult.toArray().map((row) => row.toJSON());

    dashboardXAxisVars.forEach((xAxisVar) => {
      const timeAggregation = xAxisVar as TimeAggregation;
      this.dashboardChartConfigs.forEach(({ yAxisVar }) => {
        Object.keys(AGGREGATION_OPTIONS).forEach((aggregation) => {
          const aggType = aggregation as keyof typeof AGGREGATION_OPTIONS;
          const aggVar: DashboardAggYAxisVar = `${aggType}_${yAxisVar}`;
          const chartDatum = rows
            .map((row) => {
              if (yAxisVar === 'total_blood_product_cost') {
                return {
                  timePeriod: row[timeAggregation] as TimePeriod,
                  data: {
                    rbc_units_cost: Number(row[`${aggType}_rbc_units_cost`] || 0),
                    plt_units_cost: Number(row[`${aggType}_plt_units_cost`] || 0),
                    ffp_units_cost: Number(row[`${aggType}_ffp_units_cost`] || 0),
                    cryo_units_cost: Number(row[`${aggType}_cryo_units_cost`] || 0),
                    cell_saver_cost: Number(row[`${aggType}_cell_saver_cost`] || 0),
                  },
                  counts_per_period: Number(row.visit_count || 0),
                };
              }
              return {
                timePeriod: row[timeAggregation] as TimePeriod,
                data: Number(row[aggVar] || 0),
                counts_per_period: Number(row.visit_count || 0),
              };
            })
            .filter((entry) => entry.timePeriod !== null && entry.timePeriod !== undefined && !Number.isNaN(entry.data))
            .reduce((acc, curr) => {
              const existing = acc.find((item) => item.timePeriod === curr.timePeriod);
              if (existing) {
                if (aggType === 'sum') {
                  if (typeof existing.data === 'object' && typeof curr.data === 'object') {
                    existing.data = {
                      rbc_units_cost: existing.data.rbc_units_cost + curr.data.rbc_units_cost,
                      plt_units_cost: existing.data.plt_units_cost + curr.data.plt_units_cost,
                      ffp_units_cost: existing.data.ffp_units_cost + curr.data.ffp_units_cost,
                      cryo_units_cost: existing.data.cryo_units_cost + curr.data.cryo_units_cost,
                      cell_saver_cost: existing.data.cell_saver_cost + curr.data.cell_saver_cost,
                    };
                  } else {
                    (existing.data as number) += curr.data as number;
                  }
                } else if (aggType === 'avg') {
                  existing.counts_per_period!.push(curr.counts_per_period || 0);
                  existing.data_per_period!.push(curr.data);
                  const totalCount = existing.counts_per_period!.reduce((a, b) => a + b, 0);
                  if (typeof existing.data === 'object' && typeof curr.data === 'object') {
                    const costKeys = Object.keys(existing.data) as (keyof typeof existing.data)[];
                    const avgObj: Record<string, number> = {};
                    for (const key of costKeys) {
                      const values = existing.data_per_period!.map((d) => (typeof d === 'object' ? d[key] : 0));
                      const weighted = existing.counts_per_period!.map((count, idx) => (count * (values[idx] || 0)) / (totalCount || 1));
                      avgObj[key] = weighted.reduce((a, b) => a + b, 0);
                    }
                    existing.data = avgObj;
                  } else {
                    const terms = existing.counts_per_period!.map((count, idx) => (count * (existing.data_per_period ? (existing.data_per_period[idx] as number) : 0)) / (totalCount || 1));
                    existing.data = terms.reduce((a, b) => a + b, 0);
                  }
                }
              } else {
                acc.push({ ...curr, counts_per_period: curr.counts_per_period ? [curr.counts_per_period] : [], data_per_period: [curr.data] });
              }
              return acc;
            }, [] as { timePeriod: TimePeriod; data: number | Record<Cost, number>, counts_per_period?: number[], data_per_period?: (number | Record<Cost, number>)[] }[])
            .map((entry) => {
              delete entry.counts_per_period;
              delete entry.data_per_period;
              return entry as { timePeriod: TimePeriod; data: number | Record<Cost, number> };
            })
            .sort((a, b) => compareTimePeriods(a.timePeriod, b.timePeriod));

          const compositeKey = `${aggVar}_${xAxisVar}` as keyof DashboardChartData;
          result[compositeKey] = chartDatum;
        });
      });
    });
    this.dashboardChartData = result;
  }

  async computeDashboardStatData() {
    if (!this.duckDB) return;
    const result = {} as DashboardStatData;
    const latestDateQuery = 'SELECT MAX(dsch_dtm) as latest_date FROM filteredVisits';
    const latestDateResult = await this.duckDB.query(latestDateQuery);
    const latestDateRow = latestDateResult.toArray()[0];
    const latestDate = new Date(latestDateRow.latest_date as string);
    const currentPeriodStart = new Date(latestDate.getTime() - (30 * 24 * 60 * 60 * 1000));
    const currentPeriodStartMonth = currentPeriodStart.getMonth();
    const currentPeriodStartYear = currentPeriodStart.getFullYear();
    let comparisonMonth = currentPeriodStartMonth - 1;
    let comparisonYear = currentPeriodStartYear;
    if (comparisonMonth < 0) {
      comparisonMonth = 11;
      comparisonYear -= 1;
    }
    const comparisonPeriodStart = new Date(comparisonYear, comparisonMonth, 1);
    const comparisonPeriodEnd = new Date(comparisonYear, comparisonMonth + 1, 0, 23, 59, 59, 999);
    const comparisonMonthName = comparisonPeriodStart.toLocaleDateString('en-US', { month: 'short' });

    const statSelects = [
      `
      COUNT(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}'
        THEN visit_no ELSE NULL END) AS visit_count_current_sum,
      COUNT(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}'
        THEN visit_no ELSE NULL END) AS visit_count_comparison_sum,
      COUNT(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}'
        THEN visit_no ELSE NULL END) AS visit_count_current_avg,
      COUNT(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}'
        THEN visit_no ELSE NULL END) AS visit_count_comparison_avg
      `,
      this.dashboardStatConfigs.map(({ yAxisVar, aggregation }) => {
        const aggFn = aggregation.toUpperCase();
        if (yAxisVar === 'total_blood_product_cost') {
          return `
                ${aggFn}(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}'
                  THEN rbc_units_cost + plt_units_cost + ffp_units_cost + cryo_units_cost + cell_saver_cost ELSE NULL END) AS total_blood_product_cost_current_${aggregation},
                ${aggFn}(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}'
                  THEN rbc_units_cost + plt_units_cost + ffp_units_cost + cryo_units_cost + cell_saver_cost ELSE NULL END) AS total_blood_product_cost_comparison_${aggregation}
              `;
        }
        if (yAxisVar === 'case_mix_index') {
          return `
                SUM(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}'
                  THEN ms_drg_weight ELSE NULL END) / visit_count_current_sum AS case_mix_index_current_${aggregation},
                SUM(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}'
                  THEN ms_drg_weight ELSE NULL END) / visit_count_comparison_sum AS case_mix_index_comparison_${aggregation}
              `;
        }
        return `
              ${aggFn}(CASE WHEN dsch_dtm >= '${currentPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}'
                THEN ${yAxisVar} ELSE NULL END) AS ${yAxisVar}_current_${aggregation},
              ${aggFn}(CASE WHEN dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${comparisonPeriodEnd.toISOString()}'
                THEN ${yAxisVar} ELSE NULL END) AS ${yAxisVar}_comparison_${aggregation}
            `;
      }),
    ].join(',\n');

    const mainStatsQuery = `
    SELECT
      ${statSelects}
      FROM filteredVisits
      WHERE dsch_dtm >= '${comparisonPeriodStart.toISOString()}' AND dsch_dtm <= '${latestDate.toISOString()}';
    `;
    const mainStatsResult = await this.duckDB!.query(mainStatsQuery);
    const statRow = mainStatsResult.toArray()[0];

    const sparklineMonths: string[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(latestDate.getFullYear(), latestDate.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthShort = d.toLocaleString('en-US', { month: 'short' });
      sparklineMonths.push(`${year}-${monthShort}`);
    }

    const sparklineSelects: string[] = [];
    this.dashboardStatConfigs.forEach(({ yAxisVar, aggregation }) => {
      const aggFn = aggregation.toUpperCase();
      if (yAxisVar === 'total_blood_product_cost') {
        sparklineSelects.push(
          `${aggFn}(rbc_units_cost + plt_units_cost + ffp_units_cost + cryo_units_cost + cell_saver_cost) AS ${aggregation}_total_blood_product_cost`,
        );
        return;
      }
      if (yAxisVar === 'dsch_dtm') {
        sparklineSelects.push(
          `COUNT(dsch_dtm) AS ${aggregation}_dsch_dtm`,
        );
        return;
      }
      if (yAxisVar === 'case_mix_index') {
        sparklineSelects.push(
          `SUM(ms_drg_weight) / COUNT(visit_no) AS ${aggregation}_case_mix_index`,
        );
        return;
      }
      sparklineSelects.push(
        `${aggFn}(${yAxisVar}) AS ${aggregation}_${yAxisVar}`,
      );
    });

    const sparklineQuery = `
    SELECT
      month,
      ${sparklineSelects.join(',\n')}
    FROM filteredVisits
    WHERE month IN (${sparklineMonths.map((m) => `'${m}'`).join(', ')})
    GROUP BY month
    ORDER BY month;
  `;
    const sparklineResult = await this.duckDB!.query(sparklineQuery);
    const sparklineRows = sparklineResult.toArray().map((row) => row.toJSON());

    this.dashboardStatConfigs.forEach(({ yAxisVar, aggregation }) => {
      const aggType = aggregation as keyof typeof AGGREGATION_OPTIONS;
      const key = `${aggType}_${yAxisVar}` as DashboardAggYAxisVar;
      const currentValue = aggType === 'sum' ? Number(statRow[`${yAxisVar}_current_sum`]) : Number(statRow[`${yAxisVar}_current_avg`]);
      const comparisonValue = aggType === 'sum' ? Number(statRow[`${yAxisVar}_comparison_sum`]) : Number(statRow[`${yAxisVar}_comparison_avg`]);
      const diff = comparisonValue === 0 ? (currentValue > 0 ? 100 : 0) : ((currentValue - comparisonValue) / comparisonValue) * 100;

      let formattedValue = formatValueForDisplay(yAxisVar, currentValue, aggType);
      if (yAxisVar.includes('adherent')) {
        formattedValue = formatValueForDisplay(yAxisVar, currentValue, aggType, false);
      }

      const sparklineData = sparklineMonths.map((month) => {
        const row = sparklineRows.find((r) => r.month === month);
        return row ? Number(row[`${aggregation}_${yAxisVar}`]) || 0 : 0;
      });

      result[key] = {
        value: formattedValue,
        diff: Math.round(diff),
        comparedTo: comparisonMonthName,
        sparklineData,
      };
    });
    this.dashboardStatData = result;
  }
  // endregion

  // region Explore

  get exploreChartLayouts() {
    if (this._transientExploreLayouts) {
      return this._transientExploreLayouts;
    }
    const { state } = this;
    return (state && state.explore && state.explore.chartLayouts) ? state.explore.chartLayouts : this.exploreInitialChartLayouts;
  }

  set exploreChartLayouts(input: { [key: string]: Layout[] }) {
    if (this.state.ui.activeTab !== 'Explore') return;
    this._transientExploreLayouts = input;
  }

  updateExploreLayout(input: { [key: string]: Layout[] }) {
    this.actions.updateExploreState({ chartLayouts: input }, 'Update Explore Layout');
    this._transientExploreLayouts = null;
  }

  get exploreChartConfigs() {
    const { state } = this;
    return (state && state.explore && state.explore.chartConfigs) ? state.explore.chartConfigs : this.exploreInitialChartConfigs;
  }

  set exploreChartConfigs(input: ExploreChartConfig[]) {
    this.actions.updateExploreState({ chartConfigs: input }, 'Update Explore Config');
  }

  addExploreChart(config: ExploreChartConfig) {
    const currentConfigs = this.exploreChartConfigs;
    const currentLayouts = this.exploreChartLayouts;
    const newConfigs = [config, ...currentConfigs];
    const shifted = currentLayouts.main.map((l) => ({ ...l, y: l.y + 1 }));
    shifted.unshift({
      i: config.chartId, x: 0, y: 0, w: 2, h: 1, maxH: 2,
    });
    const newLayouts = { ...currentLayouts, main: compact(shifted, 'vertical', 2) };
    this.actions.updateExploreState({ chartConfigs: newConfigs, chartLayouts: newLayouts }, 'Add Explore Chart');
  }

  removeExploreChart(chartId: string) {
    const currentConfigs = this.exploreChartConfigs;
    const currentLayouts = this.exploreChartLayouts;
    const newConfigs = currentConfigs.filter((config) => config.chartId !== chartId);
    const filteredMain = (currentLayouts.main || []).filter((layout) => layout.i !== chartId);
    const filteredSm = (currentLayouts.sm || []).filter((layout) => layout.i !== chartId);
    const newLayouts = { ...currentLayouts, main: compact(filteredMain, 'vertical', 2), ...(currentLayouts.sm ? { sm: compact(filteredSm, 'vertical', 1) } : {}) };
    this.actions.updateExploreState({ chartConfigs: newConfigs, chartLayouts: newLayouts }, 'Remove Explore Chart');
  }
  // endregion

  // region Filters

  get initialFilterValues() {
    return this._initialFilterValues;
  }

  get filterValues() {
    const { state } = this;
    const rawFilters = state.filterValues;
    if (!rawFilters || Object.keys(rawFilters).length === 0) {
      return this._initialFilterValues;
    }
    return {
      ...rawFilters,
      dateFrom: new Date(rawFilters.dateFrom),
      dateTo: new Date(rawFilters.dateTo),
    };
  }

  setFilterValue<T extends keyof typeof this._initialFilterValues>(key: T, value: typeof this._initialFilterValues[T]) {
    let finalValue = value;
    if ((key === 'dateFrom' || key === 'dateTo') && typeof value === 'string') {
      finalValue = safeParseDate(value) as any;
    }
    let val: any = finalValue;
    if (finalValue instanceof Date) {
      val = finalValue.toISOString();
    }
    this.actions.updateFilter(key as any, val);
  }

  async calculateDefaultFilterValues() {
    if (!this.duckDB) return;
    const result = await this.duckDB.query(`
      SELECT
        MIN(adm_dtm) AS min_adm, MAX(dsch_dtm) AS max_dsch,
        MIN(rbc_units) AS min_rbc, MAX(rbc_units) AS max_rbc,
        MIN(ffp_units) AS min_ffp, MAX(ffp_units) AS max_ffp,
        MIN(plt_units) AS min_plt, MAX(plt_units) AS max_plt,
        MIN(cryo_units) AS min_cryo, MAX(cryo_units) AS max_cryo,
        MIN(cell_saver_ml) AS min_cell_saver, MAX(cell_saver_ml) AS max_cell_saver,
        MIN(los) AS min_los, MAX(los) AS max_los
      FROM visits;
    `);
    const row = result.toArray()[0].toJSON();

    const dateFrom = safeParseDate(row.min_adm);
    const dateTo = safeParseDate(row.max_dsch);
    /* eslint-disable camelcase */
    const rbc_units: [number, number] = [Number(row.min_rbc), Number(row.max_rbc)];
    const ffp_units: [number, number] = [Number(row.min_ffp), Number(row.max_ffp)];
    const plt_units: [number, number] = [Number(row.min_plt), Number(row.max_plt)];
    const cryo_units: [number, number] = [Number(row.min_cryo), Number(row.max_cryo)];
    const cell_saver_ml: [number, number] = [Number(row.min_cell_saver), Number(row.max_cell_saver)];
    /* eslint-enable camelcase */
    const los: [number, number] = [Number(row.min_los), Number(row.max_los)];

    this._initialFilterValues = {
      ...this._initialFilterValues,
      /* eslint-disable camelcase */
      dateFrom,
      dateTo,
      rbc_units,
      ffp_units,
      plt_units,
      cryo_units,
      cell_saver_ml,
      los,
      /* eslint-enable camelcase */
    };
  }

  get dateFiltersAppliedCount(): number {
    const filters = this.filterValues;
    const dateFrom = safeParseDate(filters.dateFrom);
    const dateTo = safeParseDate(filters.dateTo);
    const initDateFrom = safeParseDate(this._initialFilterValues.dateFrom);
    const initDateTo = safeParseDate(this._initialFilterValues.dateTo);
    return (dateFrom.getTime() !== initDateFrom.getTime() || dateTo.getTime() !== initDateTo.getTime()) ? 1 : 0;
  }

  get outcomeFiltersAppliedCount(): number {
    let count = 0;
    const filters = this.filterValues;
    const keys = ['los', 'death', 'vent', 'stroke', 'ecmo'] as const;
    keys.forEach((key) => {
      if (key === 'los' ? (filters.los[0] !== this._initialFilterValues.los[0] || filters.los[1] !== this._initialFilterValues.los[1]) : filters[key] !== this._initialFilterValues[key]) {
        count += 1;
      }
    });
    return count;
  }

  get medicationsFiltersAppliedCount(): number {
    let count = 0;
    const filters = this.filterValues;
    const keys = ['b12', 'iron', 'antifibrinolytic'] as const;
    keys.forEach((key) => {
      if (filters[key] !== this._initialFilterValues[key]) count += 1;
    });
    return count;
  }

  get bloodComponentFiltersAppliedCount(): number {
    let count = 0;
    const filters = this.filterValues;
    const keys = ['rbc_units', 'ffp_units', 'plt_units', 'cryo_units', 'cell_saver_ml'] as const;
    keys.forEach((key) => {
      const [min, max] = filters[key] as [number, number];
      const [initMin, initMax] = this._initialFilterValues[key] as [number, number];
      if (min !== initMin || max !== initMax) count += 1;
    });
    return count;
  }

  get totalFiltersAppliedCount(): number {
    return this.dateFiltersAppliedCount + this.bloodComponentFiltersAppliedCount + this.medicationsFiltersAppliedCount + this.outcomeFiltersAppliedCount;
  }

  resetAllFilters() {
    this.actions.resetAllFilters();
  }

  resetDateFilters() {
    this.actions.resetDateFilters({
      dateFrom: this._initialFilterValues.dateFrom.toISOString(),
      dateTo: this._initialFilterValues.dateTo.toISOString(),
    });
  }

  resetBloodComponentFilters() {
    this.actions.resetBloodComponentFilters({
      rbc_units: [...this._initialFilterValues.rbc_units],
      ffp_units: [...this._initialFilterValues.ffp_units],
      plt_units: [...this._initialFilterValues.plt_units],
      cryo_units: [...this._initialFilterValues.cryo_units],
      cell_saver_ml: [...this._initialFilterValues.cell_saver_ml],
    });
  }

  resetMedicationsFilters() {
    this.actions.resetMedicationsFilters({
      b12: this._initialFilterValues.b12,
      iron: this._initialFilterValues.iron,
      antifibrinolytic: this._initialFilterValues.antifibrinolytic,
    });
  }

  resetOutcomeFilters() {
    this.actions.resetOutcomeFilters({
      los: [...this._initialFilterValues.los],
      death: this._initialFilterValues.death,
      vent: this._initialFilterValues.vent,
      stroke: this._initialFilterValues.stroke,
      ecmo: this._initialFilterValues.ecmo,
    });
  }

  async generateHistogramData() {
    if (!this.duckDB) return;
    const components = ['rbc_units', 'ffp_units', 'plt_units', 'cryo_units', 'cell_saver_ml', 'los'];
    const histogramData: Record<string, { units: string, count: number }[]> = {};
    const filters = this.filterValues;
    await Promise.all(components.map(async (component) => {
      const [minRange, maxRange] = filters[component as keyof typeof filters] as [number, number];
      const numBins = Math.min(20, Math.max(1, maxRange - minRange));
      const result = await this.duckDB!.query(`
        WITH bins AS (
          SELECT equi_width_bins(min(${component}), max(${component}), ${numBins}, false) AS bin
          FROM filteredVisits
        )
        SELECT HISTOGRAM(${component}, bins.bin) AS histogram,
        FROM filteredVisits, bins;
      `);
      histogramData[component] = result.toArray().flatMap((row) => {
        const { histogram } = row.toJSON();
        return Object.entries(histogram.toJSON()).map(([units, count]) => ({ units, count: Number(count) }));
      });
    }));
    this.histogramData = histogramData;
  }
  // endregion

  // region Selections

  async addSelectedTimePeriod(timePeriod: string) {
    if (!timePeriod) return;
    const next = new Set<string>(this.selectedTimePeriods);
    for (const p of expandTimePeriod(timePeriod)) next.add(p);
    this.actions.updateSelection(Array.from(next));
  }

  async removeSelectedTimePeriod(timePeriod: string) {
    if (!timePeriod) return;
    const next = new Set<string>(this.selectedTimePeriods);
    for (const p of expandTimePeriod(timePeriod)) next.delete(p);
    this.actions.updateSelection(Array.from(next));
  }

  resetSelections() {
    this.actions.updateSelection([]);
  }

  async getVisitInfo(visitNo: number) {
    if (!this.duckDB) return null;
    const result = await this.duckDB.query(`SELECT * FROM filteredVisits WHERE visit_no = ${visitNo}`);
    return result.toArray().map((row) => row.toJSON())[0] || null;
  }

  async updateSelectedVisits() {
    if (!this.duckDB) return;
    // Only match month-level selections (e.g., 2020-Jan)
    const monthRe = /^\d{4}-[A-Za-z]{3}$/;
    const months = this.selectedTimePeriods.filter((p) => monthRe.test(p));
    if (months.length === 0) {
      this.selectedVisits = [];
      this.selectedVisitNos = [];
      return;
    }
    // Escape single quotes for SQL strings
    const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
    const result = await this.duckDB.query(`SELECT visit_no FROM filteredVisits WHERE month IN (${months.map(q).join(', ')})`);
    this.selectedVisitNos = result.toArray().map((row) => Number(row.toJSON().visit_no));
  }
  // endregion

  // region Reactions

  initReactions() {
    reaction(
      () => this.state.filterValues,
      async () => { await this.updateFilteredData(); },
      { fireImmediately: false },
    );
    reaction(
      () => [this.state.dashboard.chartConfigs, this.state.dashboard.statConfigs],
      async () => {
        await this.computeDashboardChartData();
        await this.computeDashboardStatData();
      },
    );
    reaction(
      () => this.state.selections.selectedTimePeriods,
      async () => { await this.updateSelectedVisits(); },
    );
    reaction(
      () => this.state.settings.unitCosts,
      async () => { await this.updateCostsTable(); },
    );
  }

  async updateFilteredData() {
    if (!this.duckDB) return;
    const { filterValues } = this;
    if (!filterValues.dateFrom || !filterValues.dateTo) return;
    const dateFrom = filterValues.dateFrom.toISOString();
    const dateTo = filterValues.dateTo.toISOString();

    const filtersToApply = Object.entries(filterValues)
      .filter(([key, value]) => {
        const initVal = this._initialFilterValues[key as keyof typeof this._initialFilterValues];
        return JSON.stringify(value) !== JSON.stringify(initVal);
      })
      .map(([key, value]) => {
        if (Array.isArray(value)) return `${key} BETWEEN ${value[0]} AND ${value[1]}`;
        if (typeof value === 'boolean') return `${key} = ${value ? 1 : 0}`;
        if (value instanceof Date) return `adm_dtm BETWEEN '${dateFrom}' AND '${dateTo}'`;
        return null;
      })
      .join(' AND ');

    await this.duckDB.query(`
      TRUNCATE TABLE filteredVisitIds;
      INSERT INTO filteredVisitIds SELECT visit_no FROM visits ${filtersToApply ? `WHERE ${filtersToApply}` : ''};
    `);
    await this.updateFilteredVisitsLength();
    await this.computeDashboardChartData();
    await this.computeDashboardStatData();
    await this.generateHistogramData();
    await this.updateSelectedVisits();
  }

  async updateFilteredVisitsLength() {
    if (!this.duckDB) return;
    const result = await this.duckDB.query('SELECT COUNT(visit_no) AS count FROM filteredVisitIds;');
    this.filteredVisitsLength = Number(result.toArray()[0].toJSON().count);
  }

  async updateAllVisitsLength() {
    if (!this.duckDB) return;
    const result = await this.duckDB.query('SELECT COUNT(visit_no) AS count FROM visits;');
    this.allVisitsLength = Number(result.toArray()[0].toJSON().count);
  }

  async updateCostsTable() {
    if (!this.duckDB) return;
    await this.duckDB.query(`
      DELETE FROM costs;
      INSERT INTO costs VALUES (${this.unitCosts.rbc_units_cost}, ${this.unitCosts.ffp_units_cost}, ${this.unitCosts.plt_units_cost}, ${this.unitCosts.cryo_units_cost}, ${this.unitCosts.cell_saver_cost});
    `);
    await this.computeDashboardStatData();
    await this.computeDashboardChartData();
  }
  // endregion
}

export const Store = createContext(new RootStore());
