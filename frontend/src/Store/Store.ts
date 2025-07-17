/* eslint-disable import/no-cycle */
import { makeAutoObservable } from 'mobx';
import { createContext } from 'react';
import { Visit } from '../Types/database';
import { DashboardStore } from './DashboardStore';

export class RootStore {

  // Provenance


  // Stores
  dashboardStore = new DashboardStore(this);
  // providersStore:
  // exploreStore:


  // Visits - Main data type
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
}
export const Store = createContext(new RootStore());
