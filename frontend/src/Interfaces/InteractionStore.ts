import { makeAutoObservable, reaction} from 'mobx';
import {
  clearSelectionFilter, clearSet, outputToFilter, removeFilter, selectSet, setCurrentSelectPatient, updateSelectedPatients, updateProcedureSelection, updateFilteredPatientGroup,
} from './Actions/SelectionActions';
// eslint-disable-next-line import/no-cycle
import { RootStore } from './Store';
import { ProcedureEntry, SingleCasePoint } from './Types/DataTypes';
import { normalizeAttribute } from '../HelperFunctions/NormalizeAttributes';

type HoveredAttribute = [AttributeName: string, value: string | number | boolean];

export class InteractionStore {
  rootStore: RootStore;

  // Extends the root store --------------------------------------------
  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;

    // Currently interacted case IDs
    this._hoveredCaseIds = [];
    this._selectedCaseIds = [];

    // Currently interacted provider IDs
    this._hoveredAttribute = undefined;
    this._selectedAttribute = undefined;

    // Colors
    this.smallHoverColor = '#FFCF76';
    this.smallSelectColor = '#E29609';
    this.backgroundHoverColor = '#FFE8BE';
    this.backgroundSelectedColor = '#FFCF76';

    // Make the store observable
    makeAutoObservable(this);
  }

  // Hovering ---------------------------------------------------------
  private _hoveredCaseIds: number[];

  private _selectedCaseIds: number[];

  // Color of the smaller mark hover
  public readonly smallHoverColor: string;

  public readonly smallSelectColor: string;

  // Color of a larger background hover
  public readonly backgroundHoverColor: string;

  public readonly backgroundSelectedColor: string;

  // Interacted Attributes
  private _hoveredAttribute?: HoveredAttribute;

  private _selectedAttribute?: HoveredAttribute;

  get hoveredCaseIds() {
    // If there's a hovered attribute, filter the cases based on that
    if (this._hoveredAttribute !== undefined) {
      return this.rootStore.filteredCases
        // Normalize attribute returns the value of that case's attribute. Compare it to the store's hovered attribute value
        .filter((caseRecord) => (normalizeAttribute(caseRecord[this._hoveredAttribute![0]], this._hoveredAttribute![0]) === this._hoveredAttribute![1]))
        .map((caseRecord) => caseRecord.CASE_ID);
    }

    return this._hoveredCaseIds;
  }

  set hoveredCaseIds(ids: number[]) {
    this._hoveredCaseIds = structuredClone(ids);
  }

  get selectedCaseIds() {
    // If there's a selected attribute, filter the cases based on that
    if (this._selectedAttribute !== undefined) {
      return this.rootStore.filteredCases
        .filter((caseRecord) => (normalizeAttribute(caseRecord[this._selectedAttribute![0]], this._selectedAttribute![0]) === this._selectedAttribute![1]))
        .map((caseRecord) => caseRecord.CASE_ID);
    }
    return this._selectedCaseIds;
  }

  set selectedCaseIds(ids: number[]) {
    // Sets the selected case IDs to the passed in IDs
    this._selectedCaseIds = structuredClone(ids);

    // Get the SingleCasePoints which match the ID's
    const selectedCases = this.rootStore.filteredCases
      .filter((caseRecord) => ids.includes(caseRecord.CASE_ID));

    // Update the selected patient group with the selected cases
    this.updateSelectedPatients(selectedCases);
  }

  get hoveredAttribute() {
    return this._hoveredAttribute;
  }

  set hoveredAttribute(hoveredAttribute: HoveredAttribute | undefined) {
    this._hoveredAttribute = hoveredAttribute;
  }

  clearHoveredAttribute() {
    this._hoveredAttribute = undefined;
    this.hoveredCaseIds = [];
  }

  clearSelectedAttribute() {
    this._selectedAttribute = undefined;
    this.selectedCaseIds = [];
  }

  clearSelectedCases() {
    this.clearSelectedAttribute();
    this._selectedCaseIds = [];
    this.selectedCaseIds = [];
  }

  // Watch for changes to the state.currentSelectedPatientGroup and update the selected case IDs accordingly


  get selectedAttribute() {
    return this._selectedAttribute;
  }

  set selectedAttribute(selectedAttribute: HoveredAttribute | undefined) {
    this.clearSelectedAttribute();
    this._selectedAttribute = selectedAttribute;

    let selectedCaseIds: number[] = [];
    // Update the selected case IDs based on the selected attribute
    if (this._selectedAttribute !== undefined) {
      selectedCaseIds = this.rootStore.filteredCases
        .filter((caseRecord) => (normalizeAttribute(caseRecord[this._selectedAttribute![0]], this._selectedAttribute![0]) === this._selectedAttribute![1]))
        .map((caseRecord) => caseRecord.CASE_ID);
    }
    // Get the SingleCasePoints which match the ID's
    const selectedCases = this.rootStore.filteredCases
      .filter((caseRecord) => selectedCaseIds.includes(caseRecord.CASE_ID));
    this.updateSelectedPatients(selectedCases);
  }

  // Selections --------------------------------------------------------
  get provenance() {
    return this.rootStore.provenance;
  }

  updateFilteredPatientGroup(caseList: SingleCasePoint[]) {
    this.provenance.apply(updateFilteredPatientGroup(caseList));
  }

  updateProcedureSelection(newProcedures: ProcedureEntry, removing: boolean, parentProcedure?: ProcedureEntry) {
    this.provenance.apply(updateProcedureSelection(newProcedures, removing, parentProcedure));
  }

  updateSelectedPatients(caseList: SingleCasePoint[]) {
    this.provenance.apply(updateSelectedPatients(caseList));
  }

  setCurrentSelectPatient(newCase: SingleCasePoint | null) {
    this.provenance.apply(setCurrentSelectPatient(newCase));
  }

  clearSelectionFilter() {
    this.provenance.apply(clearSelectionFilter());
  }

  outputToFilter() {
    this.provenance.apply(outputToFilter());
  }

  removeFilter(filterNameToRemove: string) {
    this.provenance.apply(removeFilter(filterNameToRemove));
  }

  selectSet(selectSetName: string, selectSetInput: string, replace: boolean) {
    this.provenance.apply(selectSet(selectSetName, selectSetInput, replace));
  }

  clearSet(selectSetName: string) {
    this.provenance.apply(clearSet(selectSetName));
  }
}
