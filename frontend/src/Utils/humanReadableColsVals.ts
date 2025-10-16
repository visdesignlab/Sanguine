const columnNameMap: Record<string, string> = {
  adm_dtm: 'Admission Date',
  age_at_adm: 'Age at Admission',
  antifibrinolytic: 'Antifibrinolytic',
  apr_drg_weight: 'APR DRG Weight',
  b12: 'B12',
  cell_saver_cost: 'Cell Saver Cost',
  cell_saver_ml: 'Cell Saver (mL)',
  cryo_adherence: 'Adherent Cryo Transfusions (%)',
  cryo_adherent_count: '# Adherent Cryo Transfusions',
  cryo_transfusions_count: '# Cryo Transfusions',
  cryo_units: '# Cryo Units Transfused',
  cryo_units_cost: 'Cryo Units Cost',
  death: 'Death',
  departments: 'Departments',
  dsch_dtm: 'Discharge Date',
  ecmo: 'ECMO',
  ffp_adherence: 'Adherent FFP Transfusions (%)',
  ffp_adherent_count: '# Adherent FFP Transfusions',
  ffp_transfusions_count: '# FFP Transfusions',
  ffp_units: '# FFP Units Transfused',
  ffp_units_cost: 'FFP Units Cost',
  iron: 'Iron',
  los: 'Length of Stay',
  month: 'Month',
  mrn: 'MRN',
  ms_drg_weight: 'MS DRG Weight',
  overall_adherence: 'Adherent Transfusions (%)',
  overall_adherent_count: '# Adherent Transfusions',
  overall_transfusions_count: '# Total Transfusions',
  overall_units: '# Units Transfused',
  pat_class_desc: 'Patient Class Description',
  plt_adherence: 'Adherent Platelet Transfusions (%)',
  plt_adherent_count: '# Adherent Platelet Transfusions',
  plt_transfusions_count: '# Platelet Transfusions',
  plt_units: '# Platelet Units Transfused',
  plt_units_cost: 'Platelet Units Cost',
  quarter: 'Quarter',
  rbc_adherence: 'Adherent RBC Transfusions (%)',
  rbc_adherent_count: '# Adherent RBC Transfusions',
  rbc_transfusions_count: '# RBC Transfusions',
  rbc_units: '# RBC Units Transfused',
  rbc_units_cost: 'RBC Units Cost',
  stroke: 'Stroke',
  vent: 'Ventilator',
  visit_no: 'Visit Number',
  whole_units: '# Whole Blood Units',
  year: 'Year',
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
