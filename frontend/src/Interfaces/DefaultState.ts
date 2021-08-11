
import { ApplicationState } from "./Types/StateTypes"

const today = new Date()
today.setDate(today.getDate() + 1)

export const defaultState: ApplicationState = {
    layoutArray: [],
    surgeryUrgencySelection: [true, true, true],
    outcomeFilter: "",
    rawDateRange: [new Date(2014, 0, 1).getTime(), today.getTime()],
    proceduresSelection: [],
    totalAggregatedCaseCount: 0,
    totalIndividualCaseCount: 0,
    currentOutputFilterSet: [],
    currentSelectSet: [],
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
    },
    currentSelectPatient: null
};