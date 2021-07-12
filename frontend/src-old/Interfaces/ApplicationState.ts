export interface SelectSet {
    setName: string;
    setValues: number[];
}
//Pre = Positive, outcome 1
//Post = Negative, outcome 0
export interface ComparisonDataPoint {
    aggregateAttribute: any;
    //  preInKdeCal: any[];
    // postInKdeCal: any[];
    preTotalVal: number;
    postTotalVal: number;
    preCaseCount: number;
    postCaseCount: number;
    //  preInMedian: number;
    //postInMedian: number;
    preCountDict: any;
    postCountDict: any;
    preZeroCaseNum: number;
    postZeroCaseNum: number;
    prePatienIDList: number[];
    postPatienIDList: number[];
    preCaseIDList: number[];
    postCaseIDList: number[];
}


export interface BasicAggregatedDatePoint {
    aggregateAttribute: any;
    totalVal: number;
    caseCount: number;
    zeroCaseNum: number;
    patientIDList: number[];
    caseIDList: number[];
}
export interface CostBarChartDataPoint {
    aggregateAttribute: any;
    dataArray: number[];
    caseNum: number;
    cellSalvageUsage: number;
    cellSalvageVolume: number;
}

export interface CostCompareChartDataPoint extends CostBarChartDataPoint {
    withInterDataArray: number[];
    withInterCaseNum: number;
    withInterCellSalvageUsage: number;
    withInterCellSalvageVolume: number;
}


export interface BarChartDataPoint extends BasicAggregatedDatePoint {
    actualDataPoints: any[]
    median: number;
}

export interface HeatMapDataPoint extends BasicAggregatedDatePoint {
    countDict: any;
}

export interface SingleCasePoint {
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
    SURGERY_TYPE: number;
    [key: string]: number | string;
}
export interface ScatterDataPoint {
    xVal: number;
    yVal: number;
    randomFactor: number;
    case: SingleCasePoint;
}

export interface DumbbellDataPoint {
    startXVal: number;
    endXVal: number;
    yVal: number;
    case: SingleCasePoint;
}

export interface ExtraPairPoint {
    name: string;
    data: any[];
    type: string;
    label: string;
    medianSet?: any;
    kdeMax?: number;
}

export interface ExtraPairInterventionPoint {
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
    halfKdeMax?: number
}

export interface ApplicationState {

    outcomesSelection: string;
    rawDateRange: number[];
    proceduresSelection: string[];
    procedureTypeSelection: [boolean, boolean, boolean];
    //rawproceduresSelection: string;
    totalAggregatedCaseCount: number;
    totalIndividualCaseCount: number;
    // dumbbellSorted: boolean;
    currentSelectSet: SelectSet[];
    currentOutputFilterSet: SelectSet[];
    // currentSelectPatient: SingleCasePoint[] | null;
    showZero: boolean;
    //This two are both case ids
    currentSelectPatientGroup: SingleCasePoint[];
    currentBrushedPatientGroup: SingleCasePoint[];
    BloodProductCost: any;
    nextAddingIndex: number;
    layoutArray: LayoutElement[];
}

export interface LayoutElement {
    aggregatedBy: string,
    valueToVisualize: string,
    i: string,
    x: number,
    y: number,
    w: number,
    h: number,
    plotType: string,
    //  aggregation?: string,
    extraPair?: string,
    interventionDate?: number,
    comparisonChartType?: string,
    outcomeComparison?: string,
    notation: string
}

const today = new Date()
today.setDate(today.getDate() + 1)

export const defaultState: ApplicationState = {
    layoutArray: [],
    procedureTypeSelection: [true, true, true],
    outcomesSelection: "",
    // currentSelectedChart: "-1",
    rawDateRange: [new Date(2014, 0, 1).getTime(), today.getTime()],
    proceduresSelection: [],
    //rawproceduresSelection: "[]",
    totalAggregatedCaseCount: 0,
    totalIndividualCaseCount: 0,
    currentOutputFilterSet: [],
    currentSelectSet: [],
    //currentSelectPatient: null,
    nextAddingIndex: 0,
    showZero: true,
    currentSelectPatientGroup: [],
    currentBrushedPatientGroup: [],
    BloodProductCost: {
        PRBC_UNITS: 200,
        FFP_UNITS: 55,
        CRYO_UNITS: 70,
        PLT_UNITS: 650,
        CELL_SAVER_ML: 300,

    }
};