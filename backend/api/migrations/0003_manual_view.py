from django.db import migrations


def create_materialize_proc(apps, schema_editor):
    create_sql = """
    CREATE PROCEDURE intelvia.materializeVisitAttributes()
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

            -- Visit outcomes assigned only to admitting attending
            CASE WHEN ap.attend_prov_line = 1 THEN v.clinical_los ELSE NULL END AS los,
            CASE WHEN ap.attend_prov_line = 1 THEN (CASE WHEN v.pat_expired_f = 'Y' THEN TRUE ELSE FALSE END) ELSE NULL END AS death,
            CASE WHEN ap.attend_prov_line = 1 THEN (CASE WHEN v.total_vent_mins > 1440 THEN TRUE ELSE FALSE END) ELSE NULL END AS vent,
            CASE WHEN ap.attend_prov_line = 1 THEN (CASE WHEN bc_outcomes.stroke = 1 THEN TRUE ELSE FALSE END) ELSE NULL END AS stroke,
            CASE WHEN ap.attend_prov_line = 1 THEN (CASE WHEN bc_outcomes.ecmo = 1 THEN TRUE ELSE FALSE END) ELSE NULL END AS ecmo,

            -- Medications per provider
            CASE WHEN pm.has_b12 = 1 THEN TRUE ELSE FALSE END AS b12,
            CASE WHEN pm.has_iron = 1 THEN TRUE ELSE FALSE END AS iron,
            CASE WHEN pm.has_antifibrinolytic = 1 THEN TRUE ELSE FALSE END AS antifibrinolytic,

            -- Adherence per provider (Sum of Adherent Units)
            COALESCE(pt.rbc_units_adherent, 0),
            COALESCE(pt.ffp_units_adherent, 0),
            COALESCE(pt.plt_units_adherent, 0),
            COALESCE(pt.cryo_units_adherent, 0),

            ap.prov_name,
            ap.prov_id,
            ap.attend_prov_line,
            CASE WHEN ap.attend_prov_line = 1 THEN TRUE ELSE FALSE END AS is_admitting_attending

        FROM AttendingProvider ap
        JOIN Visit v ON ap.visit_no = v.visit_no
        
        -- Billing Codes Metadata for Outcomes (Visit Level)
        LEFT JOIN (
            SELECT
                visit_no,
                MAX(CASE WHEN cpt_code in ('99291', '1065F', '1066F') THEN 1 ELSE 0 END) AS stroke,
                MAX(CASE WHEN cpt_code in ('33946', '33947', '33948', '33949', '33952', '33953', '33954', '33955', '33956', '33957', '33958', '33959', '33960', '33961', '33962', '33963', '33964', '33965', '33966', '33969', '33984', '33985', '33986', '33987', '33988', '33989') THEN 1 ELSE 0 END) AS ecmo
            FROM BillingCode
            GROUP BY visit_no
        ) bc_outcomes ON bc_outcomes.visit_no = v.visit_no
        
        /* Blood product units transfused, and adherence of those units, aggregated by provider's periods of attendance */
        LEFT JOIN (
            SELECT 
                ranked.visit_no,
                ranked.prov_id,
                ranked.attend_prov_line,
                -- Summing the transfused units for each provider's period of attendance
                SUM(ranked.rbc_units) AS sum_rbc_units,
                SUM(ranked.ffp_units) AS sum_ffp_units,
                SUM(ranked.plt_units) AS sum_plt_units,
                SUM(ranked.cryo_units) AS sum_cryo_units,
                SUM(ranked.whole_units) AS sum_whole_units,
                SUM(ranked.cell_saver_ml) AS sum_cell_saver_ml,
                -- Summing the ADHERENT transfused units for each provider's period of attendance
                SUM(ranked.rbc_units_adherent) AS rbc_units_adherent,
                SUM(ranked.ffp_units_adherent) AS ffp_units_adherent,
                SUM(ranked.plt_units_adherent) AS plt_units_adherent,
                SUM(ranked.cryo_units_adherent) AS cryo_units_adherent
            FROM (
                SELECT 
                    ap_int.visit_no,
                    ap_int.prov_id,
                    ap_int.attend_prov_line,
                    t.rbc_units,
                    t.ffp_units,
                    t.plt_units,
                    t.cryo_units,
                    t.whole_units,
                    t.cell_saver_ml,
                    
                    /* RBC ADHERENCE LOGIC ============================*/
                    CASE WHEN COALESCE(t.rbc_units, 0) > 0 THEN
                        CASE 
                            -- 1. Restrictive Threshold (Hb < 7.0)
                            WHEN lab_hgb.val < 7.0 THEN 1
                            
                            -- 2. Neurocritical Care / TBI (Liberal < 9.0)
                            -- Per 2025 Cochrane Review: Liberal strategy favored for neuro outcomes
                            WHEN lab_hgb.val < 9.0 
                            AND (bc_ctx.flag_neuro_critical = 1) THEN 1

                            -- 3. Cardiac Surgery (Hb <= 7.5)
                            WHEN lab_hgb.val <= 7.5 
                            AND (bc_ctx.flag_cardiac_surg = 1) THEN 1
                            
                            -- 4. High Risk Threshold (Hb <= 8.0) with RECENT Comorbidity
                            -- (CHF, CVD, Ortho Surgery)
                            WHEN lab_hgb.val <= 8.0 
                            AND (
                                v.cci_chf > 0 OR 
                                v.cci_cvd > 0 OR
                                sc_ctx.has_surg_24h = 1 
                            ) THEN 1

                             -- 5. AMI / Interventional Cardiology (Hb < 10.0)
                             -- Requires active/recent history of MI (CCI > 0) or PCI codes
                            WHEN lab_hgb.val < 10.0
                            AND (
                                v.cci_mi > 0 OR 
                                bc_ctx.flag_pci_indicated = 1
                            ) THEN 1

                            -- 6. Massive Bleeding or High Transfusion
                            WHEN bc_ctx.flag_bleeding = 1 OR trans_ctx.rbc_4h >= 4 THEN 1
                            
                            ELSE 0 
                        END * t.rbc_units
                    ELSE 0 END AS rbc_units_adherent,

                    /* FFP ADHERENCE LOGIC ============================*/
                    CASE WHEN COALESCE(t.ffp_units, 0) > 0 THEN
                        CASE
                            -- 1. Strict Exception (> 3 FFP in 4h)
                            WHEN trans_ctx.ffp_4h >= 3 THEN 1
                        
                            -- 2. Standard (INR >= 2.0)
                            WHEN lab_inr.val >= 2.0 THEN 1
                            
                            -- 3. Procedure/Bleeding (INR >= 1.5)
                            WHEN lab_inr.val >= 1.5 
                            AND (
                                sc_ctx.has_surg_6h = 1 OR 
                                bc_ctx.flag_bleeding = 1
                            ) THEN 1
                            
                            ELSE 0
                        END * t.ffp_units
                    ELSE 0 END AS ffp_units_adherent,

                    /* PLT ADHERENCE LOGIC ============================*/
                    CASE WHEN COALESCE(t.plt_units, 0) > 0 THEN
                        CASE
                            -- 1. Prophylactic / CVC (Plt < 10,000)
                            WHEN lab_plt.val < 10000 THEN 1

                            -- 2. Lumbar Puncture (Plt < 20,000)
                            WHEN lab_plt.val < 20000 AND bc_ctx.flag_lp = 1 THEN 1

                            -- 3. Major Surgery (Plt < 50,000 AND (Surgery within 24h OR Bleeding))
                            -- Excludes Neuraxial/Neuro which are caught in High Risk below
                            WHEN lab_plt.val < 50000 
                            AND (
                                sc_ctx.has_surg_24h = 1 OR
                                bc_ctx.flag_bleeding = 1
                            ) THEN 1

                            -- 4. High Risk (Plt <= 100,000)
                            -- (Neuro, Cardiac, Eye, Neuraxial, Vascular)
                            WHEN lab_plt.val <= 100000 AND bc_ctx.flag_target_100_indicated = 1 THEN 1
                            
                            ELSE 0
                        END * t.plt_units
                    ELSE 0 END AS plt_units_adherent,

                    /* CRYO ADHERENCE LOGIC ============================*/
                    CASE WHEN COALESCE(t.cryo_units, 0) > 0 THEN
                        CASE
                            -- 1. Massive Transfusion (>=4 RBC)
                            WHEN trans_ctx.rbc_4h >= 4 THEN 1

                            -- 2. Low Fibrinogen (< 100)
                            WHEN lab_fib.val < 100 THEN 1

                            -- 3. Obstetrics (< 200)
                            WHEN lab_fib.val < 200 AND bc_ctx.is_ob = 1 THEN 1

                            -- 4. Surgical/Bleeding (< 150)
                            WHEN lab_fib.val < 150
                            AND (
                                sc_ctx.has_surg_6h = 1 OR
                                bc_ctx.flag_bleeding = 1
                            ) THEN 1
                            
                            ELSE 0
                        END * t.cryo_units
                    ELSE 0 END AS cryo_units_adherent,
                    
                    /* Handle provider attendance overlaps by ranking line numbers (who was there first) */
                    ROW_NUMBER() OVER (
                        PARTITION BY t.id 
                        ORDER BY ap_int.attend_prov_line ASC
                    ) as rn
                FROM AttendingProvider ap_int
                /* Transfusions between a provider's attendance period */
                JOIN Transfusion t ON ap_int.visit_no = t.visit_no
                    AND t.trnsfsn_dtm BETWEEN ap_int.attend_start_dtm AND ap_int.attend_end_dtm
                JOIN Visit v ON v.visit_no = t.visit_no 
                
                -- Billing Code Context (Pre-aggregated per visit)
                LEFT JOIN (
                    SELECT 
                        visit_no,
                        -- Helper flags for specific exceptions
                        MAX(CASE WHEN cpt_code BETWEEN '59000' AND '59899' AND cpt_code NOT LIKE '%F' THEN 1 ELSE 0 END) as is_ob,
                        
                        -- Bleeding Exception (Surgery CPT + Keywords)
                        MAX(CASE WHEN 
                                (cpt_code BETWEEN '10000' AND '69999' AND cpt_code NOT LIKE '%F') AND
                                (cpt_code_desc LIKE '%BLEEDING%' OR cpt_code_desc LIKE '%HEMORRHAGE%' OR cpt_code_desc LIKE '%HEMRRG%')
                            THEN 1 ELSE 0 END) as flag_bleeding,

                        -- Lumbar Puncture Flag (62270, 62272)
                        MAX(CASE WHEN cpt_code IN ('62270', '62272') THEN 1 ELSE 0 END) as flag_lp,

                        -- Neurocritical / Neurosurgery Flag (For RBC < 9.0)
                        -- Includes Cranial and Spinal surgery ranges
                        MAX(CASE WHEN (
                            (cpt_code BETWEEN '61000' AND '63999' AND cpt_code NOT LIKE '%F') 
                        ) THEN 1 ELSE 0 END) as flag_neuro_critical,

                        -- Cardiac Surgery Flag
                        MAX(CASE WHEN (cpt_code LIKE '33%' AND cpt_code NOT LIKE '%F') THEN 1 ELSE 0 END) as flag_cardiac_surg,

                        -- PCI / Interventional Cardiology Flag
                        MAX(CASE WHEN (cpt_code BETWEEN '92920' AND '92944' AND cpt_code NOT LIKE '%F') THEN 1 ELSE 0 END) as flag_pci_indicated,

                        -- Target 100k Indication (Neuro, Cardiac Surg, Eye, Neuraxial, Vascular)
                        MAX(CASE WHEN (
                            (cpt_code LIKE '33%' AND cpt_code NOT LIKE '%F') OR -- Cardiac
                            (cpt_code BETWEEN '61000' AND '63999' AND cpt_code NOT LIKE '%F') OR -- Neuro
                            (cpt_code BETWEEN '65000' AND '68899' AND cpt_code NOT LIKE '%F') OR -- Eye
                            (cpt_code BETWEEN '62263' AND '62329' AND cpt_code NOT LIKE '%F') OR -- Neuraxial
                            (cpt_code BETWEEN '33860' AND '33999' AND cpt_code NOT LIKE '%F') OR -- Vascular Aorta
                            (cpt_code BETWEEN '34000' AND '34999' AND cpt_code NOT LIKE '%F')    -- Vascular Other
                        ) THEN 1 ELSE 0 END) as flag_target_100_indicated

                    FROM BillingCode
                    GROUP BY visit_no
                ) bc_ctx ON bc_ctx.visit_no = t.visit_no
                
                -- Surgery Context
                LEFT JOIN LATERAL (
                    SELECT 
                        MAX(CASE WHEN surgery_end_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 24 HOUR AND t.trnsfsn_dtm + INTERVAL 24 HOUR THEN 1 ELSE 0 END) as has_surg_24h,
                        MAX(CASE WHEN surgery_end_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 6 HOUR AND t.trnsfsn_dtm + INTERVAL 6 HOUR THEN 1 ELSE 0 END) as has_surg_6h
                    FROM SurgeryCase sc
                    WHERE sc.visit_no = t.visit_no
                ) sc_ctx ON TRUE

                -- Transfusion Context
                LEFT JOIN LATERAL (
                    SELECT 
                        SUM(t2.rbc_units) as rbc_4h,
                        SUM(t2.ffp_units) as ffp_4h
                    FROM Transfusion t2
                    WHERE t2.visit_no = t.visit_no
                    AND t2.trnsfsn_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 4 HOUR AND t.trnsfsn_dtm + INTERVAL 4 HOUR
                ) trans_ctx ON TRUE

                -- Labs
                LEFT JOIN LATERAL (
                    SELECT result_value as val
                    FROM Lab l 
                    WHERE l.visit_no = t.visit_no 
                      AND UPPER(l.result_desc) IN ('HGB', 'HEMOGLOBIN')
                      AND l.lab_draw_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 24 HOUR AND t.trnsfsn_dtm
                    ORDER BY l.lab_draw_dtm DESC LIMIT 1
                ) lab_hgb ON TRUE
                
                LEFT JOIN LATERAL (
                    SELECT result_value as val
                    FROM Lab l 
                    WHERE l.visit_no = t.visit_no 
                      AND UPPER(l.result_desc) = 'INR'
                      AND l.lab_draw_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 24 HOUR AND t.trnsfsn_dtm
                    ORDER BY l.lab_draw_dtm DESC LIMIT 1
                ) lab_inr ON TRUE
                
                LEFT JOIN LATERAL (
                    SELECT result_value as val
                    FROM Lab l 
                    WHERE l.visit_no = t.visit_no 
                      AND UPPER(l.result_desc) IN ('PLT', 'PLATELET COUNT')
                      AND l.lab_draw_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 24 HOUR AND t.trnsfsn_dtm
                    ORDER BY l.lab_draw_dtm DESC LIMIT 1
                ) lab_plt ON TRUE
                
                LEFT JOIN LATERAL (
                    SELECT result_value as val
                    FROM Lab l 
                    WHERE l.visit_no = t.visit_no 
                      AND UPPER(l.result_desc) LIKE '%FIBRINOGEN%'
                      AND l.lab_draw_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 24 HOUR AND t.trnsfsn_dtm
                    ORDER BY l.lab_draw_dtm DESC LIMIT 1
                ) lab_fib ON TRUE

            ) ranked
            WHERE ranked.rn = 1
            /* Group by provider attendance periods */
            GROUP BY ranked.visit_no, ranked.attend_prov_line, ranked.prov_id
        ) pt ON ap.visit_no = pt.visit_no AND ap.attend_prov_line = pt.attend_prov_line

        -- Medications Aggregated by Provider
        -- Logic: Same as Transfusions. Assign to #1 ranked provider (Line 1 > Line 2)
        LEFT JOIN (
            SELECT 
                ranked_med.visit_no,
                ranked_med.prov_id,
                MAX(CASE WHEN ranked_med.medication_name LIKE '%B12%' OR ranked_med.medication_name LIKE '%COBALAMIN%' THEN 1 ELSE 0 END) AS has_b12,
                MAX(CASE WHEN ranked_med.medication_name LIKE '%IRON%' OR ranked_med.medication_name LIKE '%FERROUS%' OR ranked_med.medication_name LIKE '%FERRIC%' THEN 1 ELSE 0 END) AS has_iron,
                MAX(CASE WHEN ranked_med.medication_name LIKE '%TRANEXAMIC%' OR ranked_med.medication_name LIKE '%AMICAR%' THEN 1 ELSE 0 END) AS has_antifibrinolytic
            FROM (
                SELECT 
                    ap_int.visit_no,
                    ap_int.prov_id,
                    m.medication_name,
                    ROW_NUMBER() OVER (
                        PARTITION BY m.id 
                        ORDER BY ap_int.attend_prov_line ASC
                    ) as rn
                FROM AttendingProvider ap_int
                JOIN Medication m ON ap_int.visit_no = m.visit_no
                    AND m.admin_dtm BETWEEN ap_int.attend_start_dtm AND ap_int.attend_end_dtm
            ) ranked_med
            WHERE ranked_med.rn = 1
            GROUP BY ranked_med.visit_no, ranked_med.prov_id
        ) pm ON ap.visit_no = pm.visit_no AND ap.prov_id = pm.prov_id;
    END;
    """
    conn = schema_editor.connection
    with conn.cursor() as cursor:
        cursor.execute("DROP PROCEDURE IF EXISTS intelvia.materializeVisitAttributes")
        cursor.execute(create_sql)


