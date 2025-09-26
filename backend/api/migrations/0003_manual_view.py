from django.db import migrations


def create_materialize_proc(apps, schema_editor):
    create_sql = """
    CREATE PROCEDURE intelvia.materializeVisitAttributes()
    BEGIN
        /* 1) Materialize guideline adherence per visit */
        TRUNCATE TABLE GuidelineAdherence;

        INSERT INTO GuidelineAdherence (
            visit_no,
            rbc_adherent,
            ffp_adherent,
            plt_adherent,
            cryo_adherent
        )
        SELECT
            t.visit_no,
            /* RBC adherence: HGB/Hemoglobin <= 7.5 within 2 hours prior */
            SUM(
                CASE
                    WHEN (COALESCE(t.rbc_units, 0) > 0 OR COALESCE(t.rbc_vol, 0) > 0) THEN
                        CASE
                            WHEN (
                                SELECT l.result_value
                                FROM Lab l
                                WHERE l.visit_no = t.visit_no
                                  AND UPPER(l.result_desc) IN ('HGB', 'HEMOGLOBIN')
                                  AND l.lab_draw_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 2 HOUR AND t.trnsfsn_dtm
                                ORDER BY l.lab_draw_dtm DESC
                                LIMIT 1
                            ) <= 7.5 THEN 1 ELSE 0
                        END
                    ELSE 0
                END
            ) AS rbc_adherent,

            /* FFP adherence: INR >= 1.5 within 2 hours prior */
            SUM(
                CASE
                    WHEN (COALESCE(t.ffp_units, 0) > 0 OR COALESCE(t.ffp_vol, 0) > 0) THEN
                        CASE
                            WHEN (
                                SELECT l.result_value
                                FROM Lab l
                                WHERE l.visit_no = t.visit_no
                                  AND UPPER(l.result_desc) = 'INR'
                                  AND l.lab_draw_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 2 HOUR AND t.trnsfsn_dtm
                                ORDER BY l.lab_draw_dtm DESC
                                LIMIT 1
                            ) >= 1.5 THEN 1 ELSE 0
                        END
                    ELSE 0
                END
            ) AS ffp_adherent,

            /* Platelet adherence: PLT/Platelet Count >= 15000 within 2 hours prior */
            SUM(
                CASE
                    WHEN (COALESCE(t.plt_units, 0) > 0 OR COALESCE(t.plt_vol, 0) > 0) THEN
                        CASE
                            WHEN (
                                SELECT l.result_value
                                FROM Lab l
                                WHERE l.visit_no = t.visit_no
                                  AND UPPER(l.result_desc) IN ('PLT', 'PLATELET COUNT')
                                  AND l.lab_draw_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 2 HOUR AND t.trnsfsn_dtm
                                ORDER BY l.lab_draw_dtm DESC
                                LIMIT 1
                            ) >= 15000 THEN 1 ELSE 0
                        END
                    ELSE 0
                END
            ) AS plt_adherent,

            /* Cryo adherence: Fibrinogen >= 175 within 2 hours prior */
            SUM(
                CASE
                    WHEN (COALESCE(t.cryo_units, 0) > 0 OR COALESCE(t.cryo_vol, 0) > 0) THEN
                        CASE
                            WHEN (
                                SELECT l.result_value
                                FROM Lab l
                                WHERE l.visit_no = t.visit_no
                                  AND UPPER(l.result_desc) = 'FIBRINOGEN'
                                  AND l.lab_draw_dtm BETWEEN t.trnsfsn_dtm - INTERVAL 2 HOUR AND t.trnsfsn_dtm
                                ORDER BY l.lab_draw_dtm DESC
                                LIMIT 1
                            ) >= 175 THEN 1 ELSE 0
                        END
                    ELSE 0
                END
            ) AS cryo_adherent
        FROM Transfusion t
        GROUP BY t.visit_no;

        /* 2) Materialize visit attributes (referencing guideline adherence) */
        TRUNCATE TABLE VisitAttributes;

        INSERT INTO VisitAttributes (
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
            departments
        )
        SELECT
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
            COALESCE(t.sum_rbc_units, 0) AS rbc_units,
            COALESCE(t.sum_ffp_units, 0) AS ffp_units,
            COALESCE(t.sum_plt_units, 0) AS plt_units,
            COALESCE(t.sum_cryo_units, 0) AS cryo_units,
            COALESCE(t.sum_whole_units, 0) AS whole_units,
            COALESCE(t.sum_cell_saver_ml, 0) AS cell_saver_ml,
            v.clinical_los AS los,
            CASE WHEN v.pat_expired_f = 'Y' THEN TRUE ELSE FALSE END AS death,
            CASE WHEN v.total_vent_mins > 1440 THEN TRUE ELSE FALSE END AS vent,
            CASE WHEN bc.stroke = 1 THEN TRUE ELSE FALSE END AS stroke,
            CASE WHEN bc.ecmo = 1 THEN TRUE ELSE FALSE END AS ecmo,
            CASE WHEN m.has_b12 = 1 THEN TRUE ELSE FALSE END AS b12,
            CASE WHEN m.has_iron = 1 THEN TRUE ELSE FALSE END AS iron,
            CASE WHEN m.has_antifibrinolytic = 1 THEN TRUE ELSE FALSE END AS antifibrinolytic,
            COALESCE(ga.rbc_adherent, 0) AS rbc_adherent,
            COALESCE(ga.ffp_adherent, 0) AS ffp_adherent,
            COALESCE(ga.plt_adherent, 0) AS plt_adherent,
            COALESCE(ga.cryo_adherent, 0) AS cryo_adherent,
            /* Randomly choose departments */
            CASE
                WHEN RAND(v.visit_no) < 0.33 THEN JSON_ARRAY('cardio-thoracic')
                WHEN RAND(v.visit_no) < 0.66 THEN JSON_ARRAY('oncology')
                WHEN RAND(v.visit_no) < 0.85 THEN JSON_ARRAY('cardiology')
                WHEN RAND(v.visit_no) < 0.95 THEN JSON_ARRAY('cardio-thoracic', 'oncology')
                ELSE JSON_ARRAY('cardio-thoracic', 'oncology', 'cardiology')
            END AS departments
        FROM Visit v
        LEFT JOIN (
            SELECT
                visit_no,
                SUM(rbc_units) AS sum_rbc_units,
                SUM(ffp_units) AS sum_ffp_units,
                SUM(plt_units) AS sum_plt_units,
                SUM(cryo_units) AS sum_cryo_units,
                SUM(whole_units) AS sum_whole_units,
                SUM(cell_saver_ml) AS sum_cell_saver_ml
            FROM Transfusion
            GROUP BY visit_no
        ) t ON t.visit_no = v.visit_no
        LEFT JOIN (
            SELECT
                visit_no,
                MAX(CASE WHEN cpt_code in ('99291', '1065F', '1066F') THEN 1 ELSE 0 END) AS stroke,
                MAX(CASE WHEN cpt_code in ('33946', '33947', '33948', '33949', '33952', '33953', '33954', '33955', '33956', '33957', '33958', '33959', '33960', '33961', '33962', '33963', '33964', '33965', '33966', '33969', '33984', '33985', '33986', '33987', '33988', '33989') THEN 1 ELSE 0 END) AS ecmo
            FROM BillingCode
            GROUP BY visit_no
        ) bc ON bc.visit_no = v.visit_no
        LEFT JOIN (
            SELECT
                visit_no,
                MAX(CASE WHEN medication_name LIKE '%B12%' OR medication_name LIKE '%COBALAMIN%' THEN 1 ELSE 0 END) AS has_b12,
                MAX(CASE WHEN medication_name LIKE '%IRON%' OR medication_name LIKE '%FERROUS%' OR medication_name LIKE '%FERRIC%' THEN 1 ELSE 0 END) AS has_iron,
                MAX(CASE WHEN medication_name LIKE '%TRANEXAMIC%' OR medication_name LIKE '%AMICAR%' THEN 1 ELSE 0 END) AS has_antifibrinolytic
            FROM Medication
            GROUP BY visit_no
        ) m ON m.visit_no = v.visit_no
        LEFT JOIN GuidelineAdherence ga ON ga.visit_no = v.visit_no;
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
        # Materialized table for guideline adherence
        migrations.RunSQL(
            sql="""
            DROP TABLE IF EXISTS GuidelineAdherence;

            CREATE TABLE GuidelineAdherence (
                visit_no BIGINT,
                rbc_adherent SMALLINT UNSIGNED DEFAULT 0,
                ffp_adherent SMALLINT UNSIGNED DEFAULT 0,
                plt_adherent SMALLINT UNSIGNED DEFAULT 0,
                cryo_adherent SMALLINT UNSIGNED DEFAULT 0,
                PRIMARY KEY (visit_no),
                FOREIGN KEY (visit_no) REFERENCES Visit(visit_no)
            ) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS GuidelineAdherence;
            """
        ),
        # Materialized table for visit attributes
        migrations.RunSQL(
            sql="""
            DROP TABLE IF EXISTS VisitAttributes;

            CREATE TABLE VisitAttributes (
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
                departments JSON,

                PRIMARY KEY (visit_no),
                FOREIGN KEY (visit_no) REFERENCES Visit(visit_no),
                FOREIGN KEY (mrn) REFERENCES Patient(mrn)
            ) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS VisitAttributes;
            """
        ),
        # Procedure to (re)materialize both tables
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
