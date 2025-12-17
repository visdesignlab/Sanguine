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
            rbc_adherent,
            ffp_adherent,
            plt_adherent,
            cryo_adherent,
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
            CASE WHEN ap.attend_prov_line = 1 THEN (CASE WHEN bc.stroke = 1 THEN TRUE ELSE FALSE END) ELSE NULL END AS stroke,
            CASE WHEN ap.attend_prov_line = 1 THEN (CASE WHEN bc.ecmo = 1 THEN TRUE ELSE FALSE END) ELSE NULL END AS ecmo,

            -- Medications per provider
            CASE WHEN pm.has_b12 = 1 THEN TRUE ELSE FALSE END AS b12,
            CASE WHEN pm.has_iron = 1 THEN TRUE ELSE FALSE END AS iron,
            CASE WHEN pm.has_antifibrinolytic = 1 THEN TRUE ELSE FALSE END AS antifibrinolytic,

            -- Adherence per provider
            COALESCE(pt.rbc_adherent, 0),
            COALESCE(pt.ffp_adherent, 0),
            COALESCE(pt.plt_adherent, 0),
            COALESCE(pt.cryo_adherent, 0),

            ap.prov_name,
            ap.prov_id,
            ap.attend_prov_line,
            CASE WHEN ap.attend_prov_line = 1 THEN TRUE ELSE FALSE END AS is_admitting_attending

        FROM AttendingProvider ap
        JOIN Visit v ON ap.visit_no = v.visit_no
        
        -- Transfusions and Adherence Aggregated by Provider
        -- Find all attending providers active at the time of transfusion.
        -- Rank them by Responsibility (Line 1 > Line 2).
        -- Assign the transfusion strictly to the #1 ranked provider to prevent double-counting.
        LEFT JOIN (
            SELECT 
                ranked.visit_no,
                ranked.prov_id,
                SUM(ranked.rbc_units) AS sum_rbc_units,
                SUM(ranked.ffp_units) AS sum_ffp_units,
                SUM(ranked.plt_units) AS sum_plt_units,
                SUM(ranked.cryo_units) AS sum_cryo_units,
                SUM(ranked.whole_units) AS sum_whole_units,
                SUM(ranked.cell_saver_ml) AS sum_cell_saver_ml,
                -- Adherence calculations remain same, but ensuring single counting
                SUM(ranked.rbc_adherent) AS rbc_adherent,
                SUM(ranked.ffp_adherent) AS ffp_adherent,
                SUM(ranked.plt_adherent) AS plt_adherent,
                SUM(ranked.cryo_adherent) AS cryo_adherent
            FROM (
                SELECT 
                    ap_int.visit_no,
                    ap_int.prov_id,
                    t.rbc_units,
                    t.ffp_units,
                    t.plt_units,
                    t.cryo_units,
                    t.whole_units,
                    t.cell_saver_ml,
                    -- RBC Adherence Logic
                    CASE WHEN (COALESCE(t.rbc_units, 0) > 0 OR COALESCE(t.rbc_vol, 0) > 0) THEN
                        CASE WHEN (
                            SELECT l.result_value
                            FROM Lab l
                            WHERE l.visit_no = t.visit_no
                              AND UPPER(l.result_desc) IN ('HGB', 'HEMOGLOBIN')
                              AND l.lab_draw_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 2 HOUR AND t.trnsfsn_dtm
                            ORDER BY l.lab_draw_dtm DESC
                            LIMIT 1
                        ) <= 7.5 THEN 1 ELSE 0 END
                    ELSE 0 END AS rbc_adherent,
                    -- FFP Adherence Logic
                    CASE WHEN (COALESCE(t.ffp_units, 0) > 0 OR COALESCE(t.ffp_vol, 0) > 0) THEN
                        CASE WHEN (
                            SELECT l.result_value
                            FROM Lab l
                            WHERE l.visit_no = t.visit_no
                              AND UPPER(l.result_desc) = 'INR'
                              AND l.lab_draw_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 2 HOUR AND t.trnsfsn_dtm
                            ORDER BY l.lab_draw_dtm DESC
                            LIMIT 1
                        ) >= 1.5 THEN 1 ELSE 0 END
                    ELSE 0 END AS ffp_adherent,
                    -- PLT Adherence Logic
                    CASE WHEN (COALESCE(t.plt_units, 0) > 0 OR COALESCE(t.plt_vol, 0) > 0) THEN
                        CASE WHEN (
                            SELECT l.result_value
                            FROM Lab l
                            WHERE l.visit_no = t.visit_no
                              AND UPPER(l.result_desc) IN ('PLT', 'PLATELET COUNT')
                              AND l.lab_draw_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 2 HOUR AND t.trnsfsn_dtm
                            ORDER BY l.lab_draw_dtm DESC
                            LIMIT 1
                        ) >= 15000 THEN 1 ELSE 0 END
                    ELSE 0 END AS plt_adherent,
                    -- Cryo Adherence Logic
                    CASE WHEN (COALESCE(t.cryo_units, 0) > 0 OR COALESCE(t.cryo_vol, 0) > 0) THEN
                        CASE WHEN (
                            SELECT l.result_value
                            FROM Lab l
                            WHERE l.visit_no = t.visit_no
                              AND UPPER(l.result_desc) = 'FIBRINOGEN'
                              AND l.lab_draw_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 2 HOUR AND t.trnsfsn_dtm
                            ORDER BY l.lab_draw_dtm DESC
                            LIMIT 1
                        ) >= 175 THEN 1 ELSE 0 END
                    ELSE 0 END AS cryo_adherent,
                    
                    ROW_NUMBER() OVER (
                        PARTITION BY t.id 
                        ORDER BY ap_int.attend_prov_line ASC
                    ) as rn
                FROM AttendingProvider ap_int
                JOIN Transfusion t ON ap_int.visit_no = t.visit_no
                    AND t.trnsfsn_dtm BETWEEN ap_int.attend_start_dtm AND ap_int.attend_end_dtm
            ) ranked
            WHERE ranked.rn = 1
            GROUP BY ranked.visit_no, ranked.prov_id
        ) pt ON ap.visit_no = pt.visit_no AND ap.prov_id = pt.prov_id

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
        ) pm ON ap.visit_no = pm.visit_no AND ap.prov_id = pm.prov_id

        -- Billing Codes (Outcomes) - Visit Level
        LEFT JOIN (
            SELECT
                visit_no,
                MAX(CASE WHEN cpt_code in ('99291', '1065F', '1066F') THEN 1 ELSE 0 END) AS stroke,
                MAX(CASE WHEN cpt_code in ('33946', '33947', '33948', '33949', '33952', '33953', '33954', '33955', '33956', '33957', '33958', '33959', '33960', '33961', '33962', '33963', '33964', '33965', '33966', '33969', '33984', '33985', '33986', '33987', '33988', '33989') THEN 1 ELSE 0 END) AS ecmo
            FROM BillingCode
            GROUP BY visit_no
        ) bc ON bc.visit_no = v.visit_no;
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

                rbc_units SMALLINT UNSIGNED DEFAULT 0,
                ffp_units SMALLINT UNSIGNED DEFAULT 0,
                plt_units SMALLINT UNSIGNED DEFAULT 0,
                cryo_units SMALLINT UNSIGNED DEFAULT 0,
                whole_units SMALLINT UNSIGNED DEFAULT 0,
                cell_saver_ml MEDIUMINT UNSIGNED DEFAULT 0,
                overall_units SMALLINT UNSIGNED AS (rbc_units + ffp_units + plt_units + cryo_units + whole_units) STORED,

                los DECIMAL(6,2),
                death BOOLEAN,
                vent BOOLEAN,
                stroke BOOLEAN,
                ecmo BOOLEAN,

                b12 BOOLEAN,
                iron BOOLEAN,
                antifibrinolytic BOOLEAN,

                rbc_adherent SMALLINT UNSIGNED DEFAULT 0,
                ffp_adherent SMALLINT UNSIGNED DEFAULT 0,
                plt_adherent SMALLINT UNSIGNED DEFAULT 0,
                cryo_adherent SMALLINT UNSIGNED DEFAULT 0,
                overall_adherent SMALLINT UNSIGNED AS (rbc_adherent + ffp_adherent + plt_adherent + cryo_adherent) STORED,
                
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
