/* eslint-disable camelcase */
import { makeAutoObservable } from 'mobx';
import type { RootStore } from './Store';
import { safeParseDate } from '../Utils/dates';

const MANUAL_INFINITY = Number.MAX_SAFE_INTEGER;

// This store contains all filters that can be applied to the data.
export class FiltersStore {
  _rootStore: RootStore;

  _initialFilterValues = {
    dateFrom: new Date(new Date().getFullYear() - 5, 0, 1), // 5 years ago from today
    dateTo: new Date(),

    rbc_units: [0, MANUAL_INFINITY] as [number, number],
    ffp_units: [0, MANUAL_INFINITY] as [number, number],
    plt_units: [0, MANUAL_INFINITY] as [number, number],
    cryo_units: [0, MANUAL_INFINITY] as [number, number],
    cell_saver_ml: [0, MANUAL_INFINITY] as [number, number],

    b12: null as boolean | null,
    iron: null as boolean | null,
    antifibrinolytic: null as boolean | null,

    los: [0, MANUAL_INFINITY] as [number, number],
    death: null as boolean | null,
    vent: null as boolean | null,
    stroke: null as boolean | null,
    ecmo: null as boolean | null,
  };

  _filterValues: typeof this._initialFilterValues = {
    dateFrom: new Date(new Date().getFullYear() - 5, 0, 1), // 5 years ago from today
    dateTo: new Date(),

    rbc_units: [0, MANUAL_INFINITY],
    ffp_units: [0, MANUAL_INFINITY],
    plt_units: [0, MANUAL_INFINITY],
    cryo_units: [0, MANUAL_INFINITY],
    cell_saver_ml: [0, MANUAL_INFINITY],

    b12: null,
    iron: null,
    antifibrinolytic: null,

    los: [0, MANUAL_INFINITY],
    death: null,
    vent: null,
    stroke: null,
    ecmo: null,
  };

  showFilterHistograms = false;

  histogramData: Record<string, { units: string, count: number }[] | undefined> = {};

  // Initialize store with the root store
  constructor(rootStore: RootStore) {
    this._rootStore = rootStore;
    makeAutoObservable(this);
  }

  get initialFilterValues() {
    return this._initialFilterValues;
  }

  get filterValues() {
    return this._filterValues;
  }

  setFilterValue<T extends keyof typeof this._filterValues>(key: T, value: typeof this._filterValues[T]) {

    let val: any = value;
    if (value instanceof Date) {
      val = value.toISOString();
    }

    this._rootStore.provenanceStore.actions.updateFilter(key as any, val);
  }

  loadState(newFilterValues: typeof this._filterValues) {
    this._filterValues = newFilterValues;
    this._rootStore.updateFilteredData();
  }

  async calculateDefaultFilterValues() {
    // Use duckdb to calculate initial filter values
    const { duckDB } = this._rootStore;
    if (!duckDB) {
      return;
    }

    const result = await duckDB.query(`
      SELECT
        MIN(adm_dtm) AS min_adm,
        MAX(dsch_dtm) AS max_dsch,
        MIN(rbc_units) AS min_rbc,
        MIN(ffp_units) AS min_ffp,
        MAX(ffp_units) AS max_ffp,
        MIN(plt_units) AS min_plt,
        MAX(plt_units) AS max_plt,
        MIN(cryo_units) AS min_cryo,
        MAX(cryo_units) AS max_cryo,
        MIN(cell_saver_ml) AS min_cell_saver,
        MAX(rbc_units) AS max_rbc,
        MAX(cell_saver_ml) AS max_cell_saver,

        MIN(los) AS min_los,
        MAX(los) AS max_los
      FROM visits;
    `);
    const row = result.toArray()[0].toJSON();

    const dateFrom = safeParseDate(row.min_adm);
    const dateTo = safeParseDate(row.max_dsch);
    const rbc_units: [number, number] = [Number(row.min_rbc), Number(row.max_rbc)];
    const ffp_units: [number, number] = [Number(row.min_ffp), Number(row.max_ffp)];
    const plt_units: [number, number] = [Number(row.min_plt), Number(row.max_plt)];
    const cryo_units: [number, number] = [Number(row.min_cryo), Number(row.max_cryo)];
    const cell_saver_ml: [number, number] = [Number(row.min_cell_saver), Number(row.max_cell_saver)];
    const los: [number, number] = [Number(row.min_los), Number(row.max_los)];

    this._filterValues = {
      dateFrom,
      dateTo,

      rbc_units,
      ffp_units,
      plt_units,
      cryo_units,
      cell_saver_ml,

      b12: null,
      iron: null,
      antifibrinolytic: null,

      los,
      death: null,
      vent: null,
      stroke: null,
      ecmo: null,
    };

    this._initialFilterValues = {
      dateFrom,
      dateTo,

      rbc_units,
      ffp_units,
      plt_units,
      cryo_units,
      cell_saver_ml,

      b12: null,
      iron: null,
      antifibrinolytic: null,

      los,
      death: null,
      vent: null,
      stroke: null,
      ecmo: null,
    };
  }

  /**
   * Returns 1 if filters are applied, 0 otherwise.
   */
  get dateFiltersAppliedCount(): number {
    const { dateFrom, dateTo } = this._filterValues;
    // Only count if user has changed from initial values
    return (
      dateFrom.getTime() !== this._initialFilterValues.dateFrom.getTime()
      || dateTo.getTime() !== this._initialFilterValues.dateTo.getTime()
    ) ? 1 : 0;
  }

