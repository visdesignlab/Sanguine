import { makeAutoObservable } from 'mobx';
import {
  BloodComponent, BloodComponentOptions, HemoOption, ScatterYOptions,
} from '../Presets/DataDict';
import {
  changeBloodFilter, changeCostConfig, changeOutcomeFilter, changeSurgeryUrgencySelection, clearAllFilter, dateRangeChange, loadPreset, resetBloodFilter, toggleShowZero, changeSurgeonCasesPerformed,
} from './Actions/ProjectConfigActions';
// eslint-disable-next-line import/no-cycle
import { RootStore } from './Store';
import { LayoutElement } from './Types/LayoutTypes';

export class ProjectConfigStore {
  rootStore: RootStore;

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

  setSavedState = (stateList: string[]) => {
    this.savedState = stateList;
  };

  get provenance() {
    return this.rootStore.provenance;
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

  changeSurgeonCasesPerformed(input: [number, number]) {
    this.provenance.apply(changeSurgeonCasesPerformed(input));
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

  changeBloodFilter(componentName: BloodComponent | HemoOption, newRange: [number, number]) {
    this.provenance.apply(changeBloodFilter(componentName, newRange));
  }

  resetBloodFilter(type: typeof BloodComponentOptions | typeof ScatterYOptions) {
    this.provenance.apply(resetBloodFilter(type));
  }

  clearAllFilter() {
    this.provenance.apply(clearAllFilter());
  }
}
