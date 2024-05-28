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
    dataArray: number[];
    cellSalvageUsage: number;
    cellSalvageVolume: number;
};

export type CostCompareChartDataPoint = CostBarChartDataPoint & {
    withInterDataArray: number[];
    withInterCaseNum: number;
    withInterCellSalvageUsage: number;
    withInterCellSalvageVolume: number;
};


export type BarChartDataPoint = BasicAggregatedDatePoint & {
    actualDataPoints: any[];
    median: number;
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

export type ExtraPairPoint = {
    name: string;
    data: any[];
    type: 'Violin' | 'BarChart' | 'Basic';
    label: string;
    medianSet?: any;
    kdeMax?: number;
};

export type ExtraPairInterventionPoint = {
    name: string;
    totalIntData: any[];
    preIntData: any[];
    postIntData: any[];
    type: string;
    totalMedianSet?: any;
    preMedianSet?: any;
    postMedianSet?: any;
    label: string;
    totalKdeMax?: number,
    halfKdeMax?: number;
};