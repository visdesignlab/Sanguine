TRUNCATE TABLE VisitAttributes;

INSERT INTO VisitAttributes (
    id,
    visit_no,
    mrn,
    adm_dtm,
    dsch_dtm,
    age_at_adm,
    pat_class_desc,
    apr_drg_weight,
    ms_drg_weight,
    month,
    quarter,
    year,
    rbc_units,
    ffp_units,
    plt_units,
    cryo_units,
    whole_units,
    cell_saver_ml,
    los,
    death,
    vent,
    stroke,
    ecmo,
    b12,
    iron,
    antifibrinolytic,
    rbc_units_adherent,
    ffp_units_adherent,
    plt_units_adherent,
    cryo_units_adherent,
    attending_provider,
    attending_provider_id,
    attending_provider_line,
    is_admitting_attending
)
SELECT
    CONCAT(v.visit_no, '-', ap.attend_prov_line) AS id,
    v.visit_no,
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

    COALESCE(pt.sum_rbc_units, 0),
    COALESCE(pt.sum_ffp_units, 0),
    COALESCE(pt.sum_plt_units, 0),
    COALESCE(pt.sum_cryo_units, 0),
    COALESCE(pt.sum_whole_units, 0),
    COALESCE(pt.sum_cell_saver_ml, 0),

    CASE WHEN ap.attend_prov_line = 1 THEN v.clinical_los ELSE NULL END AS los,
    CASE WHEN ap.attend_prov_line = 1 THEN (CASE WHEN v.pat_expired_f = 'Y' THEN TRUE ELSE FALSE END) ELSE NULL END AS death,
    CASE WHEN ap.attend_prov_line = 1 THEN (CASE WHEN v.total_vent_mins > 1440 THEN TRUE ELSE FALSE END) ELSE NULL END AS vent,
    CASE WHEN ap.attend_prov_line = 1 THEN (CASE WHEN bc_outcomes.stroke = 1 THEN TRUE ELSE FALSE END) ELSE NULL END AS stroke,
    CASE WHEN ap.attend_prov_line = 1 THEN (CASE WHEN bc_outcomes.ecmo = 1 THEN TRUE ELSE FALSE END) ELSE NULL END AS ecmo,

    CASE WHEN pm.has_b12 = 1 THEN TRUE ELSE FALSE END AS b12,
    CASE WHEN pm.has_iron = 1 THEN TRUE ELSE FALSE END AS iron,
    CASE WHEN pm.has_antifibrinolytic = 1 THEN TRUE ELSE FALSE END AS antifibrinolytic,

    COALESCE(ga.rbc_units_adherent, 0) AS rbc_units_adherent,
    COALESCE(ga.ffp_units_adherent, 0) AS ffp_units_adherent,
    COALESCE(ga.plt_units_adherent, 0) AS plt_units_adherent,
    COALESCE(ga.cryo_units_adherent, 0) AS cryo_units_adherent,

    ap.prov_name,
    ap.prov_id,
    ap.attend_prov_line,
    CASE WHEN ap.attend_prov_line = 1 THEN TRUE ELSE FALSE END AS is_admitting_attending

FROM (
    SELECT DISTINCT
        ap_non_null.visit_no,
        ap_non_null.prov_id,
        ap_non_null.prov_name,
        ap_non_null.attend_prov_line
    FROM AttendingProvider ap_non_null
    WHERE ap_non_null.attend_prov_line IS NOT NULL

    UNION ALL

    SELECT
        ap_null.visit_no,
        NULL AS prov_id,
        NULL AS prov_name,
        0 AS attend_prov_line
    FROM AttendingProvider ap_null
    WHERE ap_null.attend_prov_line IS NULL
    GROUP BY ap_null.visit_no
) ap
JOIN Visit v ON ap.visit_no = v.visit_no

