import { AcronymDictionary, EXTRA_PAIR_OPTIONS } from '../../Presets/DataDict';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type ProcedureEntry = {
    procedureName: string;
    count: number;
    codes: string[];
    overlapList?: ProcedureEntry[];
};

export type BasicAggregatedDatePoint = {
    aggregateAttribute: any;
    totalVal: number;
    caseCount: number;
    zeroCaseNum: number;
    // patientIDList: number[];
    caseIDList: number[];
};
export type CostBarChartDataPoint = BasicAggregatedDatePoint & {
    PRBC_UNITS: number;
    FFP_UNITS: number;
    CRYO_UNITS: number;
    PLT_UNITS: number;
    CELL_SAVER_ML: number;
    cellSalvageUsage: number;
    cellSalvageVolume: number;
};

export type HeatMapDataPoint = BasicAggregatedDatePoint & {
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
    PLT_UNITS: number;
    POSTOP_HEMO: number;
    PRBC_UNITS: number;
    PREOP_HEMO: number;
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
    startYVal: number;
    endYVal: number;
    xVal: number;
    case: SingleCasePoint;
};

export type ExtraPairPoint = {
    name: typeof EXTRA_PAIR_OPTIONS[number];
    data: any[];
    type: 'Violin' | 'BarChart' | 'Basic';
    label: string;
    medianSet?: any;
    kdeMax?: number;
};
export type ExtendedExtraPairPoint = Omit<ExtraPairPoint, 'name'> & { name: keyof typeof AcronymDictionary | 'TOTAL_TRANS' | 'PER_CASE' | 'ZERO_TRANS' };
