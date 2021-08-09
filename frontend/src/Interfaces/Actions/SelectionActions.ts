import { createAction } from "@visdesignlab/trrack";
import { SingleCasePoint } from "../Types/DataTypes";
import { ActionEvents } from "../Types/EventTypes";
import { ApplicationState } from "../Types/StateTypes";



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

const selectSet = createAction<ApplicationState, [], ActionEvents>(() => {
    //todo
})
const clearSet = createAction<ApplicationState, [], ActionEvents>(() => {
    //todo
})

