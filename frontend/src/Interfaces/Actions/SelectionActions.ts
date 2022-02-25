import { createAction } from "@visdesignlab/trrack";
import { ProcedureEntry, SingleCasePoint } from "../Types/DataTypes";
import { ActionEvents } from "../Types/EventTypes";
import { ApplicationState } from "../Types/StateTypes";


//This is a filter
export const updateSelectedPatientGroup = createAction<ApplicationState, [SingleCasePoint[]], ActionEvents>((state, caseList) => {
    state.currentSelectPatientGroup = caseList;
}).setLabel("updatePatientGroup");

// "removing" only applies to parent procedure
export const updateProcedureSelection = createAction<ApplicationState, [ProcedureEntry, boolean, string?], ActionEvents>((state, newProcedureSelection, removing, parentProcedure?) => {
    // if there is a parentProcedure, then this parent procedure must be already selected
    if (parentProcedure) {
        // find the parent procedure
        //the parent procedure doesn't exist yet, need to add it with the subprocedure
        if (state.proceduresSelection.filter(d => d.procedureName === parentProcedure).length === 0) {
            state.proceduresSelection = state.proceduresSelection.concat([{
                procedureName: parentProcedure,
                count: 1,
                overlapList: [newProcedureSelection]
            }]);
        } else {
            const overlapList = state.proceduresSelection.filter(d => d.procedureName === parentProcedure)[0].overlapList;
            if (overlapList) {
                if (overlapList.filter(d => d.procedureName === newProcedureSelection.procedureName).length > 0) {
                    // this procedure was selected, we need to remove it
                    state.proceduresSelection.filter(d => d.procedureName === parentProcedure)[0].overlapList = overlapList.filter(d => d.procedureName !== newProcedureSelection.procedureName);
                } else {
                    // this procedure wasn't selected, add it.

                    state.proceduresSelection.filter(d => d.procedureName === parentProcedure)[0].overlapList?.push(newProcedureSelection);
                }
            }
        }
        // const procedureExist = parentProcedureItem.
    }
    else {
        if (removing) {
            state.proceduresSelection = state.proceduresSelection.filter(d => d.procedureName !== newProcedureSelection.procedureName);
        }
        else {
            state.proceduresSelection.push({ procedureName: newProcedureSelection.procedureName, count: newProcedureSelection.count, overlapList: [] });
        }
    }
}).setLabel("updateProcedureSelection");

export const updateBrushPatient = createAction<ApplicationState, [SingleCasePoint[]], ActionEvents>((state, caseList) => {
    state.currentBrushedPatientGroup = caseList;
    if (caseList.length === 0) {
        state.currentSelectPatient = null;
    }
}).setLabel("updateBrush");

export const setCurrentSelectPatient = createAction<ApplicationState, [SingleCasePoint | null], ActionEvents>((state, newCase) => {
    state.currentSelectPatient = newCase;
}).setLabel("updateCaseSelect");

export const selectSet = createAction<ApplicationState, [string, string, boolean], ActionEvents>((state, selectSetName, selectSetInput, replace) => {
    //this current set name already exist
    if (state.currentSelectSet.filter(d => d.setName === selectSetName).length > 0) {

        state.currentSelectSet = state.currentSelectSet.map(d => {
            if (d.setName === selectSetName) {
                if (replace) {
                    return { setName: selectSetName, setValues: [selectSetInput] };
                }
                else if (!d.setValues.includes(selectSetInput)) {
                    return { setName: selectSetName, setValues: d.setValues.concat([selectSetInput]) };
                } else {
                    return d;
                }
            } else {
                return d;
            }
        });
    } else {
        state.currentSelectSet.push({ setName: selectSetName, setValues: [selectSetInput] });
    }
}).setLabel("addToSelected");

export const clearSet = createAction<ApplicationState, [string], ActionEvents>((state, selectNameToRemove) => {
    state.currentSelectSet = state.currentSelectSet.filter(d => d.setName !== selectNameToRemove);
}).setLabel("selectSetToRemove");

export const clearSelectionFilter = createAction<ApplicationState, [], ActionEvents>((state) => {
    state.currentSelectPatientGroup = [];
    state.currentOutputFilterSet = [];
}).setLabel("clearSelectionFilter");

export const outputToFilter = createAction<ApplicationState, [], ActionEvents>((state) => {
    state.currentOutputFilterSet = state.currentSelectSet;
    state.currentSelectSet = [];
    state.currentSelectPatientGroup = state.currentBrushedPatientGroup;
    state.currentBrushedPatientGroup = [];
}).setLabel("createFilter");

export const removeFilter = createAction<ApplicationState, [string], ActionEvents>((state, filterToRemove) => {
    state.currentOutputFilterSet = state.currentOutputFilterSet.filter(d => d.setName !== filterToRemove);
}).setLabel("clearFilter");

