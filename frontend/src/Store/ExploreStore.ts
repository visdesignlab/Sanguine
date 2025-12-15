import { makeAutoObservable, observable } from 'mobx';
import { Layout } from 'react-grid-layout';

import type { RootStore } from './Store';
import { ExploreChartConfig, ExploreChartData } from '../Types/application';
import { areLayoutsEqual, compactLayout } from '../Utils/layout';

export class ExploreStore {
  _rootStore: RootStore;

  initialChartConfigs: ExploreChartConfig[] = [];
  initialChartLayouts: { [key: string]: Layout[] } = { main: [] };

  // Initialize store with the root store
  constructor(rootStore: RootStore) {
    this._rootStore = rootStore;
    makeAutoObservable(this, { chartData: observable.ref });
  }

  _transientLayouts: { [key: string]: Layout[] } | null = null;

  get chartLayouts() {
    if (this._transientLayouts) {
      return this._transientLayouts;
    }
    const state = this._rootStore.state;
    return (state && state.explore && state.explore.chartLayouts) ? state.explore.chartLayouts : this.initialChartLayouts;
  }

  set chartLayouts(input: { [key: string]: Layout[] }) {
    // Guard: Only update if Explore is active
    if (this._rootStore.state.ui.activeTab !== 'Explore') {
      return;
    }

    const current = this.chartLayouts;
    const mainEqual = areLayoutsEqual(current.main || [], input.main || []);

    if (mainEqual) {
      return;
    }

    this._transientLayouts = input;
  }

  /**
   * Explicitly update the explore layout in the provenance store.
   * This should be called on drag/resize stop, not on every layout change.
   */
  updateExploreLayout(input: { [key: string]: Layout[] }) {
    this._rootStore.actions.updateExploreState({
      chartLayouts: input
    }, 'Update Explore Layout');
    this._transientLayouts = null;
  }

  get chartConfigs() {
    const state = this._rootStore.state;
    return (state && state.explore && state.explore.chartConfigs) ? state.explore.chartConfigs : this.initialChartConfigs;
  }

  set chartConfigs(input: ExploreChartConfig[]) {
    this._rootStore.actions.updateExploreState({
      chartConfigs: input
    }, 'Update Explore Config');
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
    const currentConfigs = this.chartConfigs;
    const currentLayouts = this.chartLayouts;

    const newConfigs = [config, ...currentConfigs];

    // Calculate new layout
    const shifted = currentLayouts.main.map((l) => ({ ...l, y: l.y + 1 }));
    shifted.unshift({
      i: config.chartId,
      x: 0,
      y: 0,
      w: 2,
      h: 1,
      maxH: 2,
    });

    const newLayouts = {
      ...currentLayouts,
      main: compactLayout(shifted, 2)
    };

    // Update provenance
    this._rootStore.actions.updateExploreState({
      chartConfigs: newConfigs,
      chartLayouts: newLayouts
    }, 'Add Explore Chart');
  }

  // Removes chart from layouts (position) and config (info)
  removeChart(chartId: string) {
    const currentConfigs = this.chartConfigs;
    const currentLayouts = this.chartLayouts;

    const newConfigs = currentConfigs.filter((config) => config.chartId !== chartId);

    // Create deep copy of layouts to modify
    const filteredMain = (currentLayouts.main || []).filter((layout) => layout.i !== chartId);
    // Explore might not have sm layout defined in the same way, but let's handle it safely
    const filteredSm = (currentLayouts.sm || []).filter((layout) => layout.i !== chartId);

    const newLayouts = {
      ...currentLayouts,
      main: compactLayout(filteredMain, 2), // main has 2 columns
      ...(currentLayouts.sm ? { sm: compactLayout(filteredSm, 1) } : {})
    };

    this._rootStore.actions.updateExploreState({
      chartConfigs: newConfigs,
      chartLayouts: newLayouts
    }, 'Remove Explore Chart');
  }
}
