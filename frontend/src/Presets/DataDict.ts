export const BLOOD_COMPONENTS = ['PRBC_UNITS', 'FFP_UNITS', 'PLT_UNITS', 'CRYO_UNITS', 'CELL_SAVER_ML'] as const;
export type BloodComponent = typeof BLOOD_COMPONENTS[number];
export const BloodComponentOptions: { key: typeof BLOOD_COMPONENTS[number]; value: string }[] = [
  { key: 'PRBC_UNITS', value: 'Intraoperative RBCs Transfused' },
  { key: 'FFP_UNITS', value: 'Intraoperative FFP Transfused' },
  { key: 'PLT_UNITS', value: 'Intraoperative Platelets Transfused' },
  { key: 'CRYO_UNITS', value: 'Intraoperative Cryo Transfused' },
  { key: 'CELL_SAVER_ML', value: 'Cell Salvage Volume (ml)' },
];
export function isBloodComponent(str: string): str is BloodComponent {
  return BLOOD_COMPONENTS.includes(str as BloodComponent);
}

const _AGGREGATIONS = ['SURGEON_PROV_ID', 'ANESTH_PROV_ID', 'YEAR', 'QUARTER'] as const;
export type Aggregation = typeof _AGGREGATIONS[number];
const AggregationOptions: { key: typeof _AGGREGATIONS[number]; value: string }[] = [
  { key: 'SURGEON_PROV_ID', value: 'Surgeon ID' },
  { key: 'ANESTH_PROV_ID', value: 'Anesthesiologist ID' },
  { key: 'YEAR', value: 'Year' },
  { key: 'QUARTER', value: 'Quarter' },
];
export function isAggregation(str: string): str is Aggregation {
  return _AGGREGATIONS.includes(str as Aggregation);
}

export const HEMO_OPTIONS = ['PREOP_HEMO', 'POSTOP_HEMO'] as const;
export type HemoOption = typeof HEMO_OPTIONS[number];
export const ScatterYOptions: { key: HemoOption; value: string; }[] = [
  { key: 'PREOP_HEMO', value: 'Preoperative Hemoglobin Value' },
  { key: 'POSTOP_HEMO', value: 'Postoperative Hemoglobin Value' },
];
export function isHemoOption(str: string): str is HemoOption {
  return HEMO_OPTIONS.includes(str as HemoOption);
}

const OUTCOMES = ['DEATH', 'VENT', 'STROKE', 'ECMO', 'B12', 'IRON', 'TXA', 'AMICAR'] as const;
export type Outcome = typeof OUTCOMES[number];
export const OutcomeOptions: { key: typeof OUTCOMES[number]; value: string }[] = [
  { key: 'DEATH', value: 'Death' },
  { key: 'VENT', value: 'Ventilator Over 24hr' },
  { key: 'STROKE', value: 'Stroke' },
  { key: 'ECMO', value: 'ECMO' },
  { key: 'B12', value: 'B12' },
  { key: 'IRON', value: 'Iron' },
  { key: 'TXA', value: 'Tranexamic Acid' },
  { key: 'AMICAR', value: 'Amicar' },
];

export const EXTRA_PAIR_OPTIONS = [...OUTCOMES, 'PREOP_HEMO', 'POSTOP_HEMO', 'TOTAL_TRANS', 'PER_CASE', 'ZERO_TRANS', 'RISK'] as const;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ExtraPairOptions: { key: typeof EXTRA_PAIR_OPTIONS[number]; value: string }[] = (OutcomeOptions as any).concat([
  { key: 'PREOP_HEMO', value: 'Preop HGB' },
  { key: 'POSTOP_HEMO', value: 'POSTOP_HEMO' },
  { key: 'TOTAL_TRANS', value: 'TOTAL_TRANS' },
  { key: 'PER_CASE', value: 'PER_CASE' },
  { key: 'ZERO_TRANS', value: 'ZERO_TRANS' },
  { key: 'RISK', value: 'RISK' },
]);

const dumbbellValueOptions = [{ key: 'HGB_VALUE', value: 'Hemoglobin Value' }];

export const typeDiction = ['DUMBBELL', 'SCATTER', 'HEATMAP', 'COST'] as const;

export const addOptions = [
  [[...BloodComponentOptions, ...AggregationOptions], dumbbellValueOptions], // Dumbbell chart
  [BloodComponentOptions, ScatterYOptions], // Scatter plot
  [BloodComponentOptions, AggregationOptions], // Heatmap
  [[...BloodComponentOptions, { key: 'COST', value: 'Cost' }], AggregationOptions], // Cost
  [BloodComponentOptions, [AggregationOptions[0], AggregationOptions[1]]],
];

const SurgeryUrgency: { key: number; value: 'Urgent' | 'Elective' | 'Emergent'}[] = [
  { key: 0, value: 'Urgent' },
  { key: 1, value: 'Elective' },
  { key: 2, value: 'Emergent' },
];
export const SurgeryUrgencyArray = SurgeryUrgency.map((d) => d.value);
export type SurgeryUrgencyType = 'Urgent' | 'Elective' | 'Emergent' | 'Unknown';

export const AcronymDictionary = {
  CABG: 'Coronary Artery Bypass Grafting',
  TAVR: 'Transcatheter Aortic Valve Replacement',
  VAD: 'Ventricular Assist Devices',
  AVR: 'Aortic Valve Replacement',
  ECMO: 'Extracorporeal Membrane Oxygenation',
  MVR: 'Mitral Valve Repair',
  EGD: 'Esophagogastroduodenoscopy',
  VATS: 'Video-assisted Thoracoscopic Surgery',
  TVR: 'Tricuspid Valve Repair',
  PVR: 'Proliferative Vitreoretinopathy',
  VENT: 'Over 24 Hours Ventilator Usage',
  RISK: 'Diagnosis-related Group Weight (Risk Score)',
  'Zero %': 'Zero Transfusion',
  DEATH: 'Death in hospital',
  STROKE: 'Stroke',
  TXA: 'Tranexamic Acid',
  IRON: 'Iron',
  B12: 'B12',
  AMICAR: 'Amicar',
  PRBC_UNITS: 'Intraoperative RBCs Transfused',
  FFP_UNITS: 'Intraoperative FFP Transfused',
  PLT_UNITS: 'Intraoperative Platelets Transfused',
  CRYO_UNITS: 'Intraoperative Cryo Transfused',
  CELL_SAVER_ML: 'Cell Salvage Volume',
  SURGEON_PROV_ID: 'Surgeon ID',
  ANESTH_PROV_ID: 'Anesthesiologist ID',
  YEAR: 'Year',
  QUARTER: 'Quarter',
  MONTH: 'Month',
  HGB_VALUE: 'Hemoglobin Value',
  PREOP_HEMO: 'Preoperative Hemoglobin Value',
  POSTOP_HEMO: 'Postoperative Hemoglobin Value',
  DRG_WEIGHT: 'Diagnosis-related Group Weight',
  COST: 'Blood Component Cost per Case',
};

export const HIPAASensitive = [
  'Gender (M/F)',
  'Gender (Male/Female)',
  'Race Code',
  'Race Description',
  'Ethnicity Code',
  'Ethnicity Description',
  'Date of Death',
  'Date of Birth',
  'Surgery Date',
  'Surgery Start Time',
  'Surgery End Time',
  'CASE_ID',
  'VISIT_NO',
  'CASE_DATE',
  'MONTH',
  'MRN',
  'Hospital Visit Number',
] as const;
