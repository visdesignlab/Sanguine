import { createAction } from "@visdesignlab/trrack";
import { SingleCasePoint } from "../Types/DataTypes";
import { ActionEvents } from "../Types/EventTypes";
import { ApplicationState } from "../Types/StateTypes";



export const updateSelectedPatientGroup = createAction<ApplicationState, [SingleCasePoint[]], ActionEvents>((state, caseList) => {
    state.currentSelectPatientGroup = caseList;
}).setLabel("updatePatientGroup")

export const updateProcedureSelection = createAction<ApplicationState, [string, boolean], ActionEvents>((state, newProcedureSelection, removing) => {
    if (removing) {
        state.proceduresSelection = state.proceduresSelection.filter(d => d !== newProcedureSelection)
    }
    else {
        state.proceduresSelection.push(newProcedureSelection)
    }
}).setLabel("updateProcedureSelection")

//TODO rethink ways to organize selections of patient brush, patient select, surgeon group
const updateBrushPatient = createAction<ApplicationState, [], ActionEvents>(() => {
    //todo
})
const selectSet = createAction<ApplicationState, [], ActionEvents>(() => {
    //todo
})
const clearSet = createAction<ApplicationState, [], ActionEvents>(() => {
    //todo
})

