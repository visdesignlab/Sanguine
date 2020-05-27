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
  DATE: Date;
  [key: string]: number | Date;

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
  currentSelectPatientGroup: number[]
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
  interventionType?: string
}

export const defaultState: ApplicationState = {
  layoutArray: [],
  currentSelectedChart: "-1",
  rawDateRange: [new Date(2014, 0, 1).getTime(), new Date(2019, 11, 31).getTime()],
  filterSelection: [],
  totalAggregatedCaseCount: 0,
  totalIndividualCaseCount: 0,
  currentOutputFilterSet: [],
  currentSelectSet: [],
  currentSelectPatient: null,
  //hemoglobinDataSet: [],
  showZero: true,
  currentSelectPatientGroup: []
};

export const offset = {
  regular: { left: 85, bottom: 40, right: 10, top: 40, margin: 20 },
  minimum: { left: 35, bottom: 40, right: 10, top: 40, margin: 20 },
  intervention: { left: 95, bottom: 40, right: 10, top: 40, margin: 20 }

};

export const extraPairOptions = [
  { title: "Preop Hemoglobin", value: "Preop Hemo" },
  { title: "Postop Hemoglobin", value: "Postop Hemo" },
  { title: "Total Transfusion", value: "Total Transfusion" },
  { title: "Per Case Transfusion", value: "Per Case" },
  { title: "Zero Transfusion Cases", value: "Zero Transfusion" },
  { title: "Risk Score", value: "RISK" },
  // { title: "Severity of Illness", value: "SOI" },
  { title: "Mortality Rate", value: "Mortality" },
  { title: "Ventilation Rate", value: "Vent" }
]

//export const minimumOffset = 
export const extraPairWidth: any = { Violin: 110, Dumbbell: 110, BarChart: 50, Basic: 30, Outcomes: 35 }
export const extraPairPadding = 5;
export const minimumWidthScale = 18;

export const AxisLabelDict: any = {
  PRBC_UNITS: "Intraoperative RBCs Transfused",
  FFP_UNITS: "Intraoperative FFP Transfused",
  PLT_UNITS: "Intraoperative Platelets Transfused",
  CRYO_UNITS: "Intraoperative Cryo Transfused",
  CELL_SAVER_ML: "Cell Salvage Volume (ml)",
  SURGEON_ID: "Surgeon ID",
  ANESTHOLOGIST_ID: "Anesthologist ID",
  YEAR: "Year",
  QUARTER: "Quarter",
  MONTH: "Month",
  HEMO_VALUE: "Hemoglobin Value",
  PREOP_HEMO: "Preoperative Hemoglobin Value",
  POSTOP_HEMO: "Postoperative Hemoglobin Value",
  ROM: "Risk of Mortality",
  SOI: "Severity of Illness",
  Vent: "Ventilator Over 1440 min"
};

export const BloodProductCap: any = {
  PRBC_UNITS: 5,
  FFP_UNITS: 10,
  CRYO_UNITS: 10,
  PLT_UNITS: 10,
  CELL_SAVER_ML: 1000
}

export const CELL_SAVER_TICKS = ["0", "0-1h", "1h-2h", "2h-3h", "3h-4h", "4h-5h", "5h-6h", "6h-7h", "7h-8h", "8h-9h", "9h-1k", "1k+"]

export const dumbbellFacetOptions = [
  { value: "SURGEON_ID", key: "SURGEON_ID", text: "Surgeon ID" },
  { value: "YEAR", key: "YEAR", text: "Year" },
  {
    value: "ANESTHOLOGIST_ID",
    key: "ANESTHOLOGIST_ID",
    text: "Anesthologist ID"
  },
  { value: "QUARTER", key: "QUARTER", text: "Quarter" },
  { value: "MONTH", key: "MONTH", text: "Month" }
]

export const barChartAggregationOptions = [
  { value: "SURGEON_ID", key: "SURGEON_ID", text: "Surgeon ID" },
  { value: "YEAR", key: "YEAR", text: "Year" },
  {
    value: "ANESTHOLOGIST_ID",
    key: "ANESTHOLOGIST_ID",
    text: "Anesthologist ID"
  }
];

export const interventionChartType = [
  { value: "HEATMAP", key: "HEATMAP", text: "Heat Map" },
  { value: "VIOLIN", key: "VIOLIN", text: "Violin Plot" }
]


export const barChartValuesOptions = [
  {
    value: "PRBC_UNITS",
    key: "PRBC_UNITS",
    text: "Intraoperative RBCs Transfused"
  },
  {
    value: "FFP_UNITS",
    key: "FFP_UNITS",
    text: "Intraoperative FFP Transfused"
  },
  {
    value: "PLT_UNITS",
    key: "PLT_UNITS",
    text: "Intraoperative Platelets Transfused"
  },
  {
    value: "CRYO_UNITS",
    key: "CRYO_UNITS",
    text: "Intraoperative Cryo Transfused"
  },
  {
    value: "CELL_SAVER_ML",
    key: "CELL_SAVER_ML",
    text: "Cell Salvage Volume (ml)"
  }
];


export const HIPAA_Sensitive = new Set([
  "Gender (M/F)",
  "Gender (Male/Female)",
  "Race Code",
  "Race Description",
  "Ethnicity Code",
  "Ethnicity Description",
  "Date of Death",
  "Date of Birth",
  "Surgery Date",
  "Surgery Start Time",
  "Surgery End Time"
])

export const Accronym = {
  CABG: "Coronary Artery Bypass Grafting",
  TAVR: "Transcatheter Aortic Valve Replacement",
  VAD: "Ventricular Assist Devices",
  AVR: "Aortic Valve Replacement",
  ECMO: "Extracorporeal Membrane Oxygenation",
  MVR: "Mitral Valve Repair",
  EGD: "Esophagogastroduodenoscopy",
  VATS: "Video-assisted Thoracoscopic Surgery",
  TVR: "Tricuspid Valve Repair",
  PVR: "Proliferative Vitreoretinopathy"
}

export const stateUpdateWrapperUseJSON = (oldState: any, newState: any, updateFunction: (value: React.SetStateAction<any>) => void) => {
  if (JSON.stringify(oldState) !== JSON.stringify(newState)) {
    updateFunction(newState)
  }
}