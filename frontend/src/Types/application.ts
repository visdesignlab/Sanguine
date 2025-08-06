import { TransfusionEvent } from './database';

// Time formatting ------------------------------------------------
export type Quarter = `${number}-Q${1 | 2 | 3 | 4}`;

export const TIME_CONSTANTS = {
  TWO_HOURS_MS: 2 * 60 * 60 * 1000,
  TWO_DAYS_MS: 2 * 24 * 60 * 60 * 1000,
  ONE_DAY_MS: 24 * 60 * 60 * 1000,
  VENTILATOR_THRESHOLD_MINS: 1440,
} as const;

// Blood components -----------------------
export const BLOOD_COMPONENTS = [
  { value: 'rbc_units', label: 'RBCs Transfused', unit: 'units' },
  { value: 'ffp_units', label: 'FFP Transfused', unit: 'units' },
  { value: 'plt_units', label: 'Platelets Transfused', unit: 'units' },
  { value: 'cryo_units', label: 'Cryo Transfused', unit: 'units' },
  { value: 'cell_saver_ml', label: 'Cell Salvage Volume (ml) Used', unit: 'ml' },
] as const;
// Values of blood components
export type BloodComponent = typeof BLOOD_COMPONENTS[number]['value'];
// Readonly array of blood component options
export const BLOOD_COMPONENT_OPTIONS = BLOOD_COMPONENTS as ReadonlyArray<{
  value: BloodComponent;
  label: string;
  unit: string;
}>;

// Outcomes -------------------------------
export const OUTCOMES = [
  { value: 'los', label: 'Length of Stay', unit: 'days' },
  { value: 'death', label: 'Death', unit: 'visits' },
  { value: 'vent', label: 'Ventilator >24hr', unit: 'visits' },
  { value: 'stroke', label: 'Stroke', unit: 'visits' },
  { value: 'ecmo', label: 'ECMO', unit: 'visits' },
] as const;
// Values of outcomes
export type Outcome = typeof OUTCOMES[number]['value'];
// Readonly array of outcome options
export const OUTCOME_OPTIONS = OUTCOMES as ReadonlyArray<{
  value: Outcome;
  label: string;
  unit: string;
}>;

// Prophylactic Medications -------------------
export const PROPHYL_MEDS = [
  {
    value: 'b12',
    label: 'B12',
    aliases: ['b12', 'cobalamin'],
    unit: 'doses',
  },
  {
    value: 'iron',
    label: 'Iron',
    aliases: ['iron', 'ferrous', 'ferric'],
    unit: 'doses',
  },
  {
    value: 'txa',
    label: 'Tranexamic Acid',
    aliases: ['tranexamic', 'txa'],
    unit: 'doses',
  },
  {
    value: 'amicar',
    label: 'Amicar',
    aliases: ['amicar', 'aminocaproic'],
    unit: 'doses',
  },
] as const;
// Values of prophylactic medications
export type ProphylMed = typeof PROPHYL_MEDS[number]['value'];
// Readonly array of prophylactic medication options
export const PROPHYL_MED_OPTIONS = PROPHYL_MEDS as ReadonlyArray<{
  value: ProphylMed;
  label: string;
  aliases: readonly string[];
  unit: string;
}>;

