import { makeAutoObservable, observable } from 'mobx';
import { Layout } from 'react-grid-layout';

import type { RootStore } from './Store';
import {
  ExploreChartConfig, ExploreTableConfig, ExploreTableColumn, ExploreChartData,
} from '../Types/application';

import { dummyData, dummyDataTwoVals } from '../Components/Views/ExploreView/Charts/exploreTableDummyData';

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
    this.computeChartData();
  }

  // Explore View Chart Data -----------------------------------
  chartData: ExploreChartData = {} as ExploreChartData;

  async computeChartData(): Promise<void> {
    const data: ExploreChartData = {};

    for (const config of this._chartConfigs) {
      // Temporary: use dummy data for all chart types
      if (config.chartType === 'exploreTable') {
        data[config.chartId] = config.twoValsPerRow ? dummyDataTwoVals : dummyData;
      }
      if (config.chartType === 'scatterPlot') {
        data[config.chartId] = dummyData;
      }
      if (config.chartType === 'cost') {
        data[config.chartId] = dummyData;
      }
    }
    this.chartData = data;
  }

  // Adds a new chart to the top of the layout
  addChart(config: ExploreChartConfig) {
    // Add to chart configs
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

  updateChartConfig(updatedConfig: ExploreChartConfig) {
    this.chartConfigs = this._chartConfigs.map((cfg) => (cfg.chartId === updatedConfig.chartId ? updatedConfig : cfg));
  }
}
