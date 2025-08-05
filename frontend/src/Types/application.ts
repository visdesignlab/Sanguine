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
  { value: 'rbc_units', label: 'RBCs Transfused' },
  { value: 'ffp_units', label: 'FFP Transfused' },
  { value: 'plt_units', label: 'Platelets Transfused' },
  { value: 'cryo_units', label: 'Cryo Transfused' },
  { value: 'cell_saver_ml', label: 'Cell Salvage Volume (ml) Used' },
] as const;
// Values of blood components
export type BloodComponent = typeof BLOOD_COMPONENTS[number]['value'];
// Readonly array of blood component options
export const BLOOD_COMPONENT_OPTIONS = BLOOD_COMPONENTS as ReadonlyArray<{ value: BloodComponent; label: string }>;

// Outcomes -------------------------------
export const OUTCOMES = [
  { value: 'los', label: 'Length of Stay' },
  { value: 'death', label: 'Death' },
  { value: 'vent', label: 'Ventilator >24hr' },
  { value: 'stroke', label: 'Stroke' },
  { value: 'ecmo', label: 'ECMO' },
] as const;
// Values of outcomes
export type Outcome = typeof OUTCOMES[number]['value'];
// Readonly array of outcome options
export const OUTCOME_OPTIONS = OUTCOMES as ReadonlyArray<{ value: Outcome; label: string }>;

// Prophylactic Medications -------------------
export const PROPHYL_MEDS = [
  {
    value: 'b12',
    label: 'B12',
    aliases: ['b12', 'cobalamin'],
  },
  {
    value: 'iron',
    label: 'Iron',
    aliases: ['iron', 'ferrous', 'ferric'],
  },
  {
    value: 'txa',
    label: 'Tranexamic Acid',
    aliases: ['tranexamic', 'txa'],
  },
  {
    value: 'amicar',
    label: 'Amicar',
    aliases: ['amicar', 'aminocaproic'],
  },
] as const;
  // Values of prophylactic medications
export type ProphylMed = typeof PROPHYL_MEDS[number]['value'];
// Readonly array of prophylactic medication options
export const PROPHYL_MED_OPTIONS = PROPHYL_MEDS as ReadonlyArray<{
  value: ProphylMed;
  label: string;
  aliases: readonly string[];
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
  },
  ffp: {
    value: 'ffp_adherence',
    label: 'Guideline Adherent FFP Transfusions',
    adherentCount: 'ffp_adherent',
    totalTransfused: 'ffp_total',
    labDesc: ['INR'],
    adherenceCheck: (labValue: number) => labValue >= 1.5,
    transfusionUnits: ['ffp_units', 'ffp_vol'] as const,
  },
  plt: {
    value: 'plt_adherence',
    label: 'Guideline Adherent Platelet Transfusions',
    adherentCount: 'plt_adherent',
    totalTransfused: 'plt_total',
    labDesc: ['PLT', 'Platelet Count'],
    adherenceCheck: (labValue: number) => labValue >= 15000,
    transfusionUnits: ['plt_units', 'plt_vol'] as const,
  },
  cryo: {
    value: 'cryo_adherence',
    label: 'Guideline Adherent Cryo Transfusions',
    adherentCount: 'cryo_adherent',
    totalTransfused: 'cryo_total',
    labDesc: ['Fibrinogen'],
    adherenceCheck: (labValue: number) => labValue >= 175,
    transfusionUnits: ['cryo_units', 'cryo_vol'],
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
export const AGGREGATION_OPTIONS = ['sum', 'average'] as const;

export const dashboardYAxisVars = [
  ...BLOOD_COMPONENT_OPTIONS,
  ...GUIDELINE_ADHERENCE_OPTIONS,
  ...OUTCOME_OPTIONS,
  ...PROPHYL_MED_OPTIONS,
].map((opt) => opt.value);

export type DashboardChartConfig = {
  i: string;
  yAxisVar: typeof dashboardYAxisVars[number];
  aggregation: typeof AGGREGATION_OPTIONS[number];
};

export type DashboardChartConfigKey = `${typeof AGGREGATION_OPTIONS[number]}_${typeof dashboardYAxisVars[number]}`;
export type DashboardChartData = Record<`${typeof AGGREGATION_OPTIONS[number]}_${DashboardChartConfig['yAxisVar']}`, { quarter: Quarter, data: number }[]>;

// --- Dashboard stats ---
export type DashboardStatConfig = {
  i: string;
  var: typeof dashboardYAxisVars[number];
  aggregation?: typeof AGGREGATION_OPTIONS[number];
  title: string;
};
