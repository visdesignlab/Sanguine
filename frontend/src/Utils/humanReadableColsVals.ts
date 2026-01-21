import {
  BLOOD_COMPONENTS,
  OUTCOMES,
  PROPHYL_MEDS,
  GUIDELINE_ADHERENT,
  LAB_RESULTS,
  COSTS,
  TIME_AGGREGATION_OPTIONS,
} from '../Types/application';

const columnNameMap: Record<string, string> = {
  adm_dtm: 'Admission Date',
  age_at_adm: 'Age at Admission',
  antifibrinolytic: 'Antifibrinolytic',
  apr_drg_weight: 'APR DRG Weight',
  ms_drg_weight: 'MS DRG Weight',
  b12: 'B12',
  cell_saver_cost: 'Cell Saver Cost',
  cell_saver_ml: 'Cell Saver (mL)',
  cryo_adherent: '# Cryoprecipitate Units Adherent',
  cryo_units: '# Cryoprecipitate Units',
  cryo_units_cost: 'Cryoprecipitate Units Cost',
  death: 'Death',
  dsch_dtm: 'Discharge Date',
  ecmo: 'ECMO',
  ffp_adherent: '# FFP Units Adherent',
  ffp_units: '# FFP Units',
  ffp_units_cost: 'FFP Units Cost',
  iron: 'Iron',
  los: 'Length of Stay',
  month: 'Month',
  mrn: 'MRN',
  overall_adherent: '# Overall Units Adherent',
  overall_units: '# Overall Units',
  pat_class_desc: 'Patient Class Description',
  plt_adherent: '# Platelet Units Adherent',
  plt_units: '# Platelet Units',
  plt_units_cost: 'Platelet Units Cost',
  quarter: 'Quarter',
  rbc_adherent: '# RBC Units Adherent',
  rbc_units: '# RBC Units',
  rbc_units_cost: 'RBC Units Cost',
  stroke: 'Stroke',
  vent: 'Ventilator',
  visit_no: 'Visit Number',
  whole_units: '# Whole Blood Units',
  year: 'Year',
  departments: 'Departments',
};

export function makeHumanReadableColumn(columnName: keyof typeof columnNameMap): string {
  return columnNameMap[columnName] || columnName;
}

export function makeHumanReadableValues(columnName: keyof typeof columnNameMap, value: unknown) {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  if (['adm_dtm', 'dsch_dtm'].includes(columnName)) {
    const date = new Date(value as number);
    return Number.isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
  }
  if (['death', 'vent', 'stroke', 'ecmo', 'b12', 'iron', 'antifibrinolytic'].includes(columnName)) {
    return (value === 1 || value === true) ? 'Yes' : 'No';
  }
  if (
    (columnName === 'apr_drg_weight' || columnName === 'ms_drg_weight')
    && typeof value === 'number'
  ) {
    return value.toFixed(3);
  }
  if (columnName === 'departments') {
    return (value as string).replace(/["[\]]/g, '').replace(/,\s*/g, ', ');
  }
  return `${value}`;
}

// Helper to get readable names
export const getReadableName = (key: string): string => {
  // Handle date fields specifically
  if (key === 'dateFrom') return 'Date From';
  if (key === 'dateTo') return 'Date To';

  // Check Time Aggregations
  const timeAgg = TIME_AGGREGATION_OPTIONS[key as keyof typeof TIME_AGGREGATION_OPTIONS];
  if (timeAgg) return timeAgg.label;

  // Search in all attributes that have a 'value' and 'label.base' or 'label'
  const attributes = [
    BLOOD_COMPONENTS,
    OUTCOMES,
    PROPHYL_MEDS,
    Object.values(GUIDELINE_ADHERENT),
    LAB_RESULTS,
    Object.values(COSTS),
  ];

  interface AttributeItem {
    value: string;
    label: string | { base: string };
  }

  let result: string | undefined;
  attributes.forEach((attribute) => {
    const found = (attribute as unknown as AttributeItem[]).find((c) => c.value === key);
    if (found && !result) {
      // @ts-expect-error - label might be string or object
      result = found.label.base || found.label;
    }
  });

  if (result) return result;

  // Check the column map from humanReadableColsVals
  if (columnNameMap[key]) return columnNameMap[key];

  // Fallback to formatting the key
  return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

// Helper to format values
export const formatValue = (
  value:
    | string
    | number
    | boolean
    | Date
    | (number | string)[]
    | null
    | undefined,
): string => {
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    if (value.length === 2 && typeof value[0] === 'number') {
      return `${value[0]} - ${value[1]}`;
    }
    return value.join(', ');
  }
  if (value === null || value === undefined) {
    return 'None';
  }
  return String(value);
};
