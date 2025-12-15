import { makeAutoObservable, reaction, makeObservable, observable, computed, runInAction } from 'mobx';
import { createContext } from 'react';
import { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import { initProvenance, Provenance, NodeID } from '@visdesignlab/trrack';
import LZString from 'lz-string';
import {
  Cost,
  DEFAULT_UNIT_COSTS,
  DashboardChartConfig,
  DashboardStatConfig,
  ExploreChartConfig,
} from '../Types/application';
import { DEFAULT_CHART_CONFIGS, DEFAULT_CHART_LAYOUTS, DEFAULT_STAT_CONFIGS, DashboardStore } from './DashboardStore';
import { FiltersStore } from './FiltersStore';
import { ExploreStore } from './ExploreStore';
import { SelectionsStore } from './SelectionsStore';
import { Layout } from 'react-grid-layout';

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

export class ProvenanceStore {
  _rootStore: RootStore;

  provenance: Provenance<ApplicationState, any, StateAnnotation> | null = null;
  graphVersion = 0;

  constructor(rootStore: RootStore) {
    this._rootStore = rootStore;

    makeObservable(this, {
      graphVersion: observable,
      savedStates: computed,
      canUndo: computed,
      canRedo: computed,
      currentState: computed,
      uiState: computed,
    });

  }

  /**
   * Initialize the provenance store with current store values.
   * This should be called after data is loaded and default filter values are calculated.
   */
  init() {
    if (this.provenance) {
      console.warn("ProvenanceStore already initialized");
      return;
    }
    const rawInitialState: ApplicationState = {
      filterValues: {
        dateFrom: this._rootStore.filtersStore._initialFilterValues.dateFrom.toISOString(),
        dateTo: this._rootStore.filtersStore._initialFilterValues.dateTo.toISOString(),
        rbc_units: [...this._rootStore.filtersStore._initialFilterValues.rbc_units],
        ffp_units: [...this._rootStore.filtersStore._initialFilterValues.ffp_units],
        plt_units: [...this._rootStore.filtersStore._initialFilterValues.plt_units],
        cryo_units: [...this._rootStore.filtersStore._initialFilterValues.cryo_units],
        cell_saver_ml: [...this._rootStore.filtersStore._initialFilterValues.cell_saver_ml],
        b12: this._rootStore.filtersStore._initialFilterValues.b12,
        iron: this._rootStore.filtersStore._initialFilterValues.iron,
        antifibrinolytic: this._rootStore.filtersStore._initialFilterValues.antifibrinolytic,
        los: [...this._rootStore.filtersStore._initialFilterValues.los],
        death: this._rootStore.filtersStore._initialFilterValues.death,
        vent: this._rootStore.filtersStore._initialFilterValues.vent,
        stroke: this._rootStore.filtersStore._initialFilterValues.stroke,
        ecmo: this._rootStore.filtersStore._initialFilterValues.ecmo,
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
        chartConfigs: JSON.parse(JSON.stringify(this._rootStore.exploreStore.initialChartConfigs || [])),
        chartLayouts: JSON.parse(JSON.stringify(this._rootStore.exploreStore.initialChartLayouts || {})),
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
    this.provenance = initProvenance<ApplicationState, any, StateAnnotation>(initialState, {
      loadFromUrl: true
    });

    // Set up observer
    this.provenance.addGlobalObserver((_graph, changeType) => {
      runInAction(() => {
        this.graphVersion++;
      });
    });

    this.provenance.done();

    // Check for provState key
    const hasUrlParam = window.location.search.includes('provState') || window.location.hash.includes('provState');

    if (this.provenance.current.id === this.provenance.root.id && !hasUrlParam) {
      this.provenance.apply({
        apply: (state: ApplicationState) => {
          return {
            state: state,
            label: 'Initial State',
            stateSaveMode: 'Complete',
            actionType: 'Regular',
            eventType: 'Regular'
          } as any;
        }
      }, 'Initial State');
    }
  }


  /**
   * Helper to apply an action to the provenance graph reducing boilerplate.
   */
  applyAction<T>(
    label: string,
    updater: (state: ApplicationState, payload: T) => ApplicationState,
    payload: T
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
          eventType: 'Regular'
        } as any;
      }
    }, label);
  }

  actions = {
    updateFilter: (filterKey: keyof ApplicationState['filterValues'], value: any) => {
      this.applyAction(`Update Filter: ${filterKey}`, (state, val) => ({
        ...state,
        filterValues: {
          ...state.filterValues,
          ...val
        }
      }), { [filterKey]: value });
    },
    resetAllFilters: () => {
      this.applyAction('Reset All Filters', (state) => {
        const initial = this._rootStore.filtersStore.initialFilterValues;

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
          filterValues: initialFiltersStringified
        };
      }, null);
    },
    updateSelection: (timePeriods: string[]) => {
      this.applyAction('Update Selection', (state, periods) => {
        return {
          ...state,
          selections: {
            ...state.selections,
            selectedTimePeriods: periods
          }
        };
      }, timePeriods);
    },
    updateDashboardState: (dashboardState: Partial<ApplicationState['dashboard']>, label: string = 'Update Dashboard') => {
      console.log("Updating dashboard state:", dashboardState);
      this.applyAction(label, (state, partial) => ({
        ...state,
        dashboard: {
          ...state.dashboard,
          ...partial
        }
      }), dashboardState);
    },
    setUiState: (partialUiState: Partial<ApplicationState['ui']>) => {
      this.applyAction('Update UI State', (state, partial) => ({
        ...state,
        ui: {
          ...state.ui,
          ...partial
        }
      }), partialUiState);
    },
    updateExploreState: (exploreState: Partial<ApplicationState['explore']>, label: string = 'Update Explore State') => {
      this.applyAction(label, (state, partial) => ({
        ...state,
        explore: {
          ...state.explore,
          ...partial
        }
      }), exploreState);
    },
    updateSettings: (unitCosts: Record<Cost, number>) => {
      this.applyAction('Update Settings', (state, costs) => ({
        ...state,
        settings: {
          ...state.settings,
          unitCosts: costs
        }
      }), unitCosts);
    }
  };

  // Save/Restore --------------------------------------------------------------

  saveState(name: string, screenshot?: string) {
    if (!this.provenance) return;
    const currentNodeId = this.provenance.current.id;

    console.log("🔖 [ProvenanceStore] Bookmarking State:", this.provenance.getState(currentNodeId));
    this.provenance.addArtifact({ type: 'name', value: name }, currentNodeId);
    if (screenshot) {
      this.provenance.addArtifact({ type: 'screenshot', value: screenshot }, currentNodeId);
    }

    // Trigger reactivity so UI updates
    runInAction(() => {
      this.graphVersion++;
    });
  }

  deletedStateIds: Set<NodeID> = new Set();

  removeState(nodeId: NodeID) {
    this.deletedStateIds.add(nodeId);
    // Trigger reactivity
    runInAction(() => {
      this.graphVersion++;
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
          timestamp: (node as any).createdOn || node.metadata?.createdOn || 0,
        };
      });
  }

  get canUndo() {
    this.graphVersion;

    if (!this.provenance) return false;
    const { current } = this.provenance;
    const { root } = this.provenance;

    // Disable undo if at root OR if at the "Initial State" node (our artificial root)
    return current.id !== root.id && current.label !== 'Initial State';
  }

  get canRedo() {
    this.graphVersion;

    if (!this.provenance) return false;
    const { current } = this.provenance;
    return current.children.length > 0;
  }

  get currentState() {
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
      } as any;
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
    const initialNode = nodes.find(n => n.label === 'Initial State');

    if (initialNode) {
      this.provenance.goToNode(initialNode.id);
    } else {
      console.error("Could not find 'Initial State' node to restore to.");
    }
  }

  getShareUrl(nodeId: NodeID): string | null {
    if (!this.provenance) return null;

    console.log("🔍 [ProvenanceStore] Inspecting provenance config:", this.provenance.config);

    const state = this.provenance.getState(nodeId);

    // Try accessing Trrack's serializer, fallback to manual LZString
    let serializedState: string | null = null;
    const serializer = (this.provenance.config as any)._serializer;

    if (serializer) {
      serializedState = serializer(state);
    } else {
      console.warn("⚠️ [ProvenanceStore] Serializer not found on config. Using fallback LZString.");
      try {
        serializedState = LZString.compressToEncodedURIComponent(JSON.stringify(state));
      } catch (e) {
        console.error("Error serializing state:", e);
      }
    }

    if (serializedState) {
      const baseUrl = window.location.origin + window.location.pathname;
      return `${baseUrl}?config=${serializedState}`;
    }
    return null;
  }
}

