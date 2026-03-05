export const RBC_UNITS = 'rbc_units';
export const FFP_UNITS = 'ffp_units';
export const PLT_UNITS = 'plt_units';
export const CRYO_UNITS = 'cryo_units';
export const CELL_SAVER_ML = 'cell_saver_ml';

export const BLOOD_PRODUCTS_ARRAY = [RBC_UNITS, FFP_UNITS, PLT_UNITS, CRYO_UNITS, CELL_SAVER_ML] as const;
const BLOOD_COMPONENT_DECIMALS = { sum: 0, avg: 2 };

export const BLOOD_COMPONENTS = [
  {
    value: RBC_UNITS,
    label: {
      base: 'RBCs Transfused',
      sum: 'Total RBCs Transfused',
      avg: 'Average RBCs Transfused Per Visit',
    },
    units: { sum: 'RBC Units', avg: 'RBC Units' },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
  {
    value: FFP_UNITS,
    label: {
      base: 'FFP Transfused',
      sum: 'Total FFP Transfused',
      avg: 'Average FFP Transfused Per Visit',
    },
    units: { sum: 'Plasma Units', avg: 'Plasma Units' },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
  {
    value: PLT_UNITS,
    label: {
      base: 'Platelets Transfused',
      sum: 'Total Platelets Transfused',
      avg: 'Average Platelets Transfused Per Visit',
    },
    units: { sum: 'Platelet Units', avg: 'Platelet Units' },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
  {
    value: CRYO_UNITS,
    label: {
      base: 'Cryo Transfused',
      sum: 'Total Cryo Transfused',
      avg: 'Average Cryo Transfused Per Visit',
    },
    units: { sum: 'Cryo Units', avg: 'Cryo Units' },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
  {
    value: CELL_SAVER_ML,
    label: {
      base: 'Cell Salvage Volume (ml) Used',
      sum: 'Total Cell Salvage Volume (ml) Used',
      avg: 'Average Cell Salvage Volume (ml) Used Per Visit',
    },
    units: { sum: 'mL', avg: 'mL' },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
] as const;

// Values of blood components
export type BloodComponent = typeof BLOOD_COMPONENTS[number]['value'];
