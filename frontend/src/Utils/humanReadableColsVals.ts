const columnNameMap: Record<string, string> = {
  adm_dtm: 'Admission Date',
  age_at_adm: 'Age at Admission',
  antifibrinolytic: 'Antifibrinolytic',
  apr_drg_weight: 'APR DRG Weight',
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
  return `${value}`;
}