export class RootStore {
  // Stores
  dashboardStore: DashboardStore;

  exploreStore: ExploreStore;
  // // providersStore:

  filtersStore: FiltersStore;

  selectionsStore: SelectionsStore;

  provenanceStore: ProvenanceStore;

  duckDB: AsyncDuckDBConnection | null = null;

  get state() {
    return this.provenanceStore.currentState;
  }

  get actions() {
    return this.provenanceStore.actions;
  }

  get unitCosts() {
    const state = this.state;
    return (state && state.settings && state.settings.unitCosts) ? state.settings.unitCosts : DEFAULT_UNIT_COSTS;
  }

  set unitCosts(costs: Record<Cost, number>) {
    this.actions.updateSettings(costs);
  }

  allVisitsLength = 0;

  filteredVisitsLength = 0;

  constructor() {
    // Initialize stores
    this.dashboardStore = new DashboardStore(this);
    this.exploreStore = new ExploreStore(this);
    this.filtersStore = new FiltersStore(this);
    this.selectionsStore = new SelectionsStore(this);
    this.provenanceStore = new ProvenanceStore(this);

    makeAutoObservable(this, {
      provenanceStore: false,
    });

    this.initReactions();
  }

  initReactions() {
    // 1. Reaction to Filter Changes
    reaction(
      () => this.state.filterValues,
      async () => {
        await this.updateFilteredData();
      },
      { fireImmediately: false },
    );

    // 2. Reaction to Dashboard Configuration Changes
    reaction(
      () => [
        this.state.dashboard.chartConfigs,
        this.state.dashboard.statConfigs,
      ],
      async () => {
        await this.dashboardStore.computeChartData();
        await this.dashboardStore.computeStatData();
      },
    );

    // 3. Reaction to Selections Changes
    reaction(
      () => this.state.selections.selectedTimePeriods,
      async () => {
        await this.selectionsStore.updateSelectedVisits();
      },
    );

    // 4. Reaction to Unit Costs Changes
    reaction(
      () => this.state.settings.unitCosts,
      async () => {
        await this.updateCostsTable();
      },
    );
  }

