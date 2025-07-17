export const BLOOD_COMPONENTS = ['rbc_units', 'ffp_units', 'plt_units', 'cryo_units', 'cell_saver_ml'] as const;
export type BloodComponent = typeof BLOOD_COMPONENTS[number];
export const BloodComponentOptions: { value: typeof BLOOD_COMPONENTS[number]; label: string }[] = [
  { value: 'rbc_units', label: 'Intraoperative RBCs Transfused' },
  { value: 'ffp_units', label: 'Intraoperative FFP Transfused' },
  { value: 'plt_units', label: 'Intraoperative Platelets Transfused' },
  { value: 'cryo_units', label: 'Intraoperative Cryo Transfused' },
  { value: 'cell_saver_ml', label: 'Cell Salvage Volume (ml)' },
];
