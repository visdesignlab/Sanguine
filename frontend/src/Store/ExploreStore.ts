import { makeAutoObservable } from 'mobx';
import { Layout } from 'react-grid-layout';

import type { RootStore } from './Store';
import { ExploreChartConfig } from '../Types/application';

export class ExploreStore {
  _rootStore: RootStore;

  // Initialize store with the root store
  constructor(rootStore: RootStore) {
    this._rootStore = rootStore;
    makeAutoObservable(this);
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

  // Chart configurations by default
  _chartConfigs: ExploreChartConfig[] = [];

  get chartConfigs() {
    return this._chartConfigs;
  }

  set chartConfigs(input: ExploreChartConfig[]) {
    this._chartConfigs = input;
  }

  // Removes chart from layouts (position) and config (info)
  removeChart(chartId: string) {
    this._chartConfigs = this._chartConfigs.filter((config) => config.chartId !== chartId);
    Object.keys(this._chartLayouts).forEach((key) => {
      this._chartLayouts[key] = this._chartLayouts[key].filter((layout) => layout.i !== chartId);
    });
  }
}
