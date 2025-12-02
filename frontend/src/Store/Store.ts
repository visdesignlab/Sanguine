import { makeAutoObservable } from 'mobx';
import { createContext } from 'react';
import { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import {
  Cost,
} from '../Types/application';
import { DashboardStore } from './DashboardStore';
import { FiltersStore } from './FiltersStore';
import { ExploreStore } from './ExploreStore';
import { SelectionsStore } from './SelectionsStore';
import { ProvenanceStore } from './ProvenanceStore';

export class RootStore {
  // Provenance

  // // Stores
  dashboardStore: DashboardStore;

  exploreStore: ExploreStore;
  // // providersStore:

  filtersStore: FiltersStore;

  selectionsStore: SelectionsStore;

  provenanceStore: ProvenanceStore;

  duckDB: AsyncDuckDBConnection | null = null;

  _unitCosts: Record<Cost, number> = {
    rbc_units_cost: 200,
    ffp_units_cost: 55,
    plt_units_cost: 650,
    cryo_units_cost: 70,
    cell_saver_cost: 500,
  };

  get unitCosts() {
    return this._unitCosts;
  }

  set unitCosts(costs: Record<Cost, number>) {
    this._unitCosts = costs;
    this.updateCostsTable();
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
      provenanceStore: false, // Exclude provenanceStore from auto observable to prevent deep proxying of Trrack
    });
  }

  async updateFilteredData() {
    if (!this.duckDB) return;

    const { filterValues, initialFilterValues } = this.filtersStore;
    const dateFrom = filterValues.dateFrom.toISOString();
    const dateTo = filterValues.dateTo.toISOString();

    // Find filter values that have changed and build SQL conditions for them
    const filtersToApply = Object.entries(filterValues)
      .filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(initialFilterValues[key as keyof typeof initialFilterValues]))
      .map(([key, value]) => {
        // Arrays
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
