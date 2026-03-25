TRUNCATE TABLE SurgeryCaseAttributes;

INSERT INTO SurgeryCaseAttributes (
    case_id,
    visit_no,
    mrn,
    surgeon_prov_id,
    surgeon_prov_name,
    anesth_prov_id,
    anesth_prov_name,
    surgery_start_dtm,
    surgery_end_dtm,
    case_date,
    month,
    quarter,
    year,
    pre_hgb,
    pre_plt,
    pre_fibrinogen,
    pre_inr,
    post_hgb,
    post_plt,
    post_fibrinogen,
    post_inr,
    intraop_rbc_units,
    intraop_ffp_units,
    intraop_plt_units,
    intraop_cryo_units,
    intraop_whole_units,
    intraop_cell_saver_ml,
    los,
    death,
    vent,
    stroke,
    ecmo,
    rbc_cost,
    ffp_cost,
    plt_cost,
    cryo_cost,
    whole_cost,
    cell_saver_cost,
    total_cost
)
SELECT
    sc.case_id,
    sc.visit_no,
    sc.mrn,
    sc.surgeon_prov_id,
    sc.surgeon_prov_name,
    sc.anesth_prov_id,
    sc.anesth_prov_name,
    sc.surgery_start_dtm,
    sc.surgery_end_dtm,
    sc.case_date,
    DATE_FORMAT(sc.case_date, '%Y-%b') AS month,
    CONCAT(YEAR(sc.case_date), '-Q', QUARTER(sc.case_date)) AS quarter,
    YEAR(sc.case_date) AS year,
    (
        SELECT CAST(TRIM(l.result_value) AS DECIMAL(10, 4)) FROM Lab l
        WHERE l.visit_no = sc.visit_no
          AND l.lab_draw_dtm < sc.surgery_start_dtm
          AND TRIM(l.result_value) REGEXP '^-?[0-9]+(\\.[0-9]+)?$'
          AND UPPER(l.result_desc) IN ('HGB', 'HEMOGLOBIN')
        ORDER BY l.lab_draw_dtm DESC LIMIT 1
    ) AS pre_hgb,
    (
        SELECT CAST(TRIM(l.result_value) AS DECIMAL(10, 4)) FROM Lab l
        WHERE l.visit_no = sc.visit_no
          AND l.lab_draw_dtm < sc.surgery_start_dtm
          AND TRIM(l.result_value) REGEXP '^-?[0-9]+(\\.[0-9]+)?$'
          AND UPPER(l.result_desc) IN ('PLT', 'PLATELET COUNT')
        ORDER BY l.lab_draw_dtm DESC LIMIT 1
    ) AS pre_plt,
    (
        SELECT CAST(TRIM(l.result_value) AS DECIMAL(10, 4)) FROM Lab l
        WHERE l.visit_no = sc.visit_no
          AND l.lab_draw_dtm < sc.surgery_start_dtm
          AND TRIM(l.result_value) REGEXP '^-?[0-9]+(\\.[0-9]+)?$'
          AND UPPER(l.result_desc) = 'FIBRINOGEN'
        ORDER BY l.lab_draw_dtm DESC LIMIT 1
    ) AS pre_fibrinogen,
    (
        SELECT CAST(TRIM(l.result_value) AS DECIMAL(10, 4)) FROM Lab l
        WHERE l.visit_no = sc.visit_no
          AND l.lab_draw_dtm < sc.surgery_start_dtm
          AND TRIM(l.result_value) REGEXP '^-?[0-9]+(\\.[0-9]+)?$'
          AND UPPER(l.result_desc) = 'INR'
        ORDER BY l.lab_draw_dtm DESC LIMIT 1
    ) AS pre_inr,
    (
        SELECT CAST(TRIM(l.result_value) AS DECIMAL(10, 4)) FROM Lab l
        WHERE l.visit_no = sc.visit_no
          AND l.lab_draw_dtm > sc.surgery_end_dtm
          AND TRIM(l.result_value) REGEXP '^-?[0-9]+(\\.[0-9]+)?$'
          AND UPPER(l.result_desc) IN ('HGB', 'HEMOGLOBIN')
        ORDER BY l.lab_draw_dtm ASC LIMIT 1
    ) AS post_hgb,
    (
        SELECT CAST(TRIM(l.result_value) AS DECIMAL(10, 4)) FROM Lab l
        WHERE l.visit_no = sc.visit_no
          AND l.lab_draw_dtm > sc.surgery_end_dtm
          AND TRIM(l.result_value) REGEXP '^-?[0-9]+(\\.[0-9]+)?$'
          AND UPPER(l.result_desc) IN ('PLT', 'PLATELET COUNT')
        ORDER BY l.lab_draw_dtm ASC LIMIT 1
    ) AS post_plt,
    (
        SELECT CAST(TRIM(l.result_value) AS DECIMAL(10, 4)) FROM Lab l
        WHERE l.visit_no = sc.visit_no
          AND l.lab_draw_dtm > sc.surgery_end_dtm
          AND TRIM(l.result_value) REGEXP '^-?[0-9]+(\\.[0-9]+)?$'
          AND UPPER(l.result_desc) = 'FIBRINOGEN'
        ORDER BY l.lab_draw_dtm ASC LIMIT 1
    ) AS post_fibrinogen,
    (
        SELECT CAST(TRIM(l.result_value) AS DECIMAL(10, 4)) FROM Lab l
        WHERE l.visit_no = sc.visit_no
          AND l.lab_draw_dtm > sc.surgery_end_dtm
          AND TRIM(l.result_value) REGEXP '^-?[0-9]+(\\.[0-9]+)?$'
          AND UPPER(l.result_desc) = 'INR'
        ORDER BY l.lab_draw_dtm ASC LIMIT 1
    ) AS post_inr,
    COALESCE(intra.sum_rbc, 0) AS intraop_rbc_units,
    COALESCE(intra.sum_ffp, 0) AS intraop_ffp_units,
    COALESCE(intra.sum_plt, 0) AS intraop_plt_units,
    COALESCE(intra.sum_cryo, 0) AS intraop_cryo_units,
    COALESCE(intra.sum_whole, 0) AS intraop_whole_units,
    COALESCE(intra.sum_cs, 0) AS intraop_cell_saver_ml,
    v.clinical_los AS los,
    (CASE WHEN v.pat_expired_f = 'Y' THEN TRUE ELSE FALSE END) AS death,
    (CASE WHEN v.total_vent_mins > 1440 THEN TRUE ELSE FALSE END) AS vent,
    (CASE WHEN bc.stroke = 1 THEN TRUE ELSE FALSE END) AS stroke,
    (CASE WHEN bc.ecmo = 1 THEN TRUE ELSE FALSE END) AS ecmo,
    (COALESCE(intra.sum_rbc, 0) * 200.00) AS rbc_cost,
    (COALESCE(intra.sum_ffp, 0) * 50.00) AS ffp_cost,
    (COALESCE(intra.sum_plt, 0) * 500.00) AS plt_cost,
    (COALESCE(intra.sum_cryo, 0) * 30.00) AS cryo_cost,
    (COALESCE(intra.sum_whole, 0) * 300.00) AS whole_cost,
    (CASE WHEN COALESCE(intra.sum_cs, 0) > 0 THEN 225.00 ELSE 0.00 END) AS cell_saver_cost,
    ((COALESCE(intra.sum_rbc, 0) * 200.00) +
     (COALESCE(intra.sum_ffp, 0) * 50.00) +
     (COALESCE(intra.sum_plt, 0) * 500.00) +
     (COALESCE(intra.sum_cryo, 0) * 30.00) +
     (COALESCE(intra.sum_whole, 0) * 300.00) +
     (CASE WHEN COALESCE(intra.sum_cs, 0) > 0 THEN 225.00 ELSE 0.00 END)) AS total_cost
