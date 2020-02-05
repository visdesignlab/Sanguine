export interface SelectSet {
  set_name: string;
  set_value: number;
}

export interface SingularDataPoint {
  xVal: any;
  yVal: number;
}

export interface DumbbellDataPoint {
  startXVal: number;
  endXVal: number;
  yVal: number;
  visitNum: number;
  caseId: number;
  YEAR: number;
  SURGEON_ID: number;
  ANESTHOLOGIST_ID: number;
  patientID: number;
}

export interface ApplicationState {
  layoutArray: LayoutElement[];
  currentSelectedChart: string;
  perCaseSelected: boolean;
  yearRange: number[];
  filterSelection: string[];
  totalCaseCount: number;
  dumbbellSorted: boolean;
}

export interface LayoutElement{
  x_axis_name: string,
  y_axis_name: string,
  i: string,
  x: number,
  y: number,
  w: number,
  h: number,
  // plot_type: string
}

export const defaultState: ApplicationState = {
  layoutArray: [],
  currentSelectedChart: "-1",
  perCaseSelected: false,
  yearRange: [0, 5],
  filterSelection: [],
  totalCaseCount: 0,
  dumbbellSorted: false
};

export const offset = { left: 70, bottom: 60, right: 10, top: 0, margin: 30 };
export const AxisLabelDict:any = {
  PRBC_UNITS: "Intraoperative RBCs Transfused",
  FFP_UNITS: "Intraoperative FFP Transfused",
  PLT_UNITS: "Intraoperative Platelets Transfused",
  CRYO_UNITS: "Intraoperative Cryo Transfused",
  CELL_SAVER_ML: "Cell Salvage Volume (ml)",
  SURGEON_ID: "Surgeon ID",
  ANESTHOLOGIST_ID: "Anesthologist ID",
  YEAR: "Year",
  HEMO_VALUE:"Hemoglobin Value"
};