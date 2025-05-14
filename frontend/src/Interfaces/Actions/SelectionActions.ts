import { createAction } from '@visdesignlab/trrack';
import { ProcedureEntry, SingleCasePoint } from '../Types/DataTypes';
import { ActionEvents } from '../Types/EventTypes';
import { ApplicationState } from '../Types/StateTypes';

// This is a filter
export const updateFilteredPatientGroup = createAction<ApplicationState, [SingleCasePoint[]], ActionEvents>((state, caseList) => {
  state.currentFilteredPatientGroup = caseList;
}).setLabel('updatePatientGroup');

// "removing" only applies to parent procedure
export const updateProcedureSelection = createAction<ApplicationState, [ProcedureEntry, boolean, ProcedureEntry?], ActionEvents>((state, newProcedureSelection, removing, parentProcedureSelection?) => {
  // if there is a parentProcedure, then this parent procedure must be already selected
  if (parentProcedureSelection) {
    // find the parent procedure
    let parentProcedure = state.proceduresSelection.find((d) => d.procedureName === parentProcedureSelection.procedureName);
    if (!parentProcedure) {
      parentProcedure = structuredClone(parentProcedureSelection);
            parentProcedure!.overlapList = [{
              procedureName: newProcedureSelection.procedureName,
              count: newProcedureSelection.count,
              codes: newProcedureSelection.codes,
            }];
            state.proceduresSelection.push(parentProcedure!);
    } else if (removing) {
      parentProcedure.overlapList = parentProcedure.overlapList!.filter((d) => d.procedureName !== newProcedureSelection.procedureName);
    } else {
      parentProcedure.overlapList = (parentProcedure.overlapList || []).concat([{
        procedureName: newProcedureSelection.procedureName,
        count: newProcedureSelection.count,
        codes: newProcedureSelection.codes,
      }]);
    }
  } else if (removing) {
    state.proceduresSelection = state.proceduresSelection.filter((d) => d.procedureName !== newProcedureSelection.procedureName);
  } else {
    state.proceduresSelection.push({ ...newProcedureSelection, overlapList: [] });
  }
}).setLabel('updateProcedureSelection');

export const updateBrushPatient = createAction<ApplicationState, [SingleCasePoint[]], ActionEvents>((state, caseList) => {
  state.currentSelectedPatientGroup = caseList;
  if (caseList.length === 0) {
    state.currentSelectPatient = null;
  }
}).setLabel('updateBrush');

export const setCurrentSelectPatient = createAction<ApplicationState, [SingleCasePoint | null], ActionEvents>((state, newCase) => {
  state.currentSelectPatient = newCase;
}).setLabel('updateCaseSelect');

export const selectSet = createAction<ApplicationState, [string, string, boolean], ActionEvents>((state, selectSetName, selectSetInput, replace) => {
  // this current set name already exist
  if (state.currentSelectSet.filter((d) => d.setName === selectSetName).length > 0) {
    state.currentSelectSet = state.currentSelectSet.map((d) => {
      if (d.setName === selectSetName) {
        if (replace) {
          return { setName: selectSetName, setValues: [selectSetInput] };
        }
        if (!d.setValues.includes(selectSetInput)) {
          return { setName: selectSetName, setValues: d.setValues.concat([selectSetInput]) };
        }
        return d;
      }
      return d;
    });
  } else {
    state.currentSelectSet.push({ setName: selectSetName, setValues: [selectSetInput] });
  }
}).setLabel('addToSelected');

export const clearSet = createAction<ApplicationState, [string], ActionEvents>((state, selectNameToRemove) => {
  state.currentSelectSet = state.currentSelectSet.filter((d) => d.setName !== selectNameToRemove);
}).setLabel('selectSetToRemove');

export const clearSelectionFilter = createAction<ApplicationState, [], ActionEvents>((state) => {
  state.currentFilteredPatientGroup = [];
  state.currentOutputFilterSet = [];
}).setLabel('clearSelectionFilter');

export const outputToFilter = createAction<ApplicationState, [], ActionEvents>((state) => {
  state.currentOutputFilterSet = state.currentSelectSet;
  state.currentSelectSet = [];
  state.currentFilteredPatientGroup = state.currentSelectedPatientGroup;
  state.currentSelectedPatientGroup = [];
}).setLabel('createFilter');

export const removeFilter = createAction<ApplicationState, [string], ActionEvents>((state, filterToRemove) => {
  state.currentOutputFilterSet = state.currentOutputFilterSet.filter((d) => d.setName !== filterToRemove);
}).setLabel('clearFilter');

