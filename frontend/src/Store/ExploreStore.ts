import { makeAutoObservable, observable } from 'mobx';
import { Layout } from 'react-grid-layout';

import type { RootStore } from './Store';
import { ExploreChartConfig, ExploreChartData } from '../Types/application';
import { areLayoutsEqual, compactLayout } from '../Utils/layout';

export class ExploreStore {
  _rootStore: RootStore;

  // Initialize store with the root store
  constructor(rootStore: RootStore) {
    this._rootStore = rootStore;
    makeAutoObservable(this, { chartData: observable.ref });
  }

  _chartLayouts: { [key: string]: Layout[] } = {
    main: [],
  };

  get chartLayouts() {
    return this._chartLayouts;
  }

  set chartLayouts(input: { [key: string]: Layout[] }) {
    // Guard: Only update if Explore is active
    if (this._rootStore.provenanceStore.currentState.ui.activeTab !== 'Explore') {
      return;
    }

    const mainEqual = areLayoutsEqual(this._chartLayouts.main || [], input.main || []);

    if (mainEqual) {
      return;
    }

    this._chartLayouts = input;
  }

  /**
   * Explicitly update the explore layout in the provenance store.
   * This should be called on drag/resize stop, not on every layout change.
   */
  updateExploreLayout(input: { [key: string]: Layout[] }) {
    this._chartLayouts = input;
    this._rootStore.provenanceStore.actions.updateExploreLayout(input);
  }

  _chartConfigs: ExploreChartConfig[] = [];

  get chartConfigs() {
    return this._chartConfigs;
  }

  set chartConfigs(input: ExploreChartConfig[]) {
    this._chartConfigs = input;
  }

  // Explore View Chart Data -----------------------------------

  // TODO: Remove dummy data and replace with query results
  dummyData: ExploreChartData = {
    // Scatter plot dummy data (cell salvage volume vs post-op hemoglobin)
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

    // Cost bar chart dummy data (sum of costs per surgeon)
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

  chartData: ExploreChartData = {
    ...this.dummyData,
  };

  // Adds a new chart to the top of the layout
  addChart(config: ExploreChartConfig) {
    this._chartConfigs = [config, ...this._chartConfigs];
    const shifted = this._chartLayouts.main.map((l) => ({ ...l, y: l.y + 1 }));
    shifted.unshift({
      i: config.chartId,
      x: 0,
      y: 0,
      w: 2,
      h: 1,
      maxH: 2,
    });

    const newLayouts = {
      ...this._chartLayouts,
      main: compactLayout(shifted, 2)
    };

    // Update local state immediately
    this._chartLayouts = newLayouts;

    this._rootStore.provenanceStore.actions.updateExploreState({
      chartConfigs: this._chartConfigs,
      chartLayouts: this._chartLayouts
    }, 'Add Explore Chart');
  }

  // Removes chart from layouts (position) and config (info)
  removeChart(chartId: string) {
    this._chartConfigs = this._chartConfigs.filter((config) => config.chartId !== chartId);

    // Create deep copy of layouts to modify
    const filteredMain = (this._chartLayouts.main || []).filter((layout) => layout.i !== chartId);
    // Explore might not have sm layout defined in the same way, but let's handle it safely
    const filteredSm = (this._chartLayouts.sm || []).filter((layout) => layout.i !== chartId);

    const newLayouts = {
      ...this._chartLayouts,
      main: compactLayout(filteredMain, 2), // main has 2 columns
      ...(this._chartLayouts.sm ? { sm: compactLayout(filteredSm, 1) } : {})
    };

    this._chartLayouts = newLayouts;

    this._rootStore.provenanceStore.actions.updateExploreState({
      chartConfigs: this._chartConfigs,
      chartLayouts: this._chartLayouts
    }, 'Remove Explore Chart');
  }

  loadState(state: {
    chartConfigs: ExploreChartConfig[];
    chartLayouts: { [key: string]: Layout[] };
  }) {
    this._chartConfigs = state.chartConfigs;
    this._chartLayouts = state.chartLayouts;
  }
}
