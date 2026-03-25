TRUNCATE TABLE GuidelineAdherence;

INSERT INTO GuidelineAdherence (
    visit_no,
    prov_id,
    attend_prov_line,
    rbc_units_adherent,
    ffp_units_adherent,
    plt_units_adherent,
    cryo_units_adherent
)
WITH RankedTransfusions AS (
    SELECT
        t.id AS transfusion_id,
        t.visit_no,
        t.trnsfsn_dtm,
        t.rbc_units,
        t.ffp_units,
        t.plt_units,
        t.cryo_units,
        CASE
            WHEN ap_int.attend_prov_line IS NULL THEN NULL
            ELSE ap_int.prov_id
        END AS prov_id,
        COALESCE(ap_int.attend_prov_line, 0) AS attend_prov_line,
        ROW_NUMBER() OVER (
            PARTITION BY t.id
            ORDER BY
                COALESCE(ap_int.attend_prov_line, 9999) ASC,
                ap_int.attend_start_dtm ASC,
                COALESCE(ap_int.prov_id, '') ASC
        ) AS rn
    FROM Transfusion t
    JOIN AttendingProvider ap_int
      ON ap_int.visit_no = t.visit_no
     AND t.trnsfsn_dtm BETWEEN ap_int.attend_start_dtm AND ap_int.attend_end_dtm
),
UniqueProviderTransfusions AS (
    SELECT * FROM RankedTransfusions WHERE rn = 1
),
VisitContext AS (
    SELECT
        v.visit_no, v.cci_chf, v.cci_cvd, v.cci_mi,
        MAX(CASE WHEN bc.cpt_code BETWEEN '59000' AND '59899' THEN 1 ELSE 0 END) AS is_ob,
        MAX(CASE WHEN (bc.cpt_code BETWEEN '10000' AND '69999') AND (UPPER(bc.cpt_code_desc) REGEXP 'BLEEDING|HEMORRHAGE|HEMRRG') THEN 1 ELSE 0 END) AS flag_bleeding,
        MAX(CASE WHEN bc.cpt_code IN ('62270', '62272') THEN 1 ELSE 0 END) AS flag_lp,
        MAX(CASE WHEN (bc.cpt_code BETWEEN '61000' AND '63999') THEN 1 ELSE 0 END) AS flag_neuro_critical,
        MAX(CASE WHEN (bc.cpt_code REGEXP '^33') THEN 1 ELSE 0 END) AS flag_cardiac_surg,
        MAX(CASE WHEN (bc.cpt_code BETWEEN '92920' AND '92944') THEN 1 ELSE 0 END) AS flag_pci_indicated,
        MAX(CASE WHEN bc.cpt_code IN ('36555', '36556', '36568', '36569', '36580', '36584') THEN 1 ELSE 0 END) AS flag_cvc,
        MAX(CASE WHEN bc.cpt_code BETWEEN '62263' AND '62329' THEN 1 ELSE 0 END) AS flag_neuraxial
    FROM Visit v
    JOIN (SELECT DISTINCT visit_no FROM UniqueProviderTransfusions) u ON u.visit_no = v.visit_no
    LEFT JOIN BillingCode bc ON v.visit_no = bc.visit_no
    GROUP BY v.visit_no, v.cci_chf, v.cci_cvd, v.cci_mi
),
RecentTransfusions AS (
    SELECT
        t1.transfusion_id,
        COALESCE(SUM(t2.rbc_units), 0) AS rbc_4h,
        COALESCE(SUM(t2.ffp_units), 0) AS ffp_4h
    FROM UniqueProviderTransfusions t1
    JOIN Transfusion t2
        ON t1.visit_no = t2.visit_no
       AND t2.trnsfsn_dtm BETWEEN t1.trnsfsn_dtm - INTERVAL 2 HOUR AND t1.trnsfsn_dtm + INTERVAL 2 HOUR
    GROUP BY t1.transfusion_id
),
RecentSurgeries AS (
    SELECT
        t.transfusion_id,
        MAX(CASE WHEN sc.surgery_end_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 24 HOUR AND t.trnsfsn_dtm + INTERVAL 24 HOUR THEN 1 ELSE 0 END) AS has_surg_24h,
        MAX(CASE WHEN sc.surgery_end_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 6 HOUR AND t.trnsfsn_dtm + INTERVAL 6 HOUR THEN 1 ELSE 0 END) AS has_surg_6h
    FROM UniqueProviderTransfusions t
    JOIN SurgeryCase sc ON t.visit_no = sc.visit_no
    WHERE sc.surgery_end_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 24 HOUR AND t.trnsfsn_dtm + INTERVAL 24 HOUR
    GROUP BY t.transfusion_id
),
TransfusionLabs AS (
    SELECT
        t.transfusion_id,
        CAST(TRIM(l.result_value) AS DECIMAL(20, 4)) AS numeric_result_value,
        CASE
            WHEN UPPER(l.result_desc) IN ('HGB', 'HEMOGLOBIN') THEN 'HGB'
            WHEN UPPER(l.result_desc) = 'INR' THEN 'INR'
            WHEN UPPER(l.result_desc) IN ('PLT', 'PLATELET COUNT') THEN 'PLT'
            WHEN UPPER(l.result_desc) REGEXP 'FIBRINOGEN' THEN 'FIB'
        END AS lab_group,
        ROW_NUMBER() OVER (
            PARTITION BY
                t.transfusion_id,
                CASE
                    WHEN UPPER(l.result_desc) IN ('HGB', 'HEMOGLOBIN') THEN 'HGB'
                    WHEN UPPER(l.result_desc) = 'INR' THEN 'INR'
                    WHEN UPPER(l.result_desc) IN ('PLT', 'PLATELET COUNT') THEN 'PLT'
                    WHEN UPPER(l.result_desc) REGEXP 'FIBRINOGEN' THEN 'FIB'
                END
            ORDER BY ABS(TIMESTAMPDIFF(SECOND, l.lab_draw_dtm, t.trnsfsn_dtm)) ASC
        ) AS rn_lab
    FROM UniqueProviderTransfusions t
    JOIN Lab l ON t.visit_no = l.visit_no
    WHERE l.lab_draw_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 24 HOUR AND t.trnsfsn_dtm
      AND TRIM(l.result_value) REGEXP '^-?[0-9]+(\\.[0-9]+)?$'
      AND (
          UPPER(l.result_desc) IN ('HGB', 'HEMOGLOBIN', 'INR', 'PLT', 'PLATELET COUNT')
          OR UPPER(l.result_desc) REGEXP 'FIBRINOGEN'
      )
),
ClosestLabs AS (
    SELECT
        transfusion_id,
        MAX(CASE WHEN lab_group = 'HGB' THEN numeric_result_value END) AS hgb_val,
        MAX(CASE WHEN lab_group = 'INR' THEN numeric_result_value END) AS inr_val,
        MAX(CASE WHEN lab_group = 'PLT' THEN numeric_result_value END) AS plt_val,
        MAX(CASE WHEN lab_group = 'FIB' THEN numeric_result_value END) AS fib_val
    FROM TransfusionLabs
    WHERE rn_lab = 1
    GROUP BY transfusion_id
),
TransfusionAdherence AS (
    SELECT
        t.visit_no,
        t.prov_id,
        t.attend_prov_line,

        CASE WHEN COALESCE(t.rbc_units, 0) > 0 THEN
            CASE
                WHEN cl.hgb_val < 7.0 THEN COALESCE(t.rbc_units, 0)
                WHEN cl.hgb_val <= 7.5 AND vc.flag_cardiac_surg = 1 THEN COALESCE(t.rbc_units, 0)
                WHEN cl.hgb_val < 9.0 AND vc.flag_neuro_critical = 1 THEN COALESCE(t.rbc_units, 0)
                WHEN cl.hgb_val <= 8.0 AND (vc.cci_mi > 0 AND vc.flag_pci_indicated = 0) THEN COALESCE(t.rbc_units, 0)
                WHEN cl.hgb_val < 10.0 AND vc.flag_pci_indicated = 1 THEN COALESCE(t.rbc_units, 0)
                WHEN vc.flag_bleeding = 1 OR rt.rbc_4h >= 4 THEN COALESCE(t.rbc_units, 0)
                ELSE 0
            END
        ELSE 0 END AS rbc_units_adherent,

        CASE WHEN COALESCE(t.ffp_units, 0) > 0 THEN
            CASE
                WHEN rt.ffp_4h >= 3 THEN COALESCE(t.ffp_units, 0)
                WHEN cl.inr_val >= 2.0 AND vc.flag_bleeding = 0 AND rt.rbc_4h < 4 THEN COALESCE(t.ffp_units, 0)
                ELSE 0
            END
        ELSE 0 END AS ffp_units_adherent,

        CASE WHEN COALESCE(t.plt_units, 0) > 0 THEN
            CASE
                WHEN cl.plt_val < 10000 OR vc.flag_cvc = 1 THEN COALESCE(t.plt_units, 0)
                WHEN cl.plt_val < 20000 AND vc.flag_lp = 1 THEN COALESCE(t.plt_units, 0)
                WHEN cl.plt_val < 50000 AND (rs.has_surg_24h = 1 OR vc.flag_bleeding = 1) AND vc.flag_neuraxial = 0 THEN COALESCE(t.plt_units, 0)
                WHEN cl.plt_val < 100000 AND vc.flag_neuro_critical = 1 THEN COALESCE(t.plt_units, 0)
                ELSE 0
            END
        ELSE 0 END AS plt_units_adherent,

        CASE WHEN COALESCE(t.cryo_units, 0) > 0 THEN
            CASE
                WHEN rt.rbc_4h >= 4 THEN COALESCE(t.cryo_units, 0)
                WHEN cl.fib_val < 100 THEN COALESCE(t.cryo_units, 0)
                WHEN cl.fib_val < 150 AND (rs.has_surg_6h = 1 OR vc.flag_bleeding = 1) THEN COALESCE(t.cryo_units, 0)
                WHEN cl.fib_val < 200 AND COALESCE(vc.is_ob, 0) = 1 THEN COALESCE(t.cryo_units, 0)
                ELSE 0
            END
        ELSE 0 END AS cryo_units_adherent

    FROM UniqueProviderTransfusions t
    LEFT JOIN VisitContext vc ON t.visit_no = vc.visit_no
    LEFT JOIN RecentTransfusions rt ON t.transfusion_id = rt.transfusion_id
    LEFT JOIN RecentSurgeries rs ON t.transfusion_id = rs.transfusion_id
    LEFT JOIN ClosestLabs cl ON t.transfusion_id = cl.transfusion_id
)
SELECT
    visit_no,
    prov_id,
    attend_prov_line,
    COALESCE(SUM(rbc_units_adherent), 0) AS rbc_units_adherent,
    COALESCE(SUM(ffp_units_adherent), 0) AS ffp_units_adherent,
    COALESCE(SUM(plt_units_adherent), 0) AS plt_units_adherent,
    COALESCE(SUM(cryo_units_adherent), 0) AS cryo_units_adherent
FROM TransfusionAdherence
GROUP BY visit_no, prov_id, attend_prov_line;
