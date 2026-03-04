from django.db import migrations


def create_guideline_adherence_proc(apps, schema_editor):
    create_sql = """
    CREATE PROCEDURE materializeGuidelineAdherence()
    BEGIN
        TRUNCATE TABLE GuidelineAdherence;

        /* This procedure calculates the number of guideline adherent units per provider per visit ================*/
        /* Returns the number of guideline adherent units per provider per visit ==================*/
        INSERT INTO GuidelineAdherence (
            visit_no,
            prov_id,
            attend_prov_line,
            rbc_units_adherent,
            ffp_units_adherent,
            plt_units_adherent,
            cryo_units_adherent
        )
        /* Matches every transfusion event to the specific attending provider who was "on the clock" for the patient at that exact moment ===== */
        WITH RankedTransfusions AS (
            SELECT
                t.id as transfusion_id,
                t.visit_no,
                t.trnsfsn_dtm,
                t.rbc_units,
                t.ffp_units,
                t.plt_units,
                t.cryo_units,
                ap_int.prov_id,
                ap_int.attend_prov_line,
                ROW_NUMBER() OVER (
                    PARTITION BY t.id 
                    ORDER BY ap_int.attend_prov_line ASC
                ) as rn -- (Handle edge cases where multiple providers are on the clock for the same transfusion)
            FROM Transfusion t
            JOIN AttendingProvider ap_int 
              ON ap_int.visit_no = t.visit_no
             AND t.trnsfsn_dtm BETWEEN ap_int.attend_start_dtm AND ap_int.attend_end_dtm
        ),
        UniqueProviderTransfusions AS (
            SELECT * FROM RankedTransfusions WHERE rn = 1
        ),
        /* Flags for clinical context of this patient visit (e.g. is this an OB patient?) ==================*/
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
        /* Calculates how much blood was transfused in the 4 hours before and after transfusions. ==================*/
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
        /* Checks if the patient had a surgery within 6 or 24 hours of the transfusion ==================*/
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
        /* Finds the most relevant (closest in time) lab results drawn within 24 hours surrounding the transfusion ==================*/
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
        /* Determine if the transfusion units were adherent based on the clinical context above. ==================*/
        TransfusionAdherence AS (
            SELECT
                t.visit_no,
                t.prov_id,
                t.attend_prov_line,
                
                /* RBC ADHERENCE LOGIC ============================*/
                CASE WHEN COALESCE(t.rbc_units, 0) > 0 THEN
                    CASE 
                        -- Scenario: Restrictive Threshold (HGB < 7.0 within 24h prior)
                        WHEN cl.hgb_val < 7.0 THEN COALESCE(t.rbc_units, 0)
                        
                        -- Scenario: Cardiac Surgery (HGB <= 7.5 AND CPT starting with 33)
                        WHEN cl.hgb_val <= 7.5 AND vc.flag_cardiac_surg = 1 THEN COALESCE(t.rbc_units, 0)

                        -- Scenario: Neurocritical Care / TBI (New) (HGB < 9.0 AND TBI/SAH/ICH)
                        WHEN cl.hgb_val < 9.0 AND vc.flag_neuro_critical = 1 THEN COALESCE(t.rbc_units, 0)
                        
                        -- Scenario: Symptomatic Anemia / High Risk (HGB <= 8.0 AND History of MI >30 days)
                        WHEN cl.hgb_val <= 8.0 AND (vc.cci_mi > 0 AND vc.flag_pci_indicated = 0) THEN COALESCE(t.rbc_units, 0)

                        -- Scenario: Acute Myocardial Infarction (HGB < 10.0 AND Acute MI within 30 days)
                        WHEN cl.hgb_val < 10.0 AND vc.flag_pci_indicated = 1 THEN COALESCE(t.rbc_units, 0)

                        -- Scenario: Active Bleeding / Massive Transfusion (Bleeding code OR >= 4 units RBC in 4h window)
                        WHEN vc.flag_bleeding = 1 OR rt.rbc_4h >= 4 THEN COALESCE(t.rbc_units, 0)
                        
                        ELSE 0 
                    END
                ELSE 0 END AS rbc_units_adherent,

                /* FFP ADHERENCE LOGIC ============================*/
                CASE WHEN COALESCE(t.ffp_units, 0) > 0 THEN
                    CASE
                        -- Scenario: Massive Transfusion or Plasma Exchange Exception (>= 3 FFP in 4h)
                        WHEN rt.ffp_4h >= 3 THEN COALESCE(t.ffp_units, 0)
                    
                        -- Scenario: Non-Bleeding / Threshold-Based (INR >= 2.0 within 24h prior AND NOT massive bleeding)
                        WHEN cl.inr_val >= 2.0 AND vc.flag_bleeding = 0 AND rt.rbc_4h < 4 THEN COALESCE(t.ffp_units, 0)
                        
                        ELSE 0
                    END
                ELSE 0 END AS ffp_units_adherent,

                /* PLT ADHERENCE LOGIC ============================*/
                CASE WHEN COALESCE(t.plt_units, 0) > 0 THEN
                    CASE
                        -- Scenario: Prophylactic / CVC Threshold (PLT < 10,000 within 24h prior OR CVC placement)
                        WHEN cl.plt_val < 10000 OR vc.flag_cvc = 1 THEN COALESCE(t.plt_units, 0)

                        -- Scenario: Lumbar Puncture, Interventional Radiology Threshold (PLT < 20,000 AND LP CPT)
                        WHEN cl.plt_val < 20000 AND vc.flag_lp = 1 THEN COALESCE(t.plt_units, 0)

                        -- Scenario: Major Surgery / Bleeding Threshold (PLT < 50,000 AND (Surgery in 24h OR Bleeding code) AND NOT Neuraxial)
                        WHEN cl.plt_val < 50000 AND (rs.has_surg_24h = 1 OR vc.flag_bleeding = 1) AND vc.flag_neuraxial = 0 THEN COALESCE(t.plt_units, 0)

                        -- Scenario: High-Risk Specialty (Neuro) (PLT < 100,000 AND Neuro surgery CPT)
                        WHEN cl.plt_val < 100000 AND vc.flag_neuro_critical = 1 THEN COALESCE(t.plt_units, 0)
                        
                        ELSE 0
                    END
                ELSE 0 END AS plt_units_adherent,

                /* CRYO ADHERENCE LOGIC ============================*/
                CASE WHEN COALESCE(t.cryo_units, 0) > 0 THEN
                    CASE
                        -- Scenario: Massive Hemorrhage Situations (>= 4 units RBC in 4h)
                        WHEN rt.rbc_4h >= 4 THEN COALESCE(t.cryo_units, 0)

                        -- Scenario: Standard Hypofibrinogenemia (non-bleeding) (Fibrinogen < 100 within 24h prior)
                        WHEN cl.fib_val < 100 THEN COALESCE(t.cryo_units, 0)

                        -- Scenario: Surgical / Bleeding Threshold (Fibrinogen < 150 AND (Surgery in 6h OR Bleeding code))
                        WHEN cl.fib_val < 150 AND (rs.has_surg_6h = 1 OR vc.flag_bleeding = 1) THEN COALESCE(t.cryo_units, 0)

                        -- Scenario: Obstetrics Threshold (Fibrinogen < 200 AND Obstetrics CPT)
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
    conn = schema_editor.connection
    with conn.cursor() as cursor:
        cursor.execute("DROP PROCEDURE IF EXISTS materializeGuidelineAdherence")
        cursor.execute(create_sql)


def drop_guideline_adherence_proc(apps, schema_editor):
    conn = schema_editor.connection
    with conn.cursor() as cursor:
        cursor.execute("DROP PROCEDURE IF EXISTS materializeGuidelineAdherence")


def create_materialize_proc(apps, schema_editor):
    create_sql = """
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

            -- Adherence from GuidelineAdherence materialized view
            COALESCE(ga.rbc_units_adherent, 0) AS rbc_units_adherent,
            COALESCE(ga.ffp_units_adherent, 0) AS ffp_units_adherent,
            COALESCE(ga.plt_units_adherent, 0) AS plt_units_adherent,
            COALESCE(ga.cryo_units_adherent, 0) AS cryo_units_adherent,

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
        
        /* Blood product units transfused, aggregated by provider's periods of attendance */
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
                    ap_int.prov_id,
                    ap_int.attend_prov_line,
                    t.rbc_units,
                    t.ffp_units,
                    t.plt_units,
                    t.cryo_units,
                    t.whole_units,
                    t.cell_saver_ml,
                    ROW_NUMBER() OVER (
                        PARTITION BY t.id 
                        ORDER BY ap_int.attend_prov_line ASC
                    ) as rn
                FROM AttendingProvider ap_int
                JOIN Transfusion t ON ap_int.visit_no = t.visit_no
                    AND t.trnsfsn_dtm BETWEEN ap_int.attend_start_dtm AND ap_int.attend_end_dtm
            ) ranked
            WHERE ranked.rn = 1
            GROUP BY ranked.visit_no, ranked.attend_prov_line, ranked.prov_id
        ) pt ON ap.visit_no = pt.visit_no AND ap.attend_prov_line = pt.attend_prov_line

        -- Guideline Adherence (from separately materialized view)
        LEFT JOIN GuidelineAdherence ga 
            ON ap.visit_no = ga.visit_no AND ap.attend_prov_line = ga.attend_prov_line

        -- Medications Aggregated by Provider
        -- Logic: Same as Transfusions. Assign to #1 ranked provider (Line 1 > Line 2)
        LEFT JOIN (
            SELECT 
                ranked_med.visit_no,
                ranked_med.prov_id,
                MAX(CASE WHEN UPPER(ranked_med.medication_name) REGEXP 'B12|COBALAMIN' THEN 1 ELSE 0 END) AS has_b12,
                MAX(CASE WHEN UPPER(ranked_med.medication_name) REGEXP 'IRON|FERROUS|FERRIC' THEN 1 ELSE 0 END) AS has_iron,
                MAX(CASE WHEN UPPER(ranked_med.medication_name) REGEXP 'TRANEXAMIC|AMICAR' THEN 1 ELSE 0 END) AS has_antifibrinolytic
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
        cursor.execute("DROP PROCEDURE IF EXISTS materializeVisitAttributes")
        cursor.execute(create_sql)


def drop_materialize_proc(apps, schema_editor):
    conn = schema_editor.connection
    with conn.cursor() as cursor:
        cursor.execute("DROP PROCEDURE IF EXISTS materializeVisitAttributes")


class Migration(migrations.Migration):
    atomic = False
    dependencies = [
        ('api', '0001_initial'),
        ('api', '0002_guidelineadherence_visitattributes'),
    ]
    operations = [
# Materialized table for guideline adherence (Provider Level)
        migrations.RunSQL(
            sql="""
            DROP TABLE IF EXISTS GuidelineAdherence;

            CREATE TABLE GuidelineAdherence (
                visit_no BIGINT,
                prov_id varchar(25),
                attend_prov_line SMALLINT UNSIGNED,
                rbc_units_adherent SMALLINT UNSIGNED NOT NULL DEFAULT 0,
                ffp_units_adherent SMALLINT UNSIGNED NOT NULL DEFAULT 0,
                plt_units_adherent SMALLINT UNSIGNED NOT NULL DEFAULT 0,
                cryo_units_adherent SMALLINT UNSIGNED NOT NULL DEFAULT 0,

                PRIMARY KEY (visit_no, attend_prov_line),
                FOREIGN KEY (visit_no) REFERENCES Visit(visit_no)
            ) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS GuidelineAdherence;
            """
        ),
        # Procedure to (re)materialize guideline adherence
        migrations.RunPython(create_guideline_adherence_proc, reverse_code=drop_guideline_adherence_proc),
        # Nightly event to refresh guideline adherence (before VisitAttributes)
        migrations.RunSQL(
            sql="""
            CREATE EVENT IF NOT EXISTS updateGuidelineAdherenceEvent
            ON SCHEDULE EVERY 1 DAY
            STARTS (CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 3 HOUR + INTERVAL 45 MINUTE)
            DO CALL materializeGuidelineAdherence();
            """,
            reverse_sql="""
            DROP EVENT IF EXISTS updateGuidelineAdherenceEvent;
            """
        ),
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
                whole_units_cost DECIMAL(6,2) GENERATED ALWAYS AS (whole_units * 300.00) VIRTUAL,
                overall_cost DECIMAL(8,2) GENERATED ALWAYS AS ((rbc_units * 200.00) + (ffp_units * 50.00) + (plt_units * 500.00) + (cryo_units * 30.00) + (whole_units * 300.00)) VIRTUAL,

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
            DO CALL materializeVisitAttributes();
            """,
            reverse_sql="""
            DROP EVENT IF EXISTS updateVisitAttributesEvent;
            SET GLOBAL event_scheduler = OFF;
            """
        ),
    ]
