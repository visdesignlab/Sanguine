export interface SelectSet {
  set_name: string;
  set_value: number[];
}


export interface InterventionDataPoint {
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
}

export interface BarChartDataPoint {
  aggregateAttribute: any;
  kdeCal: any[];
  actualDataPoints: any[]
  totalVal: number;
  caseCount: number;
  median: number;
  zeroCaseNum: number;
  patienIDList: number[];
}

export interface HeatMapDataPoint {
  aggregateAttribute: any;
  countDict: any;
  totalVal: number;
  caseCount: number;
  zeroCaseNum: number;
  patientIDList: number[];
}

export interface SingleCasePoint {
  visitNum: number;
  caseId: number;
  YEAR: number;
  SURGEON_ID: number;
  ANESTHOLOGIST_ID: number;
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

export interface ApplicationState {
  layoutArray: LayoutElement[];
  //  currentSelectedChart: string;
  // perCaseSelected: boolean;
  // yearRange: number[];
  rawDateRange: number[];
  filterSelection: string[];
  totalAggregatedCaseCount: number;
  totalIndividualCaseCount: number;
  // dumbbellSorted: boolean;
  currentSelectSet: SelectSet[];
  currentOutputFilterSet: SelectSet[];
  currentSelectPatient: SingleCasePoint | null;
  //hemoglobinDataSet: any;
  showZero: boolean;
  currentSelectPatientGroup: number[];
  nextAddingIndex: number;
}

export interface LayoutElement {
  aggregatedBy: string,
  valueToVisualize: string,
  i: string,
  x: number,
  y: number,
  w: number,
  h: number,
  plot_type: string,
  //  aggregation?: string,
  extraPair?: string,
  interventionDate?: number,
  interventionType?: string,
  notation: string
}

export const defaultState: ApplicationState = {
  layoutArray: [],
  // currentSelectedChart: "-1",
  rawDateRange: [new Date(2014, 0, 1).getTime(), new Date(2019, 11, 31).getTime()],
  filterSelection: [],
  totalAggregatedCaseCount: 0,
  totalIndividualCaseCount: 0,
  currentOutputFilterSet: [],
  currentSelectSet: [],
  currentSelectPatient: null,
  nextAddingIndex: 0,
  showZero: true,
  currentSelectPatientGroup: []
};