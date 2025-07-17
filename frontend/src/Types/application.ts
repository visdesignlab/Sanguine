export const BLOOD_COMPONENTS = ['rbc_units', 'ffp_units', 'plt_units', 'cryo_units', 'cell_saver_ml'] as const;
export type BloodComponent = typeof BLOOD_COMPONENTS[number];
export const BloodComponentOptions: { value: BloodComponent; label: string }[] = [
  { value: 'rbc_units', label: 'RBCs Transfused' },
  { value: 'ffp_units', label: 'FFP Transfused' },
  { value: 'plt_units', label: 'Platelets Transfused' },
  { value: 'cryo_units', label: 'Cryo Transfused' },
  { value: 'cell_saver_ml', label: 'Cell Salvage Volume (ml) Used' },
];

const OUTCOMES = ['los'] as const;
export type Outcome = typeof OUTCOMES[number];
export const OutcomeOptions: { value: Outcome; label: string }[] = [
  { value: 'los', label: 'Length of Stay' },
];

// A layout element has a ID, size, positions
type BaseLayoutElement = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  maxH: 2;
};

// Dashboard Layout of each dashboard chart type
export type DashboardChartLayoutElement = BaseLayoutElement & {
  yAxisVar: BloodComponent | Outcome;
  aggregation: 'sum';
};
