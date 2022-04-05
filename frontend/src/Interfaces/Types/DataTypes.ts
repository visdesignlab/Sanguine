export type ProcedureEntry = {
    procedureName: string;
    count: number;
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
    VISIT_ID: number;
    CASE_ID: number;
    PATIENT_ID: number;
    YEAR: number;
    SURGEON_ID: number;
    CRYO_UNITS: number;
    DEATH: number;
    ANESTHESIOLOGIST_ID: number;
    DATE: number;
    QUARTER: string;
    CELL_SAVER_ML: number;
    ECMO: number;
    DRG_WEIGHT: number;
    MONTH: string;
    FFP_UNITS: number;
    PLT_UNITS: number;
    POSTOP_HGB: number;
    PRBC_UNITS: number;
    PREOP_HGB: number;
    STROKE: number;
    VENT: number;
    B12: number;
    TXA: number;
    AMICAR: number;
    ORALIRON: number;
    IVIRON: number;
    SURGERY_TYPE: number;
    [key: string]: number | string;
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
    type: string;
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