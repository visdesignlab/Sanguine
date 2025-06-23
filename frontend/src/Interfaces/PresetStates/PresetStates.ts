import { defaultState } from './DefaultState';
import { LayoutElement } from '../Types/LayoutTypes';
import { ApplicationState } from '../Types/StateTypes';
import { ManualInfinity } from '../../Presets/Constants';

/**
 * Helper to build an ApplicationState from a layout
 * and an optional blood-filter override.
 */
function makePresetState(
  layout: LayoutElement[],
  bloodFilterOverrides?: Partial<ApplicationState['bloodFilter']>,
): ApplicationState {
  return {
    ...defaultState,
    layoutArray: layout,
    // only merge in a bloodFilter if overrides were passed
    ...(bloodFilterOverrides && {
      bloodFilter: {
        ...defaultState.bloodFilter,
        ...bloodFilterOverrides,
      },
    }),
  };
}

/**
 * Pre‐op anemia exploration:
 *  - Heatmap: intraoperative RBCs transfused (PRBC_UNITS)
 *    vs. surgeon ID (only >=1 unit)
 *  - Scatter: PRBC_UNITS vs. PREOP_HEMO
 */
const preopAnemiaLayout: LayoutElement[] = [
  {
    i: '0',
    x: 0,
    y: 0,
    w: 2,
    h: 1.4,
    annotationText: 'Heatmap: Percentages of RBC unit amounts transfused per surgeon. On the left, the distribution of case complexity for each surgeon. \nCurrent filters: Only showing cases with <13 g/dL preoperative hemoglobin (anemic).',
    chartType: 'HEATMAP',
    xAxisVar: 'PRBC_UNITS',
    yAxisVar: 'SURGEON_PROV_ID',
    attributePlots: ['DRG_WEIGHT'],
  },
  {
    i: '1',
    x: 0,
    y: 1,
    w: 2,
    h: 1,
    annotationText: 'Pre-operative hemoglobin for each case, by the number of RBC units transfused intraoperatively.',
    chartType: 'SCATTER',
    xAxisVar: 'PRBC_UNITS',
    yAxisVar: 'PREOP_HEMO',
  },
];
export const preopAnemiaState = makePresetState(
  preopAnemiaLayout,
  { PREOP_HEMO: [0, 13] },
);

/**
 * Transfusion Appropriateness exploration:
 *  - Dumbbell: surgeon ID vs. HGB_VALUE
 *  - Heatmap: PRBC_UNITS vs. SURGEON_PROV_ID (>=1 unit)
 */
const dumbbellLayout: LayoutElement[] = [
  {
    i: '0',
    x: 0,
    y: 0,
    w: 2,
    h: 1.1,
    annotationText: 'Pre-op and post-op hemoglobin values for each surgeon. \nCurrent filters: Only showing cases with intraoperative RBCs transfused >=1 unit.',
    chartType: 'DUMBBELL',
    xAxisVar: 'SURGEON_PROV_ID',
    yAxisVar: 'HGB_VALUE',
  },
  {
    i: '1',
    x: 0,
    y: 1,
    w: 2,
    h: 1.3,
    annotationText: 'Heatmap: Percentages of RBC unit amounts transfused per surgeon. On the left, the distribution of case complexity for each surgeon',
    chartType: 'HEATMAP',
    xAxisVar: 'PRBC_UNITS',
    yAxisVar: 'SURGEON_PROV_ID',
    attributePlots: ['DRG_WEIGHT'],
  },
];
export const dumbbellState = makePresetState(
  dumbbellLayout,
  { PRBC_UNITS: [1, ManualInfinity] },
);

/**
 * Antifibrinolytics exploration:
 *  - Heatmap: FFP_UNITS vs. surgeon ID, with AMICAR & DRG_WEIGHT
 *  - Outcome comparison: DEATH
 */
const antifibrinLayout: LayoutElement[] = [
  {
    i: '0',
    x: 0,
    y: 0,
    w: 2,
    h: 2.2,
    annotationText: 'Heatmap: Percentages of FFP unit amounts transfused per surgeon. \nFor each surgeon, there is a separate row showing cases where Amicar was or was not used (T/F). DRG_WEIGHT shows the distribution of case complexity for each surgeon. Death shows percentage of cases where the patient has died during their stay.',
    chartType: 'HEATMAP',
    xAxisVar: 'FFP_UNITS',
    yAxisVar: 'SURGEON_PROV_ID',
    attributePlots: ['DEATH', 'DRG_WEIGHT'],
    outcomeComparison: 'AMICAR',
  },
];
export const antifibrinState = makePresetState(antifibrinLayout);

/**
 * Cell salvage exploration:
 *  - Heatmap: CELL_SAVER_ML vs. anesthesiologist ID, POSTOP_HEMO
 *  - Scatter: CELL_SAVER_ML vs. POSTOP_HEMO
 *  - Filter: PRBC_UNITS >= 1
 */
const cellSalvageLayout: LayoutElement[] = [
  {
    i: '0',
    x: 0,
    y: 0,
    w: 2,
    h: 1.5,
    annotationText: 'Heatmap: Percentages of Cell Salvage unit ranges transfused per surgeon. \nFor each surgeon, there is a separate row showing cases where  Cell Salvage was or was not used (T/F). DRG_WEIGHT shows the distribution of case complexity for each surgeon. Death shows percentage of cases where the patient has died during their stay.',
    chartType: 'HEATMAP',
    xAxisVar: 'CELL_SAVER_ML',
    yAxisVar: 'ANESTH_PROV_ID',
    attributePlots: ['POSTOP_HEMO'],
    outcomeComparison: 'DEATH',
  },
  {
    i: '1',
    x: 0,
    y: 1,
    w: 2,
    h: 1,
    annotationText: '',
    chartType: 'SCATTER',
    xAxisVar: 'CELL_SAVER_ML',
    yAxisVar: 'POSTOP_HEMO',
  },
];
export const cellSalvageState = makePresetState(
  cellSalvageLayout,
  { PRBC_UNITS: [1, ManualInfinity] },
);

/**
 * Cost savings exploration:
 *  - COST vs. SURGEON_PROV_ID
 */
const costSavingsLayout: LayoutElement[] = [
  {
    i: '0',
    x: 0,
    y: 0,
    w: 2,
    h: 2.5,
    annotationText: 'The average cost of each blood product used in a case, by surgeon. The yellow savings indicates the average savings per case for each surgeon, based on the average cell salvage volume used.',
    chartType: 'COST',
    xAxisVar: 'COST',
    yAxisVar: 'SURGEON_PROV_ID',
  },
];
export const costSavingsState = makePresetState(costSavingsLayout);
