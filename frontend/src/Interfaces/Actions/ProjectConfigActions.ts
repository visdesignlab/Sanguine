import { createAction } from "@visdesignlab/trrack"
import { ActionEvents } from "../Types/EventTypes"
import { LayoutElement } from "../Types/LayoutTypes"
import { ApplicationState } from "../Types/StateTypes"


//Load in a preset of layout elements
export const loadPreset = createAction<ApplicationState, [LayoutElement[]], ActionEvents>((state, input) => {
    state.layoutArray = input
}).setLabel("LoadPreset")

export const toggleShowZero = createAction<ApplicationState, [boolean], ActionEvents>((state, showZero) => {
    state.showZero = showZero;
}).setLabel("toggleShowZero")

export const dateRangeChange = createAction<ApplicationState, [number[]], ActionEvents>((state, newDataRange) => {
    if (newDataRange !== state.rawDateRange) {
        state.rawDateRange = newDataRange
    }
}).setLabel("setDateRange")

export const changeOutcomeFilter = createAction<ApplicationState, [string], ActionEvents>((state, newOutcomeFilter) => {
    state.outcomeFilter = newOutcomeFilter;
}).setLabel("setOutcomeFilter")

export const changeCostConfig = createAction<ApplicationState, [string, number], ActionEvents>((state, bloodComponentName, newCost) => {
    state.BloodProductCost[bloodComponentName] = newCost
}).setLabel("setBloodComponentConfig")

export const changeSurgeryUrgencySelection = createAction<ApplicationState, [[boolean, boolean, boolean]], ActionEvents>((state, surgeryUrgencyInput) => {
    state.surgeryUrgencySelection = surgeryUrgencyInput;
}).setLabel("changeUrgency")