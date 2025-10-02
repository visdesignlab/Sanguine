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

export class RootStore {
  // Provenance

  // // Stores
  dashboardStore: DashboardStore;

  exploreStore: ExploreStore;
  // // providersStore:

  filtersStore: FiltersStore;

  selectionsStore: SelectionsStore;

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

  departments: Record<string, number> = {};

  departmentColors: Record<string, string> = {};

  constructor() {
    // Initialize stores
    this.dashboardStore = new DashboardStore(this);
    this.exploreStore = new ExploreStore(this);
    this.filtersStore = new FiltersStore(this);
    this.selectionsStore = new SelectionsStore(this);

    makeAutoObservable(this);
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
        // Departments
        if (key === 'departments') {
          // Use json_contains to check if each department is in the departments JSON array
          return value && Array.isArray(value) && value.length > 0 ? `(${value
            .map(
              (dept) => `json_contains(departments, '"${dept}"')`,
            )
            .join(' OR ')})` : '';
        }
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

  private generateDepartmentColors(departments: string[]) {
    // If need be, expand palette or generate more colors
    const palette = [
      '#2196F3', '#FF8C42', '#6CBA7C', '#F7A8B8', '#A3A1FB', '#FFD13C', '#EF2026', '#73C3C5', '#897BD3', '#1770B8',
    ];
    const colors: Record<string, string> = {};
    departments.forEach((dept, idx) => {
      colors[dept] = palette[idx % palette.length];
    });
    return colors;
  }

  async updateDepartments() {
    if (!this.duckDB) return;

    const result = await this.duckDB.query(`
    SELECT 
      json_extract_string(value, '$') AS department, 
      COUNT(*) AS count
    FROM visits, json_each(departments)
    GROUP BY department
    ORDER BY department;
  `);
    this.departments = result.toArray().map((row) => row.toJSON()).reduce((acc, curr) => {
      acc[curr.department as string] = Number(curr.count);
      return acc;
    }, {} as Record<string, number>);

    // Generate and assign colors to departments
    const departmentNames = Object.keys(this.departments);
    this.departmentColors = this.generateDepartmentColors(departmentNames);
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

  async initializeFiltersAndData() {
    // Overall Visits, Departments, etc.
    await this.updateAllVisitsLength();
    await this.updateDepartments();

    // Filters
    await this.updateFilteredData();
    await this.filtersStore.calculateDefaultFilterValues();
    await this.updateFilteredVisitsLength();

    // Charting
    await this.filtersStore.generateHistogramData();
    await this.dashboardStore.computeChartData();
    await this.dashboardStore.computeStatData();
  }
}

export const Store = createContext(new RootStore());