LEFT JOIN (
    SELECT
        visit_no,
        MAX(CASE WHEN cpt_code IN ('99291', '1065F', '1066F') THEN 1 ELSE 0 END) AS stroke,
        MAX(CASE WHEN cpt_code IN ('33946', '33947', '33948', '33949', '33952', '33953', '33954', '33955', '33956', '33957', '33958', '33959', '33960', '33961', '33962', '33963', '33964', '33965', '33966', '33969', '33984', '33985', '33986', '33987', '33988', '33989') THEN 1 ELSE 0 END) AS ecmo
    FROM BillingCode
    GROUP BY visit_no
) bc_outcomes ON bc_outcomes.visit_no = v.visit_no

LEFT JOIN (
    SELECT
        ranked.visit_no,
        ranked.prov_id,
        ranked.attend_prov_line,
        SUM(ranked.rbc_units) AS sum_rbc_units,
        SUM(ranked.ffp_units) AS sum_ffp_units,
        SUM(ranked.plt_units) AS sum_plt_units,
        SUM(ranked.cryo_units) AS sum_cryo_units,
        SUM(ranked.whole_units) AS sum_whole_units,
        SUM(ranked.cell_saver_ml) AS sum_cell_saver_ml
    FROM (
        SELECT
            ap_int.visit_no,
            CASE
                WHEN ap_int.attend_prov_line IS NULL THEN NULL
                ELSE ap_int.prov_id
            END AS prov_id,
            COALESCE(ap_int.attend_prov_line, 0) AS attend_prov_line,
            t.rbc_units,
            t.ffp_units,
            t.plt_units,
            t.cryo_units,
            t.whole_units,
            t.cell_saver_ml,
            ROW_NUMBER() OVER (
                PARTITION BY t.id
                ORDER BY
                    COALESCE(ap_int.attend_prov_line, 9999) ASC,
                    ap_int.attend_start_dtm ASC,
                    COALESCE(ap_int.prov_id, '') ASC
            ) AS rn
        FROM AttendingProvider ap_int
        JOIN Transfusion t ON ap_int.visit_no = t.visit_no
            AND t.trnsfsn_dtm BETWEEN ap_int.attend_start_dtm AND ap_int.attend_end_dtm
    ) ranked
    WHERE ranked.rn = 1
    GROUP BY ranked.visit_no, ranked.attend_prov_line, ranked.prov_id
) pt ON ap.visit_no = pt.visit_no AND ap.attend_prov_line = pt.attend_prov_line

LEFT JOIN GuidelineAdherence ga
    ON ap.visit_no = ga.visit_no AND ap.attend_prov_line = ga.attend_prov_line

LEFT JOIN (
    SELECT
        ranked_med.visit_no,
        ranked_med.prov_id,
        ranked_med.attend_prov_line,
        MAX(CASE WHEN UPPER(ranked_med.medication_name) REGEXP 'B12|COBALAMIN' THEN 1 ELSE 0 END) AS has_b12,
        MAX(CASE WHEN UPPER(ranked_med.medication_name) REGEXP 'IRON|FERROUS|FERRIC' THEN 1 ELSE 0 END) AS has_iron,
        MAX(CASE WHEN UPPER(ranked_med.medication_name) REGEXP 'TRANEXAMIC|AMICAR' THEN 1 ELSE 0 END) AS has_antifibrinolytic
    FROM (
        SELECT
            ap_int.visit_no,
            CASE
                WHEN ap_int.attend_prov_line IS NULL THEN NULL
                ELSE ap_int.prov_id
            END AS prov_id,
            COALESCE(ap_int.attend_prov_line, 0) AS attend_prov_line,
            m.medication_name,
            ROW_NUMBER() OVER (
                PARTITION BY m.id
                ORDER BY
                    COALESCE(ap_int.attend_prov_line, 9999) ASC,
                    ap_int.attend_start_dtm ASC,
                    COALESCE(ap_int.prov_id, '') ASC
            ) AS rn
        FROM AttendingProvider ap_int
        JOIN Medication m ON ap_int.visit_no = m.visit_no
            AND m.admin_dtm BETWEEN ap_int.attend_start_dtm AND ap_int.attend_end_dtm
    ) ranked_med
    WHERE ranked_med.rn = 1
    GROUP BY ranked_med.visit_no, ranked_med.attend_prov_line, ranked_med.prov_id
) pm ON ap.visit_no = pm.visit_no AND ap.attend_prov_line = pm.attend_prov_line;
