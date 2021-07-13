
import { ApplicationState } from "./Types/StateTypes"

const today = new Date()
today.setDate(today.getDate() + 1)

export const defaultState: ApplicationState = {
    layoutArray: [],
    surgeryUrgencySelection: [true, true, true],
    outcomesSelection: "",
    // currentSelectedChart: "-1",
    rawDateRange: [new Date(2014, 0, 1).getTime(), today.getTime()],
    proceduresSelection: [],
    //rawproceduresSelection: "[]",
    totalAggregatedCaseCount: 0,
    totalIndividualCaseCount: 0,
    currentOutputFilterSet: [],
    currentSelectSet: [],
    //currentSelectPatient: null,
    nextAddingIndex: 0,
    showZero: true,
    currentSelectPatientGroup: [],
    currentBrushedPatientGroup: [],
    BloodProductCost: {
        PRBC_UNITS: 200,
        FFP_UNITS: 55,
        CRYO_UNITS: 70,
        PLT_UNITS: 650,
        CELL_SAVER_ML: 300,
    }
};