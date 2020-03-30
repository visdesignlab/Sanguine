export interface SelectSet {
  set_name: string;
  set_value: number;
}

export interface BarChartDataPoint {
  aggregateAttribute: any;
  kdeCal: any[];
  actualDataPoints: any[]
  totalVal: number;
  caseCount: number;
  median: number;
  zeroCaseNum: number;
}

export interface SingleCasePoint {
  visitNum: number;
  caseId: number;
  YEAR: number;
  SURGEON_ID: number;
  ANESTHOLOGIST_ID: number;
  patientID: number;
  [key: string]: number;
}
export interface ScatterDataPoint {
  xVal: number;
  yVal: number;
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
  currentSelectedChart: string;
  perCaseSelected: boolean;
  yearRange: number[];
  filterSelection: string[];
  totalCaseCount: number;
  dumbbellSorted: boolean;
  currentSelectSet: SelectSet | null;
  currentSelectPatient: SingleCasePoint | null;
  hemoglobinDataSet: any;
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
  aggregation?: string,
  extraPair?: string[]
}

export const defaultState: ApplicationState = {
  layoutArray: [],
  currentSelectedChart: "-1",
  perCaseSelected: false,
  yearRange: [0, 5],
  filterSelection: [],
  totalCaseCount: 0,
  dumbbellSorted: false,
  currentSelectSet: null,
  currentSelectPatient: null,
  hemoglobinDataSet: []
};

export const offset = { left: 85, bottom: 40, right: 10, top: 40, margin: 20 };
export const minimumOffset = { left: 35, bottom: 40, right: 10, top: 40, margin: 20 }
export const extraPairWidth: any = { Dumbbell: 110, BarChart: 50, Basic: 30 }
export const extraPairPadding = 5

export const AxisLabelDict: any = {
  PRBC_UNITS: "Intraoperative RBCs Transfused",
  FFP_UNITS: "Intraoperative FFP Transfused",
  PLT_UNITS: "Intraoperative Platelets Transfused",
  CRYO_UNITS: "Intraoperative Cryo Transfused",
  CELL_SAVER_ML: "Cell Salvage Volume (ml)",
  SURGEON_ID: "Surgeon ID",
  ANESTHOLOGIST_ID: "Anesthologist ID",
  YEAR: "Year",
  HEMO_VALUE: "Hemoglobin Value",
  PREOP_HEMO: "Preoperative Hemoglobin Value",
  POSTOP_HEMO: "Postoperative Hemoglobin Value"
};

export const BloodProductCap: any = {
  PRBC_UNITS: 8,
  FFP_UNITS: 15,
  CRYO_UNITS: 30,
  PLT_UNITS: 5,
  CELL_SAVER_ML: 5000
}