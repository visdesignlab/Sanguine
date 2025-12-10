import { makeAutoObservable, observable } from 'mobx';
import { Layout } from 'react-grid-layout';

import type { RootStore } from './Store';
import { ExploreChartConfig, ExploreChartData } from '../Types/application';
import { SCATTER_PLOT_DUMMY_DATA } from './ScatterPlotDummyData';

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
    this._chartLayouts = input;
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
    // Scatter plot dummy data (all combinations)
    ...SCATTER_PLOT_DUMMY_DATA,
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
    this._chartLayouts = { ...this._chartLayouts, main: shifted };
  }

  // Removes chart from layouts (position) and config (info)
  removeChart(chartId: string) {
    this._chartConfigs = this._chartConfigs.filter((config) => config.chartId !== chartId);
    Object.keys(this._chartLayouts).forEach((key) => {
      this._chartLayouts[key] = this._chartLayouts[key].filter((layout) => layout.i !== chartId);
    });
  }

  // Updates an existing chart configuration
  updateChartConfig(updatedConfig: ExploreChartConfig) {
    const index = this._chartConfigs.findIndex((config) => config.chartId === updatedConfig.chartId);
    if (index !== -1) {
      this._chartConfigs[index] = updatedConfig;
    }
  }
}
