import { createAction } from "@visdesignlab/trrack";
import { SingleCasePoint } from "../Types/DataTypes";
import { ApplicationState } from "../Types/StateTypes";



const updateSelectedPatientGroup = createAction<ApplicationState, [SingleCasePoint[]]>((state, caseList) => {
    state.currentSelectPatientGroup = caseList;
}).setLabel("updatePatientGroup")

const updateProcedureSelection = createAction<ApplicationState, [string]>((state, newProcedureSelection) => {
    if (state.proceduresSelection.includes(newProcedureSelection)) {
        state.proceduresSelection = state.proceduresSelection.filter(d => d !== newProcedureSelection)
    }
    else {
        state.proceduresSelection.push(newProcedureSelection)
    }
}).setLabel("updateProcedureSelection")

//TODO rethink ways to organize selections of patient brush, patient select, surgeon group
const updateBrushPatient = createAction<ApplicationState, []>(() => {
    //todo
})
const selectSet = createAction<ApplicationState, []>(() => {
    //todo
})
const clearSet = createAction<ApplicationState, []>(() => {
    //todo
})

