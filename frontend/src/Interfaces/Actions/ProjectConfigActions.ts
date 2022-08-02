import { createAction } from "@visdesignlab/trrack";
import { defaultState } from "../DefaultState";
import { ActionEvents } from "../Types/EventTypes";
import { LayoutElement } from "../Types/LayoutTypes";
import { ApplicationState } from "../Types/StateTypes";


//Load in a preset of layout elements
export const loadPreset = createAction<ApplicationState, [LayoutElement[]], ActionEvents>((state, input) => {
    state.layoutArray = input;
}).setLabel("LoadPreset");

export const toggleShowZero = createAction<ApplicationState, [boolean], ActionEvents>((state, showZero) => {
    state.showZero = showZero;
}).setLabel("toggleShowZero");

export const dateRangeChange = createAction<ApplicationState, [number[]], ActionEvents>((state, newDataRange) => {
    if (newDataRange !== state.rawDateRange) {
        state.rawDateRange = newDataRange;
    }
}).setLabel("setDateRange");

export const changeOutcomeFilter = createAction<ApplicationState, [string[]], ActionEvents>((state, newOutcomeFilter) => {
    state.outcomeFilter = newOutcomeFilter;
}).setLabel("setOutcomeFilter");

export const changeCostConfig = createAction<ApplicationState, [string, number], ActionEvents>((state, bloodComponentName, newCost) => {
    state.BloodProductCost[bloodComponentName] = newCost;
}).setLabel("setBloodComponentConfig");

export const changeSurgeryUrgencySelection = createAction<ApplicationState, [[boolean, boolean, boolean]], ActionEvents>((state, surgeryUrgencyInput) => {
    state.surgeryUrgencySelection = surgeryUrgencyInput;
}).setLabel("changeUrgency");


export const changeFilter = createAction<ApplicationState, [string, [number, number]], ActionEvents>((state, filterName, newRange) => {
    state.allFilters[filterName] = newRange;
}).setLabel("changeFilter");

export const resetSelectedFilter = createAction<ApplicationState, [string[]], ActionEvents>((state, filterNames) => {
    filterNames.forEach((d) => {
        state.allFilters[d] = defaultState.allFilters[d];
    });
}).setLabel("resetSelectedFilter");

export const clearAllFilter = createAction<ApplicationState, [], ActionEvents>((state) => {
    state.currentSelectPatientGroup = [];
    state.currentOutputFilterSet = [];
    state.rawDateRange = defaultState.rawDateRange;
    state.outcomeFilter = [];
    state.allFilters = defaultState.allFilters;
    state.surgeryUrgencySelection = defaultState.surgeryUrgencySelection;
}).setLabel("clearAllFilter");