  /**
   * Returns count of patient outcome filters applied
   */
  get outcomeFiltersAppliedCount(): number {
    let count = 0;
    const keys = ['los', 'death', 'vent', 'stroke', 'ecmo'] as const;
    keys.forEach((key) => {
      if (key === 'los'
        ? (this._filterValues.los[0] !== this._initialFilterValues.los[0]
          || this._filterValues.los[1] !== this._initialFilterValues.los[1])
        : this._filterValues[key] !== this._initialFilterValues[key]
      ) {
        count += 1;
      }
    });
    return count;
  }

  get medicationsFiltersAppliedCount(): number {
    let count = 0;
    const keys = ['b12', 'iron', 'antifibrinolytic'] as const;
    keys.forEach((key) => {
      if (this._filterValues[key] !== this._initialFilterValues[key]) {
        count += 1;
      }
    });
    return count;
  }

  /*
  * Returns count of blood component filters applied
  */
  get bloodComponentFiltersAppliedCount(): number {
    let count = 0;
    const keys = ['rbc_units', 'ffp_units', 'plt_units', 'cryo_units', 'cell_saver_ml'] as const;
    keys.forEach((key) => {
      const [min, max] = this._filterValues[key] as [number, number];
      const [initMin, initMax] = this._initialFilterValues[key] as [number, number];
      if (min !== initMin || max !== initMax) count += 1;
    });
    return count;
  }

  get totalFiltersAppliedCount(): number {
    return this.dateFiltersAppliedCount
      + this.bloodComponentFiltersAppliedCount
      + this.medicationsFiltersAppliedCount
      + this.outcomeFiltersAppliedCount;
  }

  // Resets all filters to their initial values.
  resetAllFilters() {
    // this._filterValues = { ...this._initialFilterValues };
    // this._rootStore.updateFilteredData();
    this._rootStore.provenanceStore.actions.resetAllFilters();
  }

  // Reset only date filters to initial values
  resetDateFilters() {
    // this._filterValues.dateFrom = new Date(this._initialFilterValues.dateFrom);
    // this._filterValues.dateTo = new Date(this._initialFilterValues.dateTo);
    // this._rootStore.updateFilteredData();
    this._rootStore.provenanceStore.actions.updateFilter('dateFrom', this._initialFilterValues.dateFrom.toISOString());
    this._rootStore.provenanceStore.actions.updateFilter('dateTo', this._initialFilterValues.dateTo.toISOString());
  }

  // Reset Blood Component filters to initial values
  resetBloodComponentFilters() {
    const bloodKeys = ['rbc_units', 'ffp_units', 'plt_units', 'cryo_units', 'cell_saver_ml'] as const;
    bloodKeys.forEach((key) => {
      // this._filterValues[key] = [...this._initialFilterValues[key]];
      this._rootStore.provenanceStore.actions.updateFilter(key, [...this._initialFilterValues[key]]);
    });
    // this._rootStore.updateFilteredData();
  }

  // Reset Medication filters to initial values
  resetMedicationsFilters() {
    const medKeys = ['b12', 'iron', 'antifibrinolytic'] as const;
    medKeys.forEach((key) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // this._filterValues[key] = this._initialFilterValues[key] as unknown as any;
      this._rootStore.provenanceStore.actions.updateFilter(key, this._initialFilterValues[key]);
    });
    // this._rootStore.updateFilteredData();
  }

  // Reset Patient Outcome filters to initial values
  resetOutcomeFilters() {
    const outcomeKeys = ['los', 'death', 'vent', 'stroke', 'ecmo'] as const;
    outcomeKeys.forEach((key) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // this._filterValues[key] = this._initialFilterValues[key] as unknown as any;
      this._rootStore.provenanceStore.actions.updateFilter(key, this._initialFilterValues[key]);
    });
    // this._rootStore.updateFilteredData();
  }

  // Cached histogram data for each blood component
  get rbc_unitsHistogramData() {
    return this.histogramData.rbc_units || [];
  }

  get ffp_unitsHistogramData() {
    return this.histogramData.ffp_units || [];
  }

  get plt_unitsHistogramData() {
    return this.histogramData.plt_units || [];
  }

  get cryo_unitsHistogramData() {
    return this.histogramData.cryo_units || [];
  }

  get cell_saver_mlHistogramData() {
    return this.histogramData.cell_saver_ml || [];
  }

  get losHistogramData() {
    return this.histogramData.los || [];
  }

  // Generate histogram data for a given component with duckdb
  async generateHistogramData() {
    const { duckDB } = this._rootStore;
    if (duckDB) {
      // TODO: Not hard coded list
      const components = ['rbc_units', 'ffp_units', 'plt_units', 'cryo_units', 'cell_saver_ml', 'los'];
      const histogramData: Record<string, { units: string, count: number }[]> = {};
      await Promise.all(components.map(async (component) => {
        const [minRange, maxRange] = this._filterValues[component as keyof typeof this._filterValues] as [number, number];
        const numBins = Math.min(20, Math.max(1, maxRange - minRange));
        const result = await duckDB.query(`
          WITH bins AS (
            SELECT equi_width_bins(min(${component}), max(${component}), ${numBins}, false) AS bin
            FROM filteredVisits
          )
          SELECT HISTOGRAM(${component}, bins.bin) AS histogram,
          FROM filteredVisits, bins;
        `);
        histogramData[component] = result.toArray().flatMap((row) => {
          const { histogram } = row.toJSON();
          return Object.entries(histogram.toJSON()).map(([units, count]) => ({ units, count: Number(count) }));
        });
      }));
      this.histogramData = histogramData;
    }
  }
}
