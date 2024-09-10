import { makeAutoObservable } from 'mobx';
import { BloodComponentOptions, ScatterYOptions } from '../Presets/DataDict';
import {
  changeBloodFilter, changeCostConfig, changeOutcomeFilter, changeSurgeryUrgencySelection, clearAllFilter, dateRangeChange, loadPreset, resetBloodFilter, toggleShowZero,
} from './Actions/ProjectConfigActions';
// eslint-disable-next-line import/no-cycle
import { RootStore } from './Store';
import { LayoutElement } from './Types/LayoutTypes';

export class ProjectConfigStore {
  rootStore: RootStore;

  private _isLoggedIn: boolean;

  private _topMenuBarAddMode: boolean;

  loadedStateName: string;

  openSnackBar: boolean;

  snackBarMessage: string;

  largeFont: boolean;

  savedState: string[];

  snackBarIsError: boolean;

  privateMode: boolean;

  stateToUpdate: string;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    this._isLoggedIn = !(import.meta.env.VITE_REQUIRE_LOGIN === 'true');
    this.largeFont = false;
    this.privateMode = false;
    this._topMenuBarAddMode = false;
    this.openSnackBar = false;
    this.snackBarMessage = '';
    this.snackBarIsError = false;
    this.loadedStateName = '';
    this.stateToUpdate = '';
    this.savedState = [];

    makeAutoObservable(this);
  }

  checkIfInSavedState = (stateName: string) => this.savedState.includes(stateName);

  addNewState = (stateName: string) => {
    this.savedState.push(stateName);
  };

  get provenance() {
    return this.rootStore.provenance;
  }

  set isLoggedIn(input: boolean) {
    this._isLoggedIn = input;
  }

  get isLoggedIn() {
    return this._isLoggedIn;
  }

  set topMenuBarAddMode(input: boolean) {
    this._topMenuBarAddMode = input;
  }

  get topMenuBarAddMode() {
    return this._topMenuBarAddMode;
  }

  changeSurgeryUrgencySelection(input: [boolean, boolean, boolean]) {
    this.provenance.apply(changeSurgeryUrgencySelection(input));
  }

  changeCostConfig(componentName: string, newCost: number) {
    this.provenance.apply(changeCostConfig(componentName, newCost));
  }

  changeOutcomeFilter(newOutcomeFilter: string[]) {
    this.provenance.apply(changeOutcomeFilter(newOutcomeFilter));
  }

  toggleShowZero(showZero: boolean) {
    this.provenance.apply(toggleShowZero(showZero));
  }

  dateRangeChange(dateRange: number[]) {
    this.provenance.apply(dateRangeChange(dateRange));
  }

  loadPreset(layoutInput: LayoutElement[]) {
    this.provenance.apply(loadPreset(layoutInput));
  }

  changeBloodFilter(componentName: string, newRange: [number, number]) {
    this.provenance.apply(changeBloodFilter(componentName, newRange));
  }

  resetBloodFilter(type: typeof BloodComponentOptions | typeof ScatterYOptions) {
    this.provenance.apply(resetBloodFilter(type));
  }

  clearAllFilter() {
    this.provenance.apply(clearAllFilter());
  }
}
