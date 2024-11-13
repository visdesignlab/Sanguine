import { createAction } from '@visdesignlab/trrack';
import { ActionEvents } from '../Types/EventTypes';
import { LayoutElement, xAxisOption, yAxisOption } from '../Types/LayoutTypes';
import { ApplicationState } from '../Types/StateTypes';
import { Outcome, typeDiction } from '../../Presets/DataDict';

export const addExtraPair = createAction<ApplicationState, [string, string], ActionEvents>((state, chartID, newExtraPair) => {
  state.layoutArray = state.layoutArray.map((d: LayoutElement) => {
    if (d.i === chartID && (d.plotType === 'HEATMAP' || d.plotType === 'COST') && d.extraPair) {
      if (!d.extraPair.includes(newExtraPair)) {
        const originalArray = JSON.parse(d.extraPair);
        originalArray.push(newExtraPair);
        d.extraPair = JSON.stringify(originalArray);
      }
    }
    return d;
  });
}).setLabel('addExtraPair');

export const removeExtraPair = createAction<ApplicationState, [string, string], ActionEvents>((state, chartID, removingPairName) => {
  state.layoutArray = state.layoutArray.map((d: LayoutElement) => {
    if (d.i === chartID && (d.plotType === 'HEATMAP' || d.plotType === 'COST') && d.extraPair) {
      const originalArray = JSON.parse(d.extraPair);

      const newArray = (originalArray.filter((l: string) => (l !== removingPairName)));
      d.extraPair = JSON.stringify(newArray);
    }
    return d;
  });
}).setLabel('removeExtraPair');

// change the case num when this changes in store instead of here
export const removeChart = createAction<ApplicationState, [string], ActionEvents>((state, indexToRemove) => {
  state.layoutArray = state.layoutArray.filter((d) => d.i !== indexToRemove);
}).setLabel('removeChart');

export const changeNotation = createAction<ApplicationState, [string, string], ActionEvents>((state, chartID, newNotation) => {
  state.layoutArray = state.layoutArray.map((d) => {
    if (d.i === chartID) {
      d.notation = newNotation;
    }
    return d;
  });
}).setLabel('changeNotation');

export const addNewChart = createAction<ApplicationState, [LayoutElement], ActionEvents>((state: ApplicationState, input) => {
  state.layoutArray.push(input);
  state.nextAddingIndex += 1;
}).setLabel('AddChart');

export const onLayoutChange = createAction<ApplicationState, [ReactGridLayout.Layout[]], ActionEvents>((state, data) => {
  data.forEach((gridLayout) => {
    const match = state.layoutArray.filter((d) => d.i === gridLayout.i)[0];
    match.w = gridLayout.w;
    match.h = gridLayout.h;
    match.x = gridLayout.x;
    match.y = gridLayout.y;
  });
  state.layoutArray = JSON.parse(JSON.stringify(state.layoutArray));
}).setLabel('LayoutChange');

export const changeChart = createAction<ApplicationState, [xAxisOption, yAxisOption, string, typeof typeDiction[number], Outcome | 'NONE'], ActionEvents>((state, xAxisSelection, yAxisSelection, chartIndex, chartType, outcomeComparison?) => {
  state.layoutArray = state.layoutArray.map((d) => {
    if (d.i === chartIndex) {
      d.xAxisVar = xAxisSelection;
      d.yAxisVar = yAxisSelection;
      d.plotType = chartType;
      if (outcomeComparison && (d.plotType === 'HEATMAP' || d.plotType === 'COST')) {
        d.outcomeComparison = outcomeComparison === 'NONE' ? undefined : outcomeComparison;
      }
    }
    return d;
  });
}).setLabel('changeChart');

export const clearAllCharts = createAction<ApplicationState, [], ActionEvents>((state) => {
  state.layoutArray = [];
  state.currentBrushedPatientGroup = [];
  state.currentSelectSet = [];
  state.currentSelectPatient = null;
}).setLabel('clearAllCharts');
