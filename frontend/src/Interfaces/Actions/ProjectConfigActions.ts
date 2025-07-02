import { createAction } from '@visdesignlab/trrack';
import { defaultState } from '../PresetStates/DefaultState';
import { ActionEvents } from '../Types/EventTypes';
import { LayoutElement } from '../Types/LayoutTypes';
import { ApplicationState } from '../Types/StateTypes';
import {
  BLOOD_COMPONENTS, BloodComponent, BloodComponentOptions, HEMO_OPTIONS, HemoOption, ScatterYOptions,
} from '../../Presets/DataDict';

// Load in a preset of layout elements
export const loadPreset = createAction<ApplicationState, [LayoutElement[]], ActionEvents>((state, input) => {
  state.layoutArray = input;
}).setLabel('LoadPreset');

export const toggleShowZero = createAction<ApplicationState, [boolean], ActionEvents>((state, showZero) => {
  state.showZero = showZero;
}).setLabel('toggleShowZero');

export const dateRangeChange = createAction<ApplicationState, [number[]], ActionEvents>((state, newDataRange) => {
  if (newDataRange !== state.rawDateRange) {
    state.rawDateRange = newDataRange;
  }
}).setLabel('setDateRange');

export const changeOutcomeFilter = createAction<ApplicationState, [string[]], ActionEvents>((state, newOutcomeFilter) => {
  state.outcomeFilter = newOutcomeFilter;
}).setLabel('setOutcomeFilter');

export const changeCostConfig = createAction<ApplicationState, [string, number], ActionEvents>((state, bloodComponentName, newCost) => {
  state.BloodProductCost[bloodComponentName] = newCost;
}).setLabel('setBloodComponentConfig');

export const changeSurgeryUrgencySelection = createAction<ApplicationState, [[boolean, boolean, boolean]], ActionEvents>((state, surgeryUrgencyInput) => {
  state.surgeryUrgencySelection = surgeryUrgencyInput;
}).setLabel('changeUrgency');

export const changeSurgeonCasesPerformed = createAction<ApplicationState, [[number, number]], ActionEvents>((state, surgeonCasesPerformed) => {
  state.surgeonCasesPerformed = surgeonCasesPerformed;
}).setLabel('changeSurgeonCasesPerformed');

export const changeBloodFilter = createAction<ApplicationState, [BloodComponent | HemoOption, [number, number]], ActionEvents>((state, bloodComponentName, newRange) => {
  state.bloodFilter[bloodComponentName] = newRange;
}).setLabel('changeBloodFilter');

export const resetBloodFilter = createAction<ApplicationState, [typeof BloodComponentOptions | typeof ScatterYOptions], ActionEvents>((state, type) => {
  const toUpdate: Record<string, [number, number]> = {};
  const typeKeys = type.map((d) => d.key);
  [...BLOOD_COMPONENTS, ...HEMO_OPTIONS].forEach((key) => {
    if (typeKeys.includes(key)) {
      toUpdate[key] = defaultState.bloodFilter[key];
    }
  });

  state.bloodFilter = { ...state.bloodFilter, ...toUpdate };
}).setLabel('resetBloodFilter');

export const clearAllFilter = createAction<ApplicationState, [], ActionEvents>((state) => {
  state.currentFilteredPatientGroup = [];
  state.currentOutputFilterSet = [];
  state.rawDateRange = defaultState.rawDateRange;
  state.outcomeFilter = [];
  state.bloodFilter = defaultState.bloodFilter;
  state.surgeryUrgencySelection = defaultState.surgeryUrgencySelection;
}).setLabel('clearAllFilter');
