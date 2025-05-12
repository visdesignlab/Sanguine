import { makeAutoObservable } from 'mobx';
import {
  clearSelectionFilter, clearSet, outputToFilter, removeFilter, selectSet, setCurrentSelectPatient, updateBrushPatient, updateProcedureSelection, updateSelectedPatientGroup,
} from './Actions/SelectionActions';
// eslint-disable-next-line import/no-cycle
import { RootStore } from './Store';
import { ProcedureEntry, SingleCasePoint } from './Types/DataTypes';

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
    // Update the hovered case IDs based on the hovered provider IDs
    if (this._hoveredAttribute !== undefined) {
      return this.rootStore.filteredCases
        .filter((caseRecord) => caseRecord[this._hoveredAttribute![0]] === this._hoveredAttribute![1])
        .map((caseRecord) => caseRecord.CASE_ID);
    }

    return this._hoveredCaseIds;
  }

  set hoveredCaseIds(ids: number[]) {
    this._hoveredCaseIds = structuredClone(ids);
  }

  get selectedCaseIds() {
    if (this._selectedAttribute !== undefined) {
      return this.rootStore.filteredCases
        .filter((caseRecord) => this._selectedAttribute && caseRecord[this._selectedAttribute[0]] === this._selectedAttribute[1])
        .map((caseRecord) => caseRecord.CASE_ID);
    }
    return this._selectedCaseIds; // Fixed: return _selectedCaseIds instead of _hoveredCaseIds
  }

  set selectedCaseIds(ids: number[]) {
    this._selectedCaseIds = structuredClone(ids);
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
  }

  get selectedAttribute() {
    return this._selectedAttribute;
  }

  set selectedAttribute(selectedAttribute: HoveredAttribute | undefined) {
    this._selectedAttribute = selectedAttribute;
  }

  // Selections --------------------------------------------------------
  get provenance() {
    return this.rootStore.provenance;
  }

  updateSelectedPatientGroup(caseList: SingleCasePoint[]) {
    this.provenance.apply(updateSelectedPatientGroup(caseList));
  }

  updateProcedureSelection(newProcedures: ProcedureEntry, removing: boolean, parentProcedure?: ProcedureEntry) {
    this.provenance.apply(updateProcedureSelection(newProcedures, removing, parentProcedure));
  }

  updateBrush(caseList: SingleCasePoint[]) {
    this.provenance.apply(updateBrushPatient(caseList));
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