  async updateFilteredData() {
    if (!this.duckDB) return;

    const { filterValues, initialFilterValues } = this.filtersStore;
    if (!filterValues.dateFrom || !filterValues.dateTo) return;

    const dateFrom = filterValues.dateFrom.toISOString();
    const dateTo = filterValues.dateTo.toISOString();

    // Find filter values that have changed and build SQL conditions for them
    const filtersToApply = Object.entries(filterValues)
      .filter(([key, value]) => {
        const initVal = initialFilterValues[key as keyof typeof initialFilterValues];
        return JSON.stringify(value) !== JSON.stringify(initVal);
      })
      .map(([key, value]) => {
        // Arrays (range filters)
        if (Array.isArray(value)) {
          return `${key} BETWEEN ${value[0]} AND ${value[1]}`;
        }
        // Booleans
        if (typeof value === 'boolean') {
          return `${key} = ${value ? 1 : 0}`;
        }
        // Dates
        if (value instanceof Date) {
          return `adm_dtm BETWEEN '${dateFrom}' AND '${dateTo}'`;
        }
        return null;
      })
      .join(' AND ');

    // Update filteredVisits table in duckdb
    const query = `
      TRUNCATE TABLE filteredVisitIds;
      INSERT INTO filteredVisitIds
        SELECT visit_no
        FROM visits
        ${filtersToApply ? `WHERE ${filtersToApply}` : ''}
        ;
    `;
    await this.duckDB.query(query);
    await this.updateFilteredVisitsLength();

    await this.dashboardStore.computeChartData();
    await this.dashboardStore.computeStatData();
  }

  async updateFilteredVisitsLength() {
    if (!this.duckDB) return;

    const result = await this.duckDB.query('SELECT COUNT(visit_no) AS count FROM filteredVisitIds;');
    const row = result.toArray()[0].toJSON();
    this.filteredVisitsLength = Number(row.count);
  }

  async updateAllVisitsLength() {
    if (!this.duckDB) return;

    const result = await this.duckDB.query('SELECT COUNT(visit_no) AS count FROM visits;');
    const row = result.toArray()[0].toJSON();
    this.allVisitsLength = Number(row.count);
  }

  async updateCostsTable() {
    if (!this.duckDB) return;

    await this.duckDB.query(`
      DELETE FROM costs;
      INSERT INTO costs VALUES (
        ${this.unitCosts.rbc_units_cost},
        ${this.unitCosts.ffp_units_cost},
        ${this.unitCosts.plt_units_cost},
        ${this.unitCosts.cryo_units_cost},
        ${this.unitCosts.cell_saver_cost}
      );
    `);

    await this.dashboardStore.computeStatData();
    await this.dashboardStore.computeChartData();
  }
}

export const Store = createContext(new RootStore());
