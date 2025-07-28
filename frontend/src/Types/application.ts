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
  { value: 'b12', label: 'B12' },
  { value: 'iron', label: 'Iron' },
  { value: 'txa', label: 'Tranexamic Acid' },
  { value: 'amicar', label: 'Amicar' },
] as const;
// Values of outcomes
export type Outcome = typeof OUTCOMES[number]['value'];
// Readonly array of outcome options
export const OutcomeOptions = OUTCOMES as ReadonlyArray<{ value: Outcome; label: string }>;

export type DashboardChartConfig = {
  i: string;
  yAxisVar: BloodComponent;
  aggregation: 'sum' | 'average';
};
