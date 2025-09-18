import { makeAutoObservable, observable } from 'mobx';
import { Layout } from 'react-grid-layout';

import type { RootStore } from './Store';
import { ExploreChartConfig, ExploreChartData } from '../Types/application';

export class SelectionsStore {
  _rootStore: RootStore;

  // Initialize store with the root store
  constructor(rootStore: RootStore) {
    this._rootStore = rootStore;
    makeAutoObservable(this, { selectedVisits: observable.ref });
  }

  selectedVisits: any[] = [];

  async updateSelectedVisits() {
    if (!this._rootStore.duckDB) return;
  
    const query = `
      SELECT *
      FROM filteredVisits
      -- JOIN ...
      LIMIT 100;
    `;
    const result = await this._rootStore.duckDB.query(query);
    
    // jsonify all the rows into the selected visits
    this.selectedVisits = result.toArray().map(row => row.toJSON());
  }
}
