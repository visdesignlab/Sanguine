import {
  Aggregation, BloodComponent, HemoOption, Outcome,
} from '../../Presets/DataDict';

type BaseLayoutElement = {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    annotationText: string;
};

export type DumbbellLayoutElement = BaseLayoutElement & {
    chartType: 'DUMBBELL';
    xAxisVar: BloodComponent | Aggregation;
    yAxisVar: 'HGB_VALUE';
};

export type ScatterLayoutElement = BaseLayoutElement & {
    chartType: 'SCATTER';
    xAxisVar: BloodComponent;
    yAxisVar: HemoOption;
};

export type HeatMapLayoutElement = BaseLayoutElement & {
    chartType: 'HEATMAP';
    xAxisVar: BloodComponent;
    yAxisVar: Aggregation;
    extraPair?: string;
    interventionDate?: number;
    outcomeComparison?: Outcome;
};

export type CostLayoutElement = BaseLayoutElement & {
    chartType: 'COST';
    xAxisVar: 'COST';
    yAxisVar: Aggregation;
    extraPair?: string;
    interventionDate?: number;
    outcomeComparison?: Outcome;
};

export type LayoutElement = DumbbellLayoutElement | ScatterLayoutElement | HeatMapLayoutElement | CostLayoutElement;
export type xAxisOption = LayoutElement['xAxisVar'];
export type yAxisOption = LayoutElement['yAxisVar'];
