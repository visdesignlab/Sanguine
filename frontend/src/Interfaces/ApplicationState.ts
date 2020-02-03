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
}
export interface LayoutElement{
  x_axis_name: string,
  y_axis_name: string,
  i: string,
  // x: number,
  // y: number,
  // w: number,
  // h: number,
  // plot_type: string
}

export const defaultState: ApplicationState = {
  layoutArray: [],
  currentSelectedChart: "-1",
  perCaseSelected: false,
  yearRange: [0, 5],
  filterSelection: []
};