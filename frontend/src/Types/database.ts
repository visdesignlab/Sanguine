export type SurgeryUrgencyType = 'Urgent' | 'Elective' | 'Emergent' | 'Unknown';

export interface TransfusionEvent {
  visit_no: string; // ForeignKey to Visit, use string to match Visit.visit_no
  trnsfsn_dtm: string; // ISO datetime string
  transfusion_rank: number;
  blood_unit_number: string;
  rbc_units: number | null;
  ffp_units: number | null;
  plt_units: number | null;
  cryo_units: number | null;
  whole_units: number | null;
  rbc_vol: number | null;
  ffp_vol: number | null;
  plt_vol: number | null;
  cryo_vol: number | null;
  whole_vol: number | null;
  cell_saver_ml: number | null;
}
export interface Surgery {
  case_id: string; // BigIntegerField, primary key
  visit_no: string; // ForeignKey to Visit, use string to match Visit.visit_no
  mrn: string; // ForeignKey to Patient, use string to match Patient.mrn
  case_date: number; // timestamp
  surgery_start_dtm: string; // ISO datetime string
  surgery_end_dtm: string; // ISO datetime string
  surgery_elap: number;
  surgery_type_desc: SurgeryUrgencyType;
  surgeon_prov_id: string;
  surgeon_prov_name: string;
  anesth_prov_id: string;
  anesth_prov_name: string;
  prim_proc_desc: string;
  postop_icu_los: number | null;
  sched_site_desc: string;
  asa_code: string;
  year: number;
  quarter: string;

  transfusions: TransfusionEvent[];
}
export interface Lab {
  visit_no: string; // ForeignKey to Visit, use string to match Visit.visit_no
  mrn: string; // ForeignKey to Patient, use string to match Patient.mrn
  lab_id: string;
  lab_draw_dtm: string; // ISO datetime string
  lab_panel_code: string;
  lab_panel_desc: string;
  result_dtm: string; // ISO datetime string
  result_code: string;
  result_loinc: string;
  result_desc: string;
  result_value: string;
  uom_code: string;
  lower_limit: number;
  upper_limit: number;
}
export interface Medication {
  visit_no: string; // ForeignKey to Visit, use string to match Visit.visit_no
  order_med_id: string; // Decimal as string
  order_dtm: string; // ISO datetime string
  medication_id: string; // Decimal as string
  medication_name: string;
  med_admin_line: string; // Decimal as string
  admin_dtm: string; // ISO datetime string
  admin_dose: string;
  med_form: string;
  admin_route_desc: string;
  dose_unit_desc: string;
  med_start_dtm: string; // ISO datetime string
  med_end_dtm: string; // ISO datetime string
}
export interface BillingCode {
  visit_no: string; // ForeignKey to Visit, use string to match Visit.visit_no
  cpt_code: string;
  cpt_code_desc: string;
  proc_dtm: string; // ISO datetime string
  prov_id: string;
  prov_name: string;
  code_rank: number;
}
export type Patient = {
  mrn: string;
  last_name: string;
  first_name: string;
  birth_date: string; // ISO date string
  sex_code: string;
  race_desc: string;
  ethnicity_desc: string;
  death_date: string | null;
};
export interface Visit {
  visit_no: string; // BigIntegerField, primary key
  mrn: string; // ForeignKey to Patient, use string to match Patient.mrn
  epic_pat_id: string;
  hsp_account_id: string;
  adm_dtm: string; // ISO date string
  dsch_dtm: string; // ISO date string
  clinical_los: number | null;
  age_at_adm: number;
  pat_class_desc: string;
  pat_type_desc: string;
  pat_expired_f: string | null;
  invasive_vent_f: string | null;
  total_vent_mins: number;
  total_vent_days: number;
  apr_drg_code: string;
  apr_drg_rom: string | null;
  apr_drg_soi: string | null;
  apr_drg_desc: string;
  apr_drg_weight: number;
  ms_drg_weight: number;
  cci_mi: number | null;
  cci_chf: number | null;
  cci_pvd: number | null;
  cci_cvd: number | null;
  cci_dementia: number | null;
  cci_copd: number | null;
  cci_rheum_dz: number | null;
  cci_pud: number | null;
  cci_liver_dz_mild: number | null;
  cci_dm_wo_compl: number | null;
  cci_dm_w_compl: number | null;
  cci_paraplegia: number | null;
  cci_renal_dz: number | null;
  cci_malign_wo_mets: number | null;
  cci_liver_dz_severe: number | null;
  cci_malign_w_mets: number | null;
  cci_hiv_aids: number | null;
  cci_score: number | null;

  patient: Patient;
  transfusions: TransfusionEvent[];
  surgeries: Surgery[];
  labs: Lab[];
  meds: Medication[];
  billing_codes: BillingCode[];
}
