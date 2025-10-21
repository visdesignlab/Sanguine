select 
  apt.visit_no,
  v.mrn,
  v.adm_dtm,
  v.dsch_dtm,
  v.age_at_adm,
  v.pat_class_desc,
  v.apr_drg_weight,
  v.ms_drg_weight,
  DATE_FORMAT(v.dsch_dtm, '%Y-%b') AS month,
  CONCAT(YEAR(v.dsch_dtm), '-Q', QUARTER(v.dsch_dtm)) AS quarter,
  YEAR(v.dsch_dtm) AS year,
  COALESCE(apt.sum_rbc_units, 0) AS rbc_units,
  COALESCE(apt.sum_ffp_units, 0) AS ffp_units,
  COALESCE(apt.sum_plt_units, 0) AS plt_units,
  COALESCE(apt.sum_cryo_units, 0) AS cryo_units,
  COALESCE(apt.sum_whole_units, 0) AS whole_units,
  COALESCE(apt.sum_cell_saver_ml, 0) AS cell_saver_ml,
  v.clinical_los AS los,
  CASE WHEN v.pat_expired_f = 'Y' THEN TRUE ELSE FALSE END AS death,
  CASE WHEN v.total_vent_mins > 1440 THEN TRUE ELSE FALSE END AS vent,

  apt.attending_prov_line,
  apt.prov_name AS attending_provider,
  apt.prov_id AS attending_provider_id
FROM (
  select 
      ap.visit_no as visit_no,
      ap.prov_id as prov_id,
      ap.prov_name as prov_name,
      ap.attend_prov_line as attending_prov_line,
      SUM(rbc_units) AS sum_rbc_units,
      SUM(ffp_units) AS sum_ffp_units,
      SUM(plt_units) AS sum_plt_units,
      SUM(cryo_units) AS sum_cryo_units,
      SUM(whole_units) AS sum_whole_units,
      SUM(cell_saver_ml) AS sum_cell_saver_ml
  from AttendingProvider ap
  left join Transfusion t on ap.visit_no = t.visit_no and t.trnsfsn_dtm between ap.attend_start_dtm and ap.attend_end_dtm
  group by ap.visit_no, ap.prov_id, ap.prov_name, ap.attend_prov_line
) as apt
left join Visit v on apt.visit_no = v.visit_no and apt.attending_prov_line = 0

limit 10;