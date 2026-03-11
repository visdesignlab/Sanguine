export const RBC_UNITS = 'rbc_units';
export const FFP_UNITS = 'ffp_units';
export const PLT_UNITS = 'plt_units';
export const CRYO_UNITS = 'cryo_units';
export const CELL_SAVER_ML = 'cell_saver_ml';
export const WHOLE_BLOOD_UNITS = 'whole_units';

export const BLOOD_PRODUCTS_ARRAY = [RBC_UNITS, FFP_UNITS, PLT_UNITS, CRYO_UNITS, CELL_SAVER_ML] as const;
const BLOOD_COMPONENT_DECIMALS = { sum: 0, avg: 2 };

export type BloodComponent = typeof RBC_UNITS | typeof FFP_UNITS | typeof PLT_UNITS | typeof CRYO_UNITS | typeof CELL_SAVER_ML;

export const BLOOD_COMPONENTS = [
  {
    value: RBC_UNITS,
    label: {
      short: 'RBCs',
      base: 'RBCs Transfused',
      sum: 'Total RBCs Transfused',
      avg: 'Average RBCs Transfused Per Visit',
    },
    units: {
      sum: 'RBC Units',
      avg: 'RBC Units Per Visit',
      sumShort: 'Units',
      avgShort: 'Units',
    },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
  {
    value: FFP_UNITS,
    label: {
      short: 'FFP',
      base: 'FFP Transfused',
      sum: 'Total FFP Transfused',
      avg: 'Average FFP Transfused Per Visit',
    },
    units: {
      sum: 'Plasma Units',
      avg: 'Plasma Units Per Visit',
      sumShort: 'Units',
      avgShort: 'Units',
    },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
  {
    value: PLT_UNITS,
    label: {
      short: 'Platelets',
      base: 'Platelets Transfused',
      sum: 'Total Platelets Transfused',
      avg: 'Average Platelets Transfused Per Visit',
    },
    units: {
      sum: 'Platelet Units',
      avg: 'Platelet Units Per Visit',
      sumShort: 'Units',
      avgShort: 'Units',
    },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
  {
    value: CRYO_UNITS,
    label: {
      short: 'Cryo',
      base: 'Cryo Transfused',
      sum: 'Total Cryo Transfused',
      avg: 'Average Cryo Transfused Per Visit',
    },
    units: {
      sum: 'Cryo Units',
      avg: 'Cryo Units Per Visit',
      sumShort: 'Units',
      avgShort: 'Units',
    },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
  {
    value: WHOLE_BLOOD_UNITS,
    label: {
      short: 'Whole Blood',
      base: 'Whole Blood Transfused',
      sum: 'Total Whole Blood Transfused',
      avg: 'Average Whole Blood Transfused Per Visit',
    },
    units: {
      sum: 'Whole Blood Units',
      avg: 'Whole Blood Units Per Visit',
      sumShort: 'Units',
      avgShort: 'Units',
    },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
  {
    value: CELL_SAVER_ML,
    label: {
      short: 'Cell Salvage',
      base: 'Cell Salvage Volume (ml) Used',
      sum: 'Total Cell Salvage Volume (ml) Used',
      avg: 'Average Cell Salvage Volume (ml) Used Per Visit',
    },
    units: {
      sum: 'mL',
      avg: 'mL Per Visit',
      sumShort: 'mL',
      avgShort: 'mL',
    },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
] as const;
