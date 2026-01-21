import { makeAutoObservable } from 'mobx';
import { RootStore } from './Store';
import { DashboardChartConfig, DashboardStatConfig, ExploreChartConfig, Cost } from '../Types/application';

export interface ApplicationState {
  filterValues: any;
  selections: {
    selectedTimePeriods: string[];
  };
  dashboard: {
    chartConfigs: Record<string, DashboardChartConfig>;
    statConfigs: DashboardStatConfig[];
  } | null;
  explore: {
    chartConfigs: ExploreChartConfig[];
  } | null;
  settings: {
    unitCosts: Record<Cost, number>;
  } | null;
}

export type SavedState = {
  id: string;
  name: string;
  timestamp: number;
  screenshot?: string;
  state: ApplicationState;
};

export class ProvenanceStore {
  rootStore: RootStore;
  savedStates: SavedState[] = [];
  provenance: any = {
    getState: (id: string) => {
      const s = this.savedStates.find(st => st.id === id);
      return s ? s.state : null;
    }
  }; // Mock trrack specific usage for now

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this);

    // Load from local storage if needed, or init empty
  }

  get canUndo() {
    return false; // Implement if trrack is fully integrated
  }

  saveState(name: string, screenshot?: string) {
    const id = crypto.randomUUID();
    const state = this.captureState();
    this.savedStates.push({
      id,
      name,
      timestamp: Date.now(),
      screenshot,
      state
    });
  }

  restoreState(id: string) {
    const saved = this.savedStates.find(s => s.id === id);
    if (saved) {
      this.applyState(saved.state);
    }
  }

  removeState(id: string) {
    this.savedStates = this.savedStates.filter(s => s.id !== id);
  }

  renameState(id: string, name: string) {
    const savedState = this.savedStates.find(s => s.id === id);
    if (savedState) savedState.name = name;
  }

  getShareUrl(id: string) {
    return window.location.href + "?state=" + id;
  }

  captureState(): ApplicationState {
    return {
      filterValues: JSON.parse(JSON.stringify(this.rootStore.filtersStore.filterValues)),
      selections: {
        selectedTimePeriods: [...this.rootStore.selectionsStore.selectedTimePeriods]
      },
      dashboard: {
        chartConfigs: JSON.parse(JSON.stringify(this.rootStore.dashboardStore.chartConfigs)),
        statConfigs: JSON.parse(JSON.stringify(this.rootStore.dashboardStore.statConfigs || []))
      },
      explore: {
        chartConfigs: [] // TODO: Add explore store capture if needed
      },
      settings: {
        unitCosts: { ...this.rootStore.unitCosts }
      }
    };
  }

  applyState(state: ApplicationState) {
    if (state.filterValues) {
      // this.rootStore.filtersStore.setValues(state.filterValues); // Assuming setValues exists or manual update
    }
    if (state.selections) {
      this.rootStore.selectionsStore.selectedTimePeriods = state.selections.selectedTimePeriods;
    }
    if (state.dashboard) {
      // this.rootStore.dashboardStore.chartConfigs = state.dashboard.chartConfigs; 
      // Need careful application
    }
    if (state.settings) {
      this.rootStore.unitCosts = state.settings.unitCosts;
    }
  }
}
