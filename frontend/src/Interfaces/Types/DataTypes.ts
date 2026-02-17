import { EXTRA_PAIR_OPTIONS } from '../../Presets/DataDict';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type ProcedureEntry = {
    procedureName: string;
    count: number;
    codes: string[];
    overlapList?: ProcedureEntry[];
};

export type BasicAggregatedDataPoint = {
    aggregateAttribute: any;
    totalVal: number;
    caseCount: number;
    zeroCaseNum: number;
    // patientIDList: number[];
    caseIDList: number[];
};
export type CostBarChartDataPoint = BasicAggregatedDataPoint & {
    PRBC_UNITS: number;
    FFP_UNITS: number;
    CRYO_UNITS: number;
    PLT_UNITS: number;
    CELL_SAVER_ML: number;
    cellSalvageUsage: number;
    cellSalvageVolume: number;
};

export type HeatMapDataPoint = BasicAggregatedDataPoint & {
    countDict: any;
};

export type SingleCasePoint = {
    VISIT_NO: number;
    CASE_ID: number;
    MRN: number;
    YEAR: number;
    SURGEON_PROV_ID: string;
    CRYO_UNITS: number;
    DEATH: number;
    ANESTH_PROV_ID: string;
    CASE_DATE: number;
    QUARTER: number;
    CELL_SAVER_ML: number;
    ECMO: number;
    DRG_WEIGHT: number;
    MONTH: number;
    FFP_UNITS: number;
    FFP_UNITS_OUTSIDE_OR: number;
    PLT_UNITS: number;
    PLT_UNITS_OUTSIDE_OR: number;
    POSTOP_HEMO: number;
    PRBC_UNITS: number;
    PRBC_UNITS_OUTSIDE_OR: number;
    PREOP_HEMO: number;
    CRYO_UNITS_OUTSIDE_OR: number;
    CELL_SAVER_ML_OUTSIDE_OR: number;
    STROKE: number;
    VENT: number;
    B12: number;
    TXA: number;
    AMICAR: number;
    IRON: number;
    SURGERY_TYPE_DESC: 'Urgent' | 'Elective' | 'Emergent';
    ALL_CODES: string;
    [key: string]: string|number;
};
export type ScatterDataPoint = {
    xVal: number;
    yVal: number;
    randomFactor: number;
    case: SingleCasePoint;
};

export type DumbbellDataPoint = {
    startXVal: number;
    endXVal: number;
    yVal: number;
    case: SingleCasePoint;
};

export type AttributePlotData<T extends'Violin' | 'BarChart' | 'Basic'> = {
    attributeName: typeof EXTRA_PAIR_OPTIONS[number];
    attributeLabel: string;
    attributeData: Record<string, T extends 'Basic'
        ? { rowCaseCount: number; attributeCaseCount?: number } :
        T extends 'Violin'
            ? { kdeArray: any, dataPoints: number[] } :
            T extends 'BarChart'
                ? number
                : never
    >;
    type: T;
    medianSet?: any;
    kdeMax?: number;
};
