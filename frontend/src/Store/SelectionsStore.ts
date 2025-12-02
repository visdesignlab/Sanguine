import { makeAutoObservable, observable } from 'mobx';

import type { RootStore } from './Store';
import { expandTimePeriod } from '../Utils/expandTimePeriod';

export class SelectionsStore {
  _rootStore: RootStore;

  // Initialize store with the root store
  constructor(rootStore: RootStore) {
    this._rootStore = rootStore;
    makeAutoObservable(this, {
      selectedVisits: observable.ref,
      selectedTimePeriods: observable.ref,
      selectedVisitNos: observable.ref,
    });
  }

  // TODO: replace 'any' with actual visit type

  selectedTimePeriods: string[] = [];

  selectedDepartments: string[] = [];

  selectedVisits: { visit_no: number, [key: string]: unknown }[] = [];

  selectedVisitNos: number[] = [];

  async addSelectedTimePeriod(timePeriod: string) {
    if (!timePeriod) return;

    const next = new Set(this.selectedTimePeriods);
    for (const p of expandTimePeriod(timePeriod)) next.add(p);

    // this.selectedTimePeriods = Array.from(next);
    // this.updateSelectedVisits();
    this._rootStore.provenanceStore.actions.updateSelection(Array.from(next));
  }

  async removeSelectedTimePeriod(timePeriod: string) {
    if (!timePeriod) return;

    const next = new Set(this.selectedTimePeriods);
    for (const p of expandTimePeriod(timePeriod)) next.delete(p);

    // this.selectedTimePeriods = Array.from(next);
    // this.updateSelectedVisits();
    this._rootStore.provenanceStore.actions.updateSelection(Array.from(next));
  }

  loadState(selectedTimePeriods: string[]) {
    this.selectedTimePeriods = selectedTimePeriods;
    this.updateSelectedVisits();
  }

  async getVisitInfo(visitNo: number) {
    if (!this._rootStore.duckDB) return null;
    const query = `
      SELECT *
      FROM filteredVisits
      WHERE visit_no = ${visitNo}
    `;
    const result = await this._rootStore.duckDB.query(query);
    return result.toArray().map((row) => row.toJSON())[0] || null;
  }

  async updateSelectedVisits() {
    if (!this._rootStore.duckDB) return;

    // Only match month-level selections (e.g., 2020-Jan)
    const monthRe = /^\d{4}-[A-Za-z]{3}$/;
    const months = this.selectedTimePeriods.filter((p) => monthRe.test(p));

    if (months.length === 0) {
      this.selectedVisits = [];
      return;
    }

    // Escape single quotes for SQL strings
    const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

    const query = `
      SELECT visit_no
      FROM filteredVisits
      WHERE month IN (${months.map(q).join(', ')})
    `;
    const result = await this._rootStore.duckDB.query(query);

    this.selectedVisitNos = result.toArray().map((row) => Number(row.toJSON().visit_no));
  }
}
