import { makeAutoObservable } from 'mobx';
import type { RootStore } from './Store';
import { safeParseDate } from '../Utils/store';

// This store contains all filters that can be applied to the data.
export class FiltersStore {
  _rootStore: RootStore;

  _initialFilterValues = {
    dateFrom: new Date(new Date().getFullYear() - 5, 0, 1), // 5 years ago from today
    dateTo: new Date(),

    visitRBCs: [0, Infinity] as [number, number],
    visitFFPs: [0, Infinity] as [number, number],
    visitPLTs: [0, Infinity] as [number, number],
    visitCryo: [0, Infinity] as [number, number],
    visitCellSaver: [0, Infinity] as [number, number],

    b12: null as boolean | null,
    iron: null as boolean | null,
    antifibrinolytic: null as boolean | null,

    los: [0, Infinity] as [number, number],
    death: null as boolean | null,
    vent: null as boolean | null,
    stroke: null as boolean | null,
    ecmo: null as boolean | null,
  };

  _filterValues: typeof this._initialFilterValues = {
    dateFrom: new Date(new Date().getFullYear() - 5, 0, 1), // 5 years ago from today
    dateTo: new Date(),

    visitRBCs: [0, Infinity],
    visitFFPs: [0, Infinity],
    visitPLTs: [0, Infinity],
    visitCryo: [0, Infinity],
    visitCellSaver: [0, Infinity],

    b12: null,
    iron: null,
    antifibrinolytic: null,

    los: [0, Infinity],
    death: null,
    vent: null,
    stroke: null,
    ecmo: null,
  };

