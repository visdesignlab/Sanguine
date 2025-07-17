/* eslint-disable import/no-cycle */
import { makeAutoObservable } from 'mobx';
import { createContext } from 'react';
import { Visit } from '../Types/database';

export class RootStore {
  _allVisits: Visit[];

  constructor() {
    this._allVisits = [];

    makeAutoObservable(this);
  }

  get allVisits() {
    return this._allVisits;
  }

  set allVisits(input) {
    this._allVisits = input;
  }

  get allPatients() {
    return this._allVisits.flatMap((d) => d.patient);
  }

  get allSurgeries() {
    return this.allVisits.flatMap((v) => v.surgeries);
  }

  get filteredCases() {
    return this.allSurgeries.filter((d) => {
      return true; // Placeholder for actual filtering logic
    });
  }
}
export const Store = createContext(new RootStore());