def drop_materialize_proc(apps, schema_editor):
    conn = schema_editor.connection
    with conn.cursor() as cursor:
        cursor.execute("DROP PROCEDURE IF EXISTS intelvia.materializeVisitAttributes")


class Migration(migrations.Migration):
    atomic = False
    dependencies = [
        ('api', '0001_initial'),
        ('api', '0002_guidelineadherence_visitattributes'),
    ]
    operations = [
# Materialized table for visit attributes (Provider Level)
        migrations.RunSQL(
            sql="""
            DROP TABLE IF EXISTS VisitAttributes;

            CREATE TABLE VisitAttributes (
                id VARCHAR(50),
                visit_no BIGINT,
                mrn varchar(20),
                adm_dtm DATE,
                dsch_dtm DATE,
                age_at_adm TINYINT UNSIGNED,
                pat_class_desc varchar(100),
                apr_drg_weight FLOAT,
                ms_drg_weight FLOAT,

                month char(8),
                quarter char(7),
                year char(4),

                rbc_units SMALLINT UNSIGNED NOT NULL DEFAULT 0,
                ffp_units SMALLINT UNSIGNED NOT NULL DEFAULT 0,
                plt_units SMALLINT UNSIGNED NOT NULL DEFAULT 0,
                cryo_units SMALLINT UNSIGNED NOT NULL DEFAULT 0,
                whole_units SMALLINT UNSIGNED NOT NULL DEFAULT 0,
                cell_saver_ml MEDIUMINT UNSIGNED NOT NULL DEFAULT 0,
                overall_units SMALLINT UNSIGNED AS (rbc_units + ffp_units + plt_units + cryo_units + whole_units) STORED,

                los FLOAT,
                death BOOLEAN,
                vent BOOLEAN,
                stroke BOOLEAN,
                ecmo BOOLEAN,

                b12 BOOLEAN,
                iron BOOLEAN,
                antifibrinolytic BOOLEAN,

                rbc_units_adherent SMALLINT UNSIGNED NOT NULL DEFAULT 0,
                ffp_units_adherent SMALLINT UNSIGNED NOT NULL DEFAULT 0,
                plt_units_adherent SMALLINT UNSIGNED NOT NULL DEFAULT 0,
                cryo_units_adherent SMALLINT UNSIGNED NOT NULL DEFAULT 0,
                overall_units_adherent SMALLINT UNSIGNED AS (rbc_units_adherent + ffp_units_adherent + plt_units_adherent + cryo_units_adherent) STORED,
                
                rbc_units_cost DECIMAL(6,2) GENERATED ALWAYS AS (rbc_units * 200.00) VIRTUAL,
                ffp_units_cost DECIMAL(6,2) GENERATED ALWAYS AS (ffp_units * 50.00) VIRTUAL,
                plt_units_cost DECIMAL(6,2) GENERATED ALWAYS AS (plt_units * 500.00) VIRTUAL,
                cryo_units_cost DECIMAL(6,2) GENERATED ALWAYS AS (cryo_units * 30.00) VIRTUAL,
                overall_cost DECIMAL(8,2) GENERATED ALWAYS AS ((rbc_units * 200.00) + (ffp_units * 50.00) + (plt_units * 500.00) + (cryo_units * 30.00)) VIRTUAL,

                attending_provider varchar(100),
                attending_provider_id varchar(25),
                attending_provider_line SMALLINT UNSIGNED DEFAULT 0,
                
                is_admitting_attending BOOLEAN,

                PRIMARY KEY (id),
                FOREIGN KEY (visit_no) REFERENCES Visit(visit_no),
                FOREIGN KEY (mrn) REFERENCES Patient(mrn)
            ) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS VisitAttributes;
            """
        ),
        # Procedure to (re)materialize
        migrations.RunPython(create_materialize_proc, reverse_code=drop_materialize_proc),
        # Nightly event to refresh
        migrations.RunSQL(
            sql="""
            -- Set up the event to run the procedure daily at 2 AM
            CREATE EVENT IF NOT EXISTS updateVisitAttributesEvent
            ON SCHEDULE EVERY 1 DAY
            STARTS (CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 4 HOUR)
            DO CALL intelvia.materializeVisitAttributes();
            """,
            reverse_sql="""
            DROP EVENT IF EXISTS updateVisitAttributesEvent;
            SET GLOBAL event_scheduler = OFF;
            """
        ),
    ]