  showFilterHistograms = false;

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
    this._filterValues[key] = value;
  }

  calculateDefaultFilterValues() {
    // Calculate default date range based on all visits
    const { allVisits } = this._rootStore;
    if (allVisits.length === 0) {
      return;
    }

    const admDates = allVisits.map((visit) => safeParseDate(visit.adm_dtm).getTime());
    const dschDates = allVisits.map((visit) => safeParseDate(visit.dsch_dtm).getTime());
    const dateFrom = new Date(Math.min(...admDates));
    const dateTo = new Date(Math.max(...dschDates));

    const {
      visitRBCs,
      visitFFPs,
      visitPLTs,
      visitCryo,
      visitCellSaver,
      los,
    } = allVisits.reduce((acc, visit) => {
      const rbcUnits = visit.transfusions.reduce((sum, transfusion) => sum + (transfusion.rbc_units || 0), 0);
      const ffpUnits = visit.transfusions.reduce((sum, transfusion) => sum + (transfusion.ffp_units || 0), 0);
      const pltUnits = visit.transfusions.reduce((sum, transfusion) => sum + (transfusion.plt_units || 0), 0);
      const cryoUnits = visit.transfusions.reduce((sum, transfusion) => sum + (transfusion.cryo_units || 0), 0);
      const cellSaverMl = visit.transfusions.reduce((sum, transfusion) => sum + (transfusion.cell_saver_ml || 0), 0);

      return {
        visitRBCs: [Math.min(acc.visitRBCs[0], rbcUnits), Math.max(acc.visitRBCs[1], rbcUnits)] as [number, number],
        visitFFPs: [Math.min(acc.visitFFPs[0], ffpUnits), Math.max(acc.visitFFPs[1], ffpUnits)] as [number, number],
        visitPLTs: [Math.min(acc.visitPLTs[0], pltUnits), Math.max(acc.visitPLTs[1], pltUnits)] as [number, number],
        visitCryo: [Math.min(acc.visitCryo[0], cryoUnits), Math.max(acc.visitCryo[1], cryoUnits)] as [number, number],
        visitCellSaver: [Math.min(acc.visitCellSaver[0], cellSaverMl), Math.max(acc.visitCellSaver[1], cellSaverMl)] as [number, number],
        los: [Math.min(acc.los[0], visit.los || 0), Math.max(acc.los[1], visit.los || 0)] as [number, number],
      };
    }, {
      visitRBCs: [Infinity, -Infinity] as [number, number],
      visitFFPs: [Infinity, -Infinity] as [number, number],
      visitPLTs: [Infinity, -Infinity] as [number, number],
      visitCryo: [Infinity, -Infinity] as [number, number],
      visitCellSaver: [Infinity, -Infinity] as [number, number],
      los: [Infinity, -Infinity] as [number, number],
    });

    this._filterValues = {
      dateFrom,
      dateTo,

      visitRBCs,
      visitFFPs,
      visitPLTs,
      visitCryo,
      visitCellSaver,

      b12: null,
      iron: null,
      antifibrinolytic: null,

      los,
      death: null,
      vent: null,
      stroke: null,
      ecmo: null,
    };

    this._initialFilterValues = { ...this._filterValues };
  }

  /**
   * Returns 1 if filters are applied, 0 otherwise.
   */
  get dateFiltersAppliedCount(): number {
    const { dateFrom, dateTo } = this._filterValues;
    // Only count if user has changed from initial values
    return (dateFrom.getTime() !== this._initialFilterValues.dateFrom.getTime()
            || dateTo.getTime() !== this._initialFilterValues.dateTo.getTime()) ? 1 : 0;
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
    const keys = ['visitRBCs', 'visitFFPs', 'visitPLTs', 'visitCryo', 'visitCellSaver'] as const;
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

  /**
   * Resets all filters to their initial values.
   */
  resetDateFilters() {
    this._filterValues.dateFrom = new Date(this._initialFilterValues.dateFrom);
    this._filterValues.dateTo = new Date(this._initialFilterValues.dateTo);
  }

  /**
  * Reset only blood component filters to initial values
  */
  resetBloodComponentFilters() {
    const bloodKeys = ['visitRBCs', 'visitFFPs', 'visitPLTs', 'visitCryo', 'visitCellSaver'] as const;
    bloodKeys.forEach((key) => {
      this._filterValues[key] = [...this._initialFilterValues[key]];
    });
  }

  resetMedicationsFilters() {
    const medKeys = ['b12', 'iron', 'antifibrinolytic'] as const;
    medKeys.forEach((key) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this._filterValues[key] = this._initialFilterValues[key] as unknown as any;
    });
  }

  // Reset Patient Outcome filters to initial values
  resetOutcomeFilters() {
    const outcomeKeys = ['los', 'death', 'vent', 'stroke', 'ecmo'] as const;
    outcomeKeys.forEach((key) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this._filterValues[key] = this._initialFilterValues[key] as unknown as any;
    });
  }

  // Cached histogram data for each blood component
  get visitRBCsHistogramData() {
    return this._getHistogramData('visitRBCs');
  }

  get visitFFPsHistogramData() {
    return this._getHistogramData('visitFFPs');
  }

  get visitPLTsHistogramData() {
    return this._getHistogramData('visitPLTs');
  }

  get visitCryoHistogramData() {
    return this._getHistogramData('visitCryo');
  }

  get visitCellSaverHistogramData() {
    return this._getHistogramData('visitCellSaver');
  }

  get losHistogramData() {
    return this._getHistogramData('los');
  }

  // Internal method for computing histogram data
  private _getHistogramData(
    component: 'visitRBCs' | 'visitFFPs' | 'visitPLTs' | 'visitCryo' | 'visitCellSaver' | 'los',
  ): Array<{ units: string, count: number }> {
    const filterKeyMap = {
      visitRBCs: 'rbc_units',
      visitFFPs: 'ffp_units',
      visitPLTs: 'plt_units',
      visitCryo: 'cryo_units',
      visitCellSaver: 'cell_saver_ml',
      los: 'los',
    } as const;
    const visitKey = filterKeyMap[component];
    const [min, max] = this._initialFilterValues[component];
    const visits = this._rootStore.allVisits;
    const data: Array<{ units: string, count: number }> = [];

    for (let binStart = min; binStart < max; binStart += 1) {
      const binEnd = binStart + 1;
      const isLastBin = binEnd === max;
      const count = visits.filter((v) => (isLastBin
        ? v[visitKey] >= binStart && v[visitKey] <= binEnd
        : v[visitKey] >= binStart && v[visitKey] < binEnd)).length;
      data.push({ units: `${binStart}-${binEnd}`, count });
    }
    return data;
  }
}
