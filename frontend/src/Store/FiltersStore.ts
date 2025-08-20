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
  };

  _filterValues: typeof this._initialFilterValues = {
    dateFrom: new Date(new Date().getFullYear() - 5, 0, 1), // 5 years ago from today
    dateTo: new Date(),
    visitRBCs: [0, Infinity],
    visitFFPs: [0, Infinity],
    visitPLTs: [0, Infinity],
    visitCryo: [0, Infinity],
    visitCellSaver: [0, Infinity],
  };

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
      };
    }, {
      visitRBCs: [Infinity, -Infinity] as [number, number],
      visitFFPs: [Infinity, -Infinity] as [number, number],
      visitPLTs: [Infinity, -Infinity] as [number, number],
      visitCryo: [Infinity, -Infinity] as [number, number],
      visitCellSaver: [Infinity, -Infinity] as [number, number],
    });

    this._filterValues = {
      dateFrom,
      dateTo,
      visitRBCs,
      visitFFPs,
      visitPLTs,
      visitCryo,
      visitCellSaver,
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

  /*
  * Returns count of blood component filters applied
  */
  get bloodComponentFiltersAppliedCount(): number {
    let count = 0;
    const keys: (keyof typeof this._filterValues)[] = [
      'visitRBCs', 'visitFFPs', 'visitPLTs', 'visitCryo', 'visitCellSaver',
    ];
    keys.forEach((key) => {
      const [min, max] = this._filterValues[key] as [number, number];
      const [initMin, initMax] = this._initialFilterValues[key] as [number, number];
      if (min !== initMin || max !== initMax) count += 1;
    });
    return count;
  }
}
