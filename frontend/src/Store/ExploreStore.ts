import { makeAutoObservable, observable } from 'mobx';
import { Layout } from 'react-grid-layout';

import type { RootStore } from './Store';
import { ExploreChartConfig, ExploreChartData } from '../Types/application';

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
  };
  
  chartData: ExploreChartData = {
    ...this.dummyData,
  };

  // Removes chart from layouts (position) and config (info)
  removeChart(chartId: string) {
    this._chartConfigs = this._chartConfigs.filter((config) => config.chartId !== chartId);
    Object.keys(this._chartLayouts).forEach((key) => {
      this._chartLayouts[key] = this._chartLayouts[key].filter((layout) => layout.i !== chartId);
    });
  }
}
