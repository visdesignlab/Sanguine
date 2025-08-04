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
  { value: 'b12', label: 'B12' },
  { value: 'iron', label: 'Iron' },
  { value: 'txa', label: 'Tranexamic Acid' },
  { value: 'amicar', label: 'Amicar' },
] as const;
  // Values of prophylactic medications
export type ProphylMed = typeof PROPHYL_MEDS[number]['value'];
// Readonly array of prophylactic medication options
export const ProphylMedOptions = PROPHYL_MEDS as ReadonlyArray<{ value: ProphylMed; label: string }>;

// Guideline adherence ---------------------------
export const GUIDELINE_ADHERENCE = [
  {
    value: 'rbc_adherence',
    label: 'Guideline Adherent RBC Transfusions',
    adherentCount: 'rbc_adherent',
    totalTransfused: 'rbc_total',
  },
  {
    value: 'ffp_adherence',
    label: 'Guideline Adherent FFP Transfusions',
    adherentCount: 'ffp_adherent',
    totalTransfused: 'ffp_total',
  },
  {
    value: 'plt_adherence',
    label: 'Guideline Adherent Platelet Transfusions',
    adherentCount: 'plt_adherent',
    totalTransfused: 'plt_total',
  },
  {
    value: 'cryo_adherence',
    label: 'Guideline Adherent Cryo Transfusions',
    adherentCount: 'cryo_adherent',
    totalTransfused: 'cryo_total',
  },
] as const;

// Adherent count fields
export const ADHERENT_COUNT_FIELDS = [
  { value: 'rbc_adherent', label: 'RBC Adherent Count' },
  { value: 'ffp_adherent', label: 'FFP Adherent Count' },
  { value: 'plt_adherent', label: 'Platelet Adherent Count' },
  { value: 'cryo_adherent', label: 'Cryo Adherent Count' },
] as const;

// Total transfused fields
export const TOTAL_TRANSFUSED_FIELDS = [
  { value: 'rbc_total', label: 'Total RBC Transfusions' },
  { value: 'ffp_total', label: 'Total FFP Transfusions' },
  { value: 'plt_total', label: 'Total Platelet Transfusions' },
  { value: 'cryo_total', label: 'Total Cryo Transfusions' },
] as const;

// Values of guideline adherence
export type GuidelineAdherence = typeof GUIDELINE_ADHERENCE[number]['value'];
// Values of adherent count fields
export type AdherentCountField = typeof ADHERENT_COUNT_FIELDS[number]['value'];
// Values of total transfused fields
export type TotalTransfusedField = typeof TOTAL_TRANSFUSED_FIELDS[number]['value'];

// Readonly array of guideline adherence options
export const GuidelineAdherenceOptions = GUIDELINE_ADHERENCE as ReadonlyArray<{
  value: GuidelineAdherence;
  label: string;
  adherentCount: AdherentCountField;
  totalTransfused: TotalTransfusedField;
}>;
// Readonly array of adherent count options
export const AdherentCountOptions = ADHERENT_COUNT_FIELDS as ReadonlyArray<{
  value: AdherentCountField;
  label: string;
}>;
// Readonly array of total transfused options
export const TotalTransfusedOptions = TOTAL_TRANSFUSED_FIELDS as ReadonlyArray<{
  value: TotalTransfusedField;
  label: string;
}>;

// PBM Dashboard --------------------
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
