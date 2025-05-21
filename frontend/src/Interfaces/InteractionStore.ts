import { makeAutoObservable } from 'mobx';
import {
  clearSelectionFilter, clearSet, outputToFilter, removeFilter, selectSet, setCurrentSelectPatient, updateSelectedPatients, updateProcedureSelection, updateFilteredPatientGroup,
} from './Actions/SelectionActions';
// eslint-disable-next-line import/no-cycle
import { RootStore } from './Store';
import { ProcedureEntry, SingleCasePoint } from './Types/DataTypes';
import { normalizeAttribute } from '../HelperFunctions/NormalizeAttributes';

type Attribute = [AttributeName: string, value: string | number | boolean];

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
    this._selectedAttributes = undefined;

    // Make the store observable
    makeAutoObservable(this);
  }

  // Hovering ---------------------------------------------------------
  private _hoveredCaseIds: number[];

  private _selectedCaseIds: number[];

  // Interacted Attributes
  private _hoveredAttribute?: Attribute;

  private _selectedAttributes?: Attribute[];

  get hoveredCaseIds() {
    return this._hoveredCaseIds;
  }

  set hoveredCaseIds(ids: number[]) {
    this._hoveredCaseIds = structuredClone(ids);
  }

  get selectedCaseIds() {
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

  clearHoveredAttribute() {
    this._hoveredAttribute = undefined;
    this.hoveredCaseIds = [];
  }

  clearSelectedCases() {
    this._selectedAttributes = undefined;
    this.selectedCaseIds = [];
  }

  get selectedAttributes() {
    return this._selectedAttributes;
  }

  set selectedAttributes(selectedAttributes: Attribute[] | undefined) {
    this.clearSelectedCases();
    this._selectedAttributes = selectedAttributes;

    let selectedCaseIds: number[] = [];
    // Get all case IDs which match any of the selected attributes
    if (this._selectedAttributes) {
      const idSet = new Set<number>();
      this.rootStore.filteredCases.forEach((caseRecord) => {
        this._selectedAttributes!.forEach(([attrName, value]) => {
          if (normalizeAttribute(caseRecord[attrName], attrName) === value) {
            idSet.add(caseRecord.CASE_ID);
          }
        });
      });
      selectedCaseIds = Array.from(idSet);
    }
    // Get the SingleCasePoints from the selected case IDs
    const selectedCases = this.rootStore.filteredCases
      .filter((caseRecord) => selectedCaseIds.includes(caseRecord.CASE_ID));

    // Set the selected case IDs in this store.
    this._selectedCaseIds = selectedCaseIds;
    // Update the selected cases in provenance.
    this.updateSelectedPatients(selectedCases);
  }

  /**
   * Adds all case-IDs matching any of the provided attributes to the current selection.
   *
   * @param selectedAttributes
   *   An array of tuples [attributeName, value] describing which cases to include.
   */
  addSelectedAttributes(selectedAttributes: Attribute[] | undefined) {
    if (!selectedAttributes?.length) return;
    selectedAttributes.forEach((attr) => this.addSelectedAttribute(attr));
  }

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

  // Add selected case IDs to the current selected case IDs
  addSelectedCaseIds(caseIds: number[]) {
    // Filter out IDs already in the current selection
    const uniqueNewIds = caseIds.filter((id) => !this._selectedCaseIds.includes(id));
    if (uniqueNewIds.length === 0) return;
    const merged = [...this._selectedCaseIds, ...uniqueNewIds];
    this.selectedCaseIds = merged;
  }

  deselectCaseIds(caseIds: number[]) {
    // Remove the passed in case IDs from the selected case IDs
    const filteredCaseIds = this._selectedCaseIds.filter((caseId) => !caseIds.includes(caseId));

    // Get the SingleCasePoints from the selected case IDs
    const selectedCases = this.rootStore.filteredCases
      .filter((caseRecord) => filteredCaseIds.includes(caseRecord.CASE_ID));

    // Set the selected case IDs in this store.
    this._selectedCaseIds = filteredCaseIds;

    // Set the selected case IDs in this provenance.
    this.updateSelectedPatients(selectedCases);
  }

  /**
   * Removes all case-IDs matching any of the provided attributes from the current selection.
   *
   * @param selectedAttributes
   *   An array of tuples [attributeName, value] describing which cases to deselect.
   */
  deselectAttributes(selectedAttributes: Attribute[]): void {
    if (!selectedAttributes?.length) return;
    selectedAttributes.forEach((attr) => this.deselectAttribute(attr));
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
