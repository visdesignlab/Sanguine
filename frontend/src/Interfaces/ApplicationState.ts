export interface SelectSet {
  setName: string;
  setValues: number[];
}

export interface ComparisonDataPoint {
  aggregateAttribute: any;
  preInKdeCal: any[];
  postInKdeCal: any[];
  preTotalVal: number;
  postTotalVal: number;
  preCaseCount: number;
  postCaseCount: number;
  preInMedian: number;
  postInMedian: number;
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

export interface BarChartDataPoint extends BasicAggregatedDatePoint {
  kdeCal: any[];
  actualDataPoints: any[]
  median: number;
}

export interface HeatMapDataPoint extends BasicAggregatedDatePoint {
  countDict: any;
}

export interface SingleCasePoint {
  visitNum: number;
  caseId: number;
  YEAR: number;
  SURGEON_ID: number;
  ANESTHESIOLOGIST_ID: number;
  patientID: number;
  DATE: number;
  [key: string]: number;
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
  kdeMax?: number;
  medianSet?: any;
}

export interface ExtraPairInterventionPoint {
  name: string;
  totalIntData: any[];
  preIntData: any[];
  postIntData: any[];
  type: string;
  kdeMax?: number;
  totalMedianSet?: any;
  preMedianSet?: any;
  postMedianSet?: any;
  label: string;
}

export interface ApplicationState {

  //  currentSelectedChart: string;
  // perCaseSelected: boolean;
  // yearRange: number[];
  rawDateRange: number[];
  filterSelection: string[];
  //rawFilterSelection: string;
  totalAggregatedCaseCount: number;
  totalIndividualCaseCount: number;
  // dumbbellSorted: boolean;
  currentSelectSet: SelectSet[];
  currentOutputFilterSet: SelectSet[];
  currentSelectPatient: SingleCasePoint | null;
  showZero: boolean;
  currentSelectPatientGroup: number[];
  currentBrushedPatientGroup: number[];
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
  notation: string
}

export const defaultState: ApplicationState = {
  layoutArray: [],
  // currentSelectedChart: "-1",
  rawDateRange: [new Date(2014, 0, 1).getTime(), new Date(2019, 11, 31).getTime()],
  filterSelection: [],
  //rawFilterSelection: "[]",
  totalAggregatedCaseCount: 0,
  totalIndividualCaseCount: 0,
  currentOutputFilterSet: [],
  currentSelectSet: [],
  currentSelectPatient: null,
  nextAddingIndex: 0,
  showZero: true,
  currentSelectPatientGroup: [],
  currentBrushedPatientGroup: []
};