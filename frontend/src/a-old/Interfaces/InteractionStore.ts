import { makeAutoObservable } from 'mobx';
import {
  clearSelectionFilter, clearSet, outputToFilter, removeFilter, selectSet, setCurrentSelectPatient, updateSelectedPatients, updateProcedureSelection, updateFilteredPatientGroup,
} from './Actions/SelectionActions';
// eslint-disable-next-line import/no-cycle
import { RootStore } from './Store';
import { ProcedureEntry, Surgery } from './Types/DataTypes';
import { normalizeAttribute } from '../HelperFunctions/NormalizeAttributes';
import { EXTRA_PAIR_OPTIONS } from '../Presets/DataDict';

type Attribute = [AttributeName: typeof EXTRA_PAIR_OPTIONS[number], value: string | number | boolean];

export class InteractionStore {
  rootStore: RootStore;

  // Extends the root store --------------------------------------------
  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;

    // Currently interacted case IDs
    this._hoveredCaseIds = [];
    this._selectedCaseIds = [];
    this._brushSelectedCaseIds = [];

    // Currently interacted provider IDs
    this._hoveredAttribute = undefined;
    this._selectedAttributes = undefined;

    // Make the store observable
    makeAutoObservable(this);
  }

  // Hovering ---------------------------------------------------------
  private _hoveredCaseIds: string[];

  private _selectedCaseIds: string[];

  private _brushSelectedCaseIds: number[];

  private _hoveredAttribute?: Attribute;

  private _selectedAttributes?: Attribute[];

  // Case ID Getters and Setters ---------------------------------------------------
  get hoveredCaseIds() {
    return this._hoveredCaseIds;
  }

  set hoveredCaseIds(ids) {
    this._hoveredCaseIds = structuredClone(ids);
  }

  get selectedCaseIds() {
    // Combination of brush selected and selected case IDs
    const selectedCaseIds = [...this._selectedCaseIds, ...this._brushSelectedCaseIds];
    return selectedCaseIds;
  }

  set selectedCaseIds(ids: string[]) {
    this._selectedCaseIds = structuredClone(ids);
    this.applyCombinedSelection();
  }

  set brushSelectedCaseIds(ids: string[]) {
    this._brushSelectedCaseIds = structuredClone(ids);
    this.applyCombinedSelection();
  }

  private applyCombinedSelection() {
    // union both ID arrays and dedupe via a Set
    const allIds = new Set([...this._selectedCaseIds, ...this._brushSelectedCaseIds]);

    // grab only the cases whose CASE_ID is in that union
    const uniqueCases = this.rootStore.filteredCases
      .filter((c) => allIds.has(c.CASE_ID));

    this.updateSelectedPatients(uniqueCases);
  }

  // Attributes Getters and Setters ---------------------------------------------------
  get hoveredAttribute() {
    return this._hoveredAttribute;
  }

  set hoveredAttribute(hoveredAttribute: Attribute | undefined) {
    if (!hoveredAttribute) {
      this.clearHoveredAttribute();
      return;
    }
    const attributeCases = this.rootStore.filteredCases
    // Normalize attribute returns the value of that case's attribute. Compare it to the store's hovered attribute value
      .filter((caseRecord) => (normalizeAttribute(caseRecord[hoveredAttribute![0]], hoveredAttribute![0]) === hoveredAttribute![1]))
      .map((caseRecord) => caseRecord.CASE_ID);
    this._hoveredCaseIds = attributeCases;
    this._hoveredAttribute = hoveredAttribute;
  }

  get selectedAttributes() {
    return this._selectedAttributes;
  }

  // Adding and removing custom selected attributes ---------------------------------------------
  /**
   * Adds all case-IDs matching a single attribute tuple to the current selection.
   *
   * @param selectedAttribute
   *   A tuple [attributeName, value] describing which cases to include.
   */
  addSelectedAttribute(selectedAttribute: Attribute) {
    const [attrName, value] = selectedAttribute;
    // Get the ids of all cases matching this attribute
    const newIds = this.rootStore.filteredCases
      .filter((caseRecord) => normalizeAttribute(caseRecord[attrName], attrName) === value)
      .map((caseRecord) => caseRecord.CASE_ID);

    // Add the new IDs to the current selection
    this.addSelectedCaseIds(newIds);

    // If no selected attributes, create a new array
    if (!this._selectedAttributes) {
      this._selectedAttributes = [selectedAttribute];
    } else if (
      // Otherwise, check if the attribute is already in the list
      !this._selectedAttributes.some(([a, v]) => a === attrName && v === value)
    ) {
      // Add the new attribute to the selected attributes list.
      this._selectedAttributes = [
        ...this._selectedAttributes,
        selectedAttribute,
      ];
    }
  }

  /**
   * Removes all case-IDs matching a single attribute tuple from the current selection.
   *
   * @param selectedAttribute
   *   A tuple [attributeName, value] describing which cases to deselect.
   */
  deselectAttribute(selectedAttribute: Attribute): void {
    const [attrName, value] = selectedAttribute;
    // Remove the attribute from our internal list
    if (this._selectedAttributes) {
      this._selectedAttributes = this._selectedAttributes
        .filter(([a, v]) => !(a === attrName && v === value));
    }
    // Find all case IDs that match this attribute and remove them
    const idsToRemove = this.rootStore.filteredCases
      .filter((caseRecord) => normalizeAttribute(caseRecord[attrName], attrName) === value)
      .map((caseRecord) => caseRecord.CASE_ID);

    this.deselectCaseIds(idsToRemove);
  }

  // Adding and removing custom case IDs ------------------------------------------

  // Add selected case IDs to the current selected case IDs
  addSelectedCaseIds(caseIds: string[]) {
    // Filter out IDs already in the current selection
    const uniqueNewIds = caseIds.filter((id) => !this._selectedCaseIds.includes(id));
    if (uniqueNewIds.length === 0) return;
    const merged = [...this._selectedCaseIds, ...uniqueNewIds];
    this.selectedCaseIds = merged;
  }

  deselectCaseIds(caseIds: string[]) {
    // Remove the passed in case IDs from the selected case IDs
    const filteredCaseIds = this._selectedCaseIds.filter((caseId) => !caseIds.includes(caseId));

    // Get the Surgerys from the selected case IDs
    const selectedCases = this.rootStore.filteredCases
      .filter((caseRecord) => filteredCaseIds.includes(caseRecord.case_id));

    // Set the selected case IDs in this store.
    this._selectedCaseIds = filteredCaseIds;

    // Set the selected case IDs in this provenance.
    this.updateSelectedPatients(selectedCases);
  }

  // Clear interacted case IDs and attributes -----------------------------------
  clearHoveredAttribute() {
    this._hoveredAttribute = undefined;
    this.hoveredCaseIds = [];
  }

  clearSelectedCases() {
    this._selectedAttributes = undefined;
    this.selectedCaseIds = [];
  }

  clearBrushSelectedCases() {
    this.brushSelectedCaseIds = [];
  }

  // Provenance  --------------------------------------------------------------
  get provenance() {
    return this.rootStore.provenance;
  }

  updateFilteredPatientGroup(caseList: Surgery[]) {
    this.provenance.apply(updateFilteredPatientGroup(caseList));
  }

  updateProcedureSelection(newProcedures: ProcedureEntry, removing: boolean, parentProcedure?: ProcedureEntry) {
    this.provenance.apply(updateProcedureSelection(newProcedures, removing, parentProcedure));
  }

  updateSelectedPatients(caseList: Surgery[]) {
    this.provenance.apply(updateSelectedPatients(caseList));
  }

  setCurrentSelectPatient(newCase: Surgery | null) {
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