// Guideline adherence ---------------------------
export const GUIDELINE_ADHERENCE = {
  rbc: {
    value: 'rbc_adherence',
    label: 'Guideline Adherent RBC Transfusions',
    adherentCount: 'rbc_adherent',
    totalTransfused: 'rbc_total',
    labDesc: ['HGB', 'Hemoglobin'],
    adherenceCheck: (labValue: number) => labValue <= 7.5,
    transfusionUnits: ['rbc_units', 'rbc_vol'] as const,
    unit: '%',
  },
  ffp: {
    value: 'ffp_adherence',
    label: 'Guideline Adherent FFP Transfusions',
    adherentCount: 'ffp_adherent',
    totalTransfused: 'ffp_total',
    labDesc: ['INR'],
    adherenceCheck: (labValue: number) => labValue >= 1.5,
    transfusionUnits: ['ffp_units', 'ffp_vol'] as const,
    unit: '%',
  },
  plt: {
    value: 'plt_adherence',
    label: 'Guideline Adherent Platelet Transfusions',
    adherentCount: 'plt_adherent',
    totalTransfused: 'plt_total',
    labDesc: ['PLT', 'Platelet Count'],
    adherenceCheck: (labValue: number) => labValue >= 15000,
    transfusionUnits: ['plt_units', 'plt_vol'] as const,
    unit: '%',
  },
  cryo: {
    value: 'cryo_adherence',
    label: 'Guideline Adherent Cryo Transfusions',
    adherentCount: 'cryo_adherent',
    totalTransfused: 'cryo_total',
    labDesc: ['Fibrinogen'],
    adherenceCheck: (labValue: number) => labValue >= 175,
    transfusionUnits: ['cryo_units', 'cryo_vol'],
    unit: '%',
  },
} as const;

export type GuidelineAdherence = typeof GUIDELINE_ADHERENCE[keyof typeof GUIDELINE_ADHERENCE]['value'];
export type AdherentCountField = typeof GUIDELINE_ADHERENCE[keyof typeof GUIDELINE_ADHERENCE]['adherentCount'];
export type TotalTransfusedField = typeof GUIDELINE_ADHERENCE[keyof typeof GUIDELINE_ADHERENCE]['totalTransfused'];

export const GUIDELINE_ADHERENCE_OPTIONS = Object.values(GUIDELINE_ADHERENCE) as ReadonlyArray<{
  value: GuidelineAdherence;
  label: string;
  adherentCount: AdherentCountField;
  totalTransfused: TotalTransfusedField;
  labDesc: readonly string[];
  adherenceCheck: (labValue: number) => boolean;
  transfusionUnits: readonly (keyof TransfusionEvent)[];
  unit: string;
}>;

// CPT Codes -------------------------------
export const CPT_CODES = {
  stroke: ['99291', '1065F', '1066F'],
  ecmo: [
    '33946', '33947', '33948', '33949', '33950', '33951', '33952', '33953', '33954', '33955',
    '33956', '33957', '33958', '33959', '33960', '33961', '33962', '33963', '33964', '33965',
    '33966', '33969', '33984', '33985', '33986', '33987', '33988', '33989',
  ],
} as const;

// PBM Dashboard ------------------------------------------------------

// --- Dashboard charts ---
export const AGGREGATION_OPTIONS = {
  sum: { label: 'Sum' },
  avg: { label: 'Average' },
} as const;
export const dashboardYAxisOptions = [...BLOOD_COMPONENT_OPTIONS, ...GUIDELINE_ADHERENCE_OPTIONS, ...OUTCOME_OPTIONS, ...PROPHYL_MED_OPTIONS];
export const dashboardYAxisVars = dashboardYAxisOptions.map((opt) => opt.value);

export type DashboardChartConfig = {
  i: string;
  yAxisVar: typeof dashboardYAxisVars[number];
  aggregation: keyof typeof AGGREGATION_OPTIONS;
};

export type DashboardChartConfigKey = `${keyof typeof AGGREGATION_OPTIONS}_${typeof dashboardYAxisVars[number]}`;
export type DashboardChartData = Record<`${keyof typeof AGGREGATION_OPTIONS}_${DashboardChartConfig['yAxisVar']}`, { quarter: Quarter, data: number }[]>;

// --- Dashboard stats ---
export type DashboardStatConfig = {
  i: string;
  var: typeof dashboardYAxisVars[number];
  aggregation?: keyof typeof AGGREGATION_OPTIONS;
  title: string;
};

export type DashboardStatData = Record<`${keyof typeof AGGREGATION_OPTIONS}_${DashboardStatConfig['var']}`, {data: string, diff: number, comparedTo?: string} >;