FROM SurgeryCase sc
JOIN Visit v ON sc.visit_no = v.visit_no
LEFT JOIN (
    SELECT
        sc.case_id AS case_id_ref,
        SUM(rbc_units) AS sum_rbc,
        SUM(ffp_units) AS sum_ffp,
        SUM(plt_units) AS sum_plt,
        SUM(cryo_units) AS sum_cryo,
        SUM(whole_units) AS sum_whole,
        SUM(cell_saver_ml) AS sum_cs
    FROM Transfusion t
    JOIN SurgeryCase sc ON t.visit_no = sc.visit_no
        AND t.trnsfsn_dtm BETWEEN sc.surgery_start_dtm AND sc.surgery_end_dtm
    GROUP BY sc.case_id
) intra ON intra.case_id_ref = sc.case_id
LEFT JOIN (
    SELECT
        visit_no,
        MAX(CASE WHEN cpt_code IN ('99291', '1065F', '1066F') THEN 1 ELSE 0 END) AS stroke,
        MAX(CASE WHEN cpt_code IN ('33946', '33947', '33948', '33949', '33952', '33953', '33954', '33955', '33956', '33957', '33958', '33959', '33960', '33961', '33962', '33963', '33964', '33965', '33966', '33969', '33984', '33985', '33986', '33987', '33988', '33989') THEN 1 ELSE 0 END) AS ecmo
    FROM BillingCode
    GROUP BY visit_no
) bc ON bc.visit_no = v.visit_no;
