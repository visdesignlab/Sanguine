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
export const BloodComponentOptions = BLOOD_COMPONENTS as ReadonlyArray<{ value: BloodComponent; label: string }>;

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
export const OutcomeOptions = OUTCOMES as ReadonlyArray<{ value: Outcome; label: string }>;

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
export const ProphylMedOptions = PROPHYL_MEDS as ReadonlyArray<{
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
  },
  ffp: {
    value: 'ffp_adherence',
    label: 'Guideline Adherent FFP Transfusions',
    adherentCount: 'ffp_adherent',
    totalTransfused: 'ffp_total',
    labDesc: ['INR'],
  },
  plt: {
    value: 'plt_adherence',
    label: 'Guideline Adherent Platelet Transfusions',
    adherentCount: 'plt_adherent',
    totalTransfused: 'plt_total',
    labDesc: ['PLT', 'Platelet Count'],
  },
  cryo: {
    value: 'cryo_adherence',
    label: 'Guideline Adherent Cryo Transfusions',
    adherentCount: 'cryo_adherent',
    totalTransfused: 'cryo_total',
    labDesc: ['Fibrinogen'],
  },
} as const;

export type GuidelineAdherence = typeof GUIDELINE_ADHERENCE[keyof typeof GUIDELINE_ADHERENCE]['value'];
export type AdherentCountField = typeof GUIDELINE_ADHERENCE[keyof typeof GUIDELINE_ADHERENCE]['adherentCount'];
export type TotalTransfusedField = typeof GUIDELINE_ADHERENCE[keyof typeof GUIDELINE_ADHERENCE]['totalTransfused'];

export const GuidelineAdherenceOptions = Object.values(GUIDELINE_ADHERENCE) as ReadonlyArray<{
  value: GuidelineAdherence;
  label: string;
  adherentCount: AdherentCountField;
  totalTransfused: TotalTransfusedField;
  labDesc: readonly string[];
}>;

// PBM Dashboard ---------------------------
export const AggregationOptions = ['sum', 'average'] as const;

export const dashboardYAxisVars = [
  ...BloodComponentOptions,
  ...GuidelineAdherenceOptions,
  ...OutcomeOptions,
  ...ProphylMedOptions,
].map((opt) => opt.value);

export type DashboardChartConfig = {
  i: string;
  yAxisVar: typeof dashboardYAxisVars[number];
  aggregation: typeof AggregationOptions[number];
};

export type DashboardChartData = Record<`${typeof AggregationOptions[number]}_${DashboardChartConfig['yAxisVar']}`, { quarter: string, data: number }[]>;
