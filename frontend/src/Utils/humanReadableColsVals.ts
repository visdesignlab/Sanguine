const columnNameMap: Record<string, string> = {
  adm_dtm: 'Admission Date',
  age_at_adm: 'Age at Admission',
  antifibrinolytic: 'Antifibrinolytic',
  apr_drg_weight: 'APR DRG Weight',
  ms_drg_weight: 'MS DRG Weight',
  b12: 'B12',
  cell_saver_cost: 'Cell Saver Cost',
  cell_saver_ml: 'Cell Saver (mL)',
  cryo_adherent_count: '# Adherent Cryo Transfusions',
  cryo_transfusions_count: '# Cryo Transfusions',
  cryo_adherence: 'Adherent Cryo Transfusions (%)',
  cryo_units: '# Cryo Units',
  cryo_units_cost: 'Cryo Units Cost',
  death: 'Death',
  dsch_dtm: 'Discharge Date',
  ecmo: 'ECMO',
  ffp_adherent_count: '# Adherent FFP Transfusions',
  ffp_transfusions_count: '# FFP Transfusions',
  ffp_units: '# FFP Transfusions',
  ffp_units_cost: 'FFP Transfusions Cost',
  ffp_adherence: 'Adherent FFP Transfusions (%)',
  iron: 'Iron',
  los: 'Length of Stay',
  month: 'Month',
  mrn: 'MRN',
  overall_adherent_count: '# Adherent Transfusions',
  overall_transfusions_count: '# Transfusions',
  overall_units: '# Transfusions',
  overall_adherence: 'Adherent Transfusions (%)',
  pat_class_desc: 'Patient Class Description',
  plt_adherent_count: '# Adherent Platelet Transfusions',
  plt_transfusions_count: '# Platelet Transfusions',
  plt_units: '# Platelet Transfusions',
  plt_units_cost: 'Platelet Transfusions Cost',
  plt_adherence: 'Adherent Platelet Transfusions (%)',
  quarter: 'Quarter',
  rbc_adherent_count: '# Adherent RBC Transfusions',
  rbc_transfusions_count: '# RBC Transfusions',
  rbc_units: '# RBC Transfusions',
  rbc_units_cost: 'RBC Transfusions Cost',
  rbc_adherence: 'Adherent RBC Transfusions (%)',
  stroke: 'Stroke',
  vent: 'Ventilator',
  visit_no: 'Visit Number',
  whole_units: '# Whole Blood Transfusions',
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
    ['rbc_adherence', 'ffp_adherence', 'plt_adherence', 'cryo_adherence'].includes(columnName)
    && (value === null || value === undefined)
  ) {
    return 'N/A';
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
