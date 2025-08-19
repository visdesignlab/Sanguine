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
  };

  _filterValues: typeof this._initialFilterValues = {
    dateFrom: new Date(new Date().getFullYear() - 5, 0, 1), // 5 years ago from today
    dateTo: new Date(),
    visitRBCs: [0, Infinity],
    visitFFPs: [0, Infinity],
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

    const { visitRBCs, visitFFPs } = allVisits.reduce((acc, visit) => {
      const rbcUnits = visit.transfusions.reduce((sum, transfusion) => sum + (transfusion.rbc_units || 0), 0);
      const ffpUnits = visit.transfusions.reduce((sum, transfusion) => sum + (transfusion.ffp_units || 0), 0);
      return {
        visitRBCs: [Math.min(acc.visitRBCs[0], rbcUnits), Math.max(acc.visitRBCs[1], rbcUnits)] as [number, number],
        visitFFPs: [Math.min(acc.visitFFPs[0], ffpUnits), Math.max(acc.visitFFPs[1], ffpUnits)] as [number, number],
      };
    }, {
      visitRBCs: [Infinity, -Infinity] as [number, number],
      visitFFPs: [Infinity, -Infinity] as [number, number],
    });

    this._filterValues = {
      dateFrom,
      dateTo,
      visitRBCs,
      visitFFPs,
    };

    this._initialFilterValues = { ...this._filterValues };
  }
}
