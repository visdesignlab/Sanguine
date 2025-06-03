import { defaultState } from './DefaultState';
import { LayoutElement } from '../Types/LayoutTypes';
import { ApplicationState } from '../Types/StateTypes';
import { ManualInfinity } from '../../Presets/Constants';

/**
 * A single-chart layout that uses the COST chart against SURGEON_PROV_ID.
 */
const costSavingsLayout: LayoutElement[] = [
  {
    i: '0', // unique chart key
    x: 0,
    y: 0,
    w: 2,
    h: 1,
    annotationText: '',
    chartType: 'COST',
    xAxisVar: 'COST',
    yAxisVar: 'SURGEON_PROV_ID',
  },
];

export const costSavingsState: ApplicationState = {
  ...defaultState,
  layoutArray: costSavingsLayout,
};

/**
 * Pre‐op anemia exploration:
 *  - Heatmap: intraoperative RBCs transfused (PRBC_UNITS) vs. surgeon ID
 *    with a filter to include only >=1 unit
 *  - Violin plot: APR‐DRG weight per surgeon
 */
const preopAnemiaLayout: LayoutElement[] = [
  {
    i: '0', // unique chart key
    x: 0,
    y: 0,
    w: 2,
    h: 1,
    annotationText: '',
    chartType: 'HEATMAP',
    xAxisVar: 'PRBC_UNITS',
    yAxisVar: 'SURGEON_PROV_ID',
    attributePlots: ['DRG_WEIGHT'],
  },
];

export const preopAnemiaState: ApplicationState = {
  ...defaultState,
  layoutArray: preopAnemiaLayout,
  bloodFilter: {
    ...defaultState.bloodFilter,
    PRBC_UNITS: [1, ManualInfinity],
  },
};
