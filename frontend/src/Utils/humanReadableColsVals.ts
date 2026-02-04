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

/**
 * Format a state detail name to be human-readable
 * @param key The key to format (e.g. "dateFrom")
 * @returns The formatted key (e.g. "Date From")
 */
export const formatStateDetailName = (key: string): string => {
  // Handle date fields
  const dateFields: Record<string, string> = {
    dateFrom: 'Date From',
    dateTo: 'Date To',
  };

  if (dateFields[key]) return dateFields[key];

  // Check Time Aggregations
  const timeAgg = TIME_AGGREGATION_OPTIONS[key as keyof typeof TIME_AGGREGATION_OPTIONS];

  if (timeAgg) {
    return timeAgg.label;
  }

  // Search for the label in the attributes
  const attributes = [
    BLOOD_COMPONENTS,
    OUTCOMES,
    PROPHYL_MEDS,
    Object.values(GUIDELINE_ADHERENT),
    LAB_RESULTS,
    Object.values(COSTS),
  ].flat();
  const found = attributes.find((c) => c.value === key);
  if (found) {
    return found.label?.base || found.label;
  }

  // Check the column map
  if (columnNameMap[key]) {
    return columnNameMap[key];
  }

  // Fallback to formatting the key
  return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Format a state detail value to be human-readable
 * @param value The value to format (e.g. [1,2])
 * @param key Optional key to help with formatting (e.g. "dateFrom")
 * @returns The formatted value (e.g. "1 - 2")
 */
export const formatStateDetailValue = (value: unknown, key?: string): string => {
  // Handle date strings based on key
  if ((key === 'dateFrom' || key === 'dateTo') && typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }
  }

  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  // Handle arrays (e.g., [1, 2] -> "1 - 2")
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
