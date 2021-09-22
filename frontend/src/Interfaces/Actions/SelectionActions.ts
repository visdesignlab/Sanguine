import { createAction } from "@visdesignlab/trrack";
import { defaultState } from "../DefaultState";
import { SingleCasePoint } from "../Types/DataTypes";
import { ActionEvents } from "../Types/EventTypes";
import { ApplicationState } from "../Types/StateTypes";


//This is a filter
export const updateSelectedPatientGroup = createAction<ApplicationState, [SingleCasePoint[]], ActionEvents>((state, caseList) => {
    state.currentSelectPatientGroup = caseList;
    console.log(state)
}).setLabel("updatePatientGroup")

export const updateProcedureSelection = createAction<ApplicationState, [string, boolean], ActionEvents>((state, newProcedureSelection, removing) => {
    if (removing) {
        state.proceduresSelection = state.proceduresSelection.filter(d => d !== newProcedureSelection)
    }
    else {
        state.proceduresSelection.push(newProcedureSelection)
    }
}).setLabel("updateProcedureSelection")

export const updateBrushPatient = createAction<ApplicationState, [SingleCasePoint[]], ActionEvents>((state, caseList) => {
    state.currentBrushedPatientGroup = caseList;
}).setLabel("updateBrush")

export const setCurrentSelectPatient = createAction<ApplicationState, [SingleCasePoint | null], ActionEvents>((state, newCase) => {
    state.currentSelectPatient = newCase;
}).setLabel("updateCaseSelect");

export const selectSet = createAction<ApplicationState, [string, string, boolean], ActionEvents>((state, selectSetName, selectSetInput, replace) => {
    //this current set name already exist
    if (state.currentSelectSet.filter(d => d.setName === selectSetName).length > 0) {

        state.currentSelectSet = state.currentSelectSet.map(d => {
            if (d.setName === selectSetName) {
                if (replace) {
                    return { setName: selectSetName, setValues: [selectSetInput] }
                }
                else if (!d.setValues.includes(selectSetInput)) {
                    return { setName: selectSetName, setValues: d.setValues.concat([selectSetInput]) }
                } else {
                    return d
                }
            } else {
                return d
            }
        })
    } else {
        state.currentSelectSet.push({ setName: selectSetName, setValues: [selectSetInput] })
    }
}).setLabel("addToSelected")

export const clearSet = createAction<ApplicationState, [string], ActionEvents>((state, selectNameToRemove) => {
    state.currentSelectSet = state.currentSelectSet.filter(d => d.setName !== selectNameToRemove)
}).setLabel("selectSetToRemove")

export const clearSelectionFilter = createAction<ApplicationState, [], ActionEvents>((state) => {
    state.currentSelectPatientGroup = [];
    state.currentOutputFilterSet = []
}).setLabel("clearSelectionFilter");

export const outputToFilter = createAction<ApplicationState, [], ActionEvents>((state) => {
    state.currentOutputFilterSet = state.currentSelectSet;
    state.currentSelectSet = []
    state.currentSelectPatientGroup = state.currentBrushedPatientGroup;
    state.currentBrushedPatientGroup = [];
}).setLabel("createFilter");

export const removeFilter = createAction<ApplicationState, [string], ActionEvents>((state, filterToRemove) => {
    state.currentOutputFilterSet = state.currentOutputFilterSet.filter(d => d.setName !== filterToRemove)
}).setLabel("clearFilter");

