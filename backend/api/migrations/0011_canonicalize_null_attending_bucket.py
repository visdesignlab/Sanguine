from django.db import migrations


def recreate_materialized_view_procs(apps, schema_editor):
    create_ga_sql = """
    CREATE PROCEDURE materializeGuidelineAdherence()
    BEGIN
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
                t.id as transfusion_id,
                t.visit_no,
                t.trnsfsn_dtm,
                t.rbc_units,
                t.ffp_units,
                t.plt_units,
                t.cryo_units,
                CASE
                    WHEN ap_int.attend_prov_line IS NULL THEN NULL
                    ELSE ap_int.prov_id
                END as prov_id,
                COALESCE(ap_int.attend_prov_line, 0) as attend_prov_line,
                ROW_NUMBER() OVER (
                    PARTITION BY t.id
                    ORDER BY
                        COALESCE(ap_int.attend_prov_line, 9999) ASC,
                        ap_int.attend_start_dtm ASC,
                        COALESCE(ap_int.prov_id, '') ASC
                ) as rn
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
                MAX(CASE WHEN bc.cpt_code BETWEEN '59000' AND '59899' THEN 1 ELSE 0 END) as is_ob,
                MAX(CASE WHEN (bc.cpt_code BETWEEN '10000' AND '69999') AND (UPPER(bc.cpt_code_desc) REGEXP 'BLEEDING|HEMORRHAGE|HEMRRG') THEN 1 ELSE 0 END) as flag_bleeding,
                MAX(CASE WHEN bc.cpt_code IN ('62270', '62272') THEN 1 ELSE 0 END) as flag_lp,
                MAX(CASE WHEN (bc.cpt_code BETWEEN '61000' AND '63999') THEN 1 ELSE 0 END) as flag_neuro_critical,
                MAX(CASE WHEN (bc.cpt_code REGEXP '^33') THEN 1 ELSE 0 END) as flag_cardiac_surg,
                MAX(CASE WHEN (bc.cpt_code BETWEEN '92920' AND '92944') THEN 1 ELSE 0 END) as flag_pci_indicated,
                MAX(CASE WHEN bc.cpt_code IN ('36555', '36556', '36568', '36569', '36580', '36584') THEN 1 ELSE 0 END) as flag_cvc,
                MAX(CASE WHEN bc.cpt_code BETWEEN '62263' AND '62329' THEN 1 ELSE 0 END) as flag_neuraxial
            FROM Visit v
            JOIN (SELECT DISTINCT visit_no FROM UniqueProviderTransfusions) u ON u.visit_no = v.visit_no
            LEFT JOIN BillingCode bc ON v.visit_no = bc.visit_no
            GROUP BY v.visit_no, v.cci_chf, v.cci_cvd, v.cci_mi
        ),
        RecentTransfusions AS (
            SELECT
                t1.transfusion_id,
                COALESCE(SUM(t2.rbc_units), 0) as rbc_4h,
                COALESCE(SUM(t2.ffp_units), 0) as ffp_4h
            FROM UniqueProviderTransfusions t1
            JOIN Transfusion t2
                ON t1.visit_no = t2.visit_no
               AND t2.trnsfsn_dtm BETWEEN t1.trnsfsn_dtm - INTERVAL 2 HOUR AND t1.trnsfsn_dtm + INTERVAL 2 HOUR
            GROUP BY t1.transfusion_id
        ),
        RecentSurgeries AS (
            SELECT
                t.transfusion_id,
                MAX(CASE WHEN sc.surgery_end_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 24 HOUR AND t.trnsfsn_dtm + INTERVAL 24 HOUR THEN 1 ELSE 0 END) as has_surg_24h,
                MAX(CASE WHEN sc.surgery_end_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 6 HOUR AND t.trnsfsn_dtm + INTERVAL 6 HOUR THEN 1 ELSE 0 END) as has_surg_6h
            FROM UniqueProviderTransfusions t
            JOIN SurgeryCase sc ON t.visit_no = sc.visit_no
            WHERE sc.surgery_end_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 24 HOUR AND t.trnsfsn_dtm + INTERVAL 24 HOUR
            GROUP BY t.transfusion_id
        ),
        TransfusionLabs AS (
            SELECT
                t.transfusion_id,
                l.result_value,
                CASE
                    WHEN UPPER(l.result_desc) IN ('HGB', 'HEMOGLOBIN') THEN 'HGB'
                    WHEN UPPER(l.result_desc) = 'INR' THEN 'INR'
                    WHEN UPPER(l.result_desc) IN ('PLT', 'PLATELET COUNT') THEN 'PLT'
                    WHEN UPPER(l.result_desc) REGEXP 'FIBRINOGEN' THEN 'FIB'
                END as lab_group,
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
                ) as rn_lab
            FROM UniqueProviderTransfusions t
            JOIN Lab l ON t.visit_no = l.visit_no
            WHERE l.lab_draw_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 24 HOUR AND t.trnsfsn_dtm
              AND (
                  UPPER(l.result_desc) IN ('HGB', 'HEMOGLOBIN', 'INR', 'PLT', 'PLATELET COUNT')
                  OR UPPER(l.result_desc) REGEXP 'FIBRINOGEN'
              )
        ),
        ClosestLabs AS (
            SELECT
                transfusion_id,
                MAX(CASE WHEN lab_group = 'HGB' THEN result_value END) as hgb_val,
                MAX(CASE WHEN lab_group = 'INR' THEN result_value END) as inr_val,
                MAX(CASE WHEN lab_group = 'PLT' THEN result_value END) as plt_val,
                MAX(CASE WHEN lab_group = 'FIB' THEN result_value END) as fib_val
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
    END;
    """

    create_va_sql = """
    CREATE PROCEDURE materializeVisitAttributes()
    BEGIN
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
                MAX(CASE WHEN cpt_code in ('99291', '1065F', '1066F') THEN 1 ELSE 0 END) AS stroke,
                MAX(CASE WHEN cpt_code in ('33946', '33947', '33948', '33949', '33952', '33953', '33954', '33955', '33956', '33957', '33958', '33959', '33960', '33961', '33962', '33963', '33964', '33965', '33966', '33969', '33984', '33985', '33986', '33987', '33988', '33989') THEN 1 ELSE 0 END) AS ecmo
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
                    COALESCE(ap_int.attend_prov_line, 0) as attend_prov_line,
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
                    ) as rn
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
                    COALESCE(ap_int.attend_prov_line, 0) as attend_prov_line,
                    m.medication_name,
                    ROW_NUMBER() OVER (
                        PARTITION BY m.id
                        ORDER BY
                            COALESCE(ap_int.attend_prov_line, 9999) ASC,
                            ap_int.attend_start_dtm ASC,
                            COALESCE(ap_int.prov_id, '') ASC
                    ) as rn
                FROM AttendingProvider ap_int
                JOIN Medication m ON ap_int.visit_no = m.visit_no
                    AND m.admin_dtm BETWEEN ap_int.attend_start_dtm AND ap_int.attend_end_dtm
            ) ranked_med
            WHERE ranked_med.rn = 1
            GROUP BY ranked_med.visit_no, ranked_med.attend_prov_line, ranked_med.prov_id
        ) pm ON ap.visit_no = pm.visit_no AND ap.attend_prov_line = pm.attend_prov_line;
    END;
    """

    conn = schema_editor.connection
    with conn.cursor() as cursor:
        cursor.execute("DROP PROCEDURE IF EXISTS materializeGuidelineAdherence")
        cursor.execute(create_ga_sql)
        cursor.execute("DROP PROCEDURE IF EXISTS materializeVisitAttributes")
        cursor.execute(create_va_sql)


def drop_materialized_view_procs(apps, schema_editor):
    conn = schema_editor.connection
    with conn.cursor() as cursor:
        cursor.execute("DROP PROCEDURE IF EXISTS materializeGuidelineAdherence")
        cursor.execute("DROP PROCEDURE IF EXISTS materializeVisitAttributes")


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("api", "0010_materialized_view_performance_indexes"),
    ]

    operations = [
        migrations.RunPython(
            recreate_materialized_view_procs,
            reverse_code=drop_materialized_view_procs,
        ),
    ]
