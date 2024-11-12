import { BloodProductCap } from '../../Presets/Constants';
import { Aggregation, HemoOption, Outcome } from '../../Presets/DataDict';

export type xAxisOption = keyof typeof BloodProductCap | 'COST' | Aggregation;
export type yAxisOption = 'HGB_VALUE' | HemoOption | Aggregation;

export type LayoutElement = {
    xAxisVar: xAxisOption;
    yAxisVar: yAxisOption;
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    plotType: string;
    extraPair?: string;
    interventionDate?: number;
    outcomeComparison?: Outcome;
    notation: string;
}
