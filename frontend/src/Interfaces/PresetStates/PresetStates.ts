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
    annotationText: ' ',
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
    annotationText: ' ',
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
    annotationText: ' ',
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
    annotationText: ' ',
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
    annotationText: ' ',
    chartType: 'HEATMAP',
    xAxisVar: 'FFP_UNITS',
    yAxisVar: 'SURGEON_PROV_ID',
    attributePlots: ['AMICAR', 'DRG_WEIGHT'],
    outcomeComparison: 'DEATH',
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
    annotationText: ' ',
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
    annotationText: ' ',
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
    annotationText: ' ',
    chartType: 'COST',
    xAxisVar: 'COST',
    yAxisVar: 'SURGEON_PROV_ID',
  },
];
export const costSavingsState = makePresetState(costSavingsLayout);
