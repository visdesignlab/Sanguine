from django.db import migrations


def create_materialize_proc(apps, schema_editor):
    create_sql = """
    CREATE PROCEDURE intelvia.materializeVisitAttributes()
    BEGIN
        TRUNCATE TABLE VisitAttributes;
        INSERT INTO VisitAttributes (
            visit_no,
            mrn,
            adm_dtm,
            dsch_dtm,
            age_at_adm,
            pat_class_desc,
            apr_drg_weight,

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

            rbc_units_cost,
            ffp_units_cost,
            plt_units_cost,
            cryo_units_cost,
            cell_saver_ml_cost
            )
            SELECT
                v.visit_no,
                v.mrn,
                v.adm_dtm,
                v.dsch_dtm,
                v.age_at_adm,
                v.pat_class_desc,
                v.apr_drg_weight,

                DATE_FORMAT(v.dsch_dtm, '%Y-%b') AS month,
                CONCAT(YEAR(v.dsch_dtm), '-Q', QUARTER(v.dsch_dtm)) AS quarter,
                YEAR(v.dsch_dtm) AS year,

                COALESCE(SUM(t.rbc_units),0)   AS rbc_units,
                COALESCE(SUM(t.ffp_units),0)   AS ffp_units,
                COALESCE(SUM(t.plt_units),0)   AS plt_units,
                COALESCE(SUM(t.cryo_units),0)  AS cryo_units,
                COALESCE(SUM(t.whole_units),0) AS whole_units,
                COALESCE(SUM(t.cell_saver_ml),0) AS cell_saver_ml,

                v.clinical_los AS los,
                CASE WHEN v.pat_expired_f = 'Y' THEN TRUE ELSE FALSE END AS death,
                CASE WHEN v.total_vent_mins > 1440 THEN TRUE ELSE FALSE END AS vent,
                FALSE AS stroke,
                FALSE AS ecmo,

                CASE WHEN SUM(CASE WHEN m.medication_name like '%B12%' OR m.medication_name like '%COBALAMIN%' THEN 1 ELSE 0 END) > 0 THEN TRUE ELSE FALSE END AS b12,
                CASE WHEN SUM(CASE WHEN m.medication_name like '%IRON%' OR m.medication_name like '%FERROUS%' OR m.medication_name like '%FERRIC%' THEN 1 ELSE 0 END) > 0 THEN TRUE ELSE FALSE END AS iron,
                CASE WHEN SUM(CASE WHEN m.medication_name like '%TRANEXAMIC%' OR m.medication_name like '%AMICAR%' THEN 1 ELSE 0 END) > 0 THEN TRUE ELSE FALSE END AS antifibrinolytic,

                0 AS rbc_adherent,
                0 AS ffp_adherent,
                0 AS plt_adherent,
                0 AS cryo_adherent,

                COALESCE(SUM(t.rbc_units * 200),0)   AS rbc_units_cost,
                COALESCE(SUM(t.ffp_units * 50),0)    AS ffp_units_cost,
                COALESCE(SUM(t.plt_units * 300),0)   AS plt_units_cost,
                COALESCE(SUM(t.cryo_units * 75),0)   AS cryo_units_cost,
                CASE WHEN SUM(t.cell_saver_ml) > 0 THEN 500 ELSE 0 END AS cell_saver_ml_cost

            FROM Visit v
            LEFT JOIN Transfusion t ON t.visit_no = v.visit_no
            LEFT JOIN Medication m ON m.visit_no = v.visit_no
            GROUP BY v.visit_no;
    END;
    """
    conn = schema_editor.connection
    with conn.cursor() as cursor:
        # ensure older proc removed first
        cursor.execute("DROP PROCEDURE IF EXISTS intelvia.materializeVisitAttributes")
        # send the full CREATE PROCEDURE statement as one statement
        cursor.execute(create_sql)


def drop_materialize_proc(apps, schema_editor):
    conn = schema_editor.connection
    with conn.cursor() as cursor:
        cursor.execute("DROP PROCEDURE IF EXISTS intelvia.materializeVisitAttributes")


class Migration(migrations.Migration):
    atomic = False
    dependencies = [
        # Update this to the previous migration in your app
        ('api', '0001_initial'),
    ]
    operations = [
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

                month char(8),
                quarter char(7),
                year char(4),

                rbc_units SMALLINT UNSIGNED DEFAULT 0,
                ffp_units SMALLINT UNSIGNED DEFAULT 0,
                plt_units SMALLINT UNSIGNED DEFAULT 0,
                cryo_units SMALLINT UNSIGNED DEFAULT 0,
                whole_units SMALLINT UNSIGNED DEFAULT 0,
                cell_saver_ml INT UNSIGNED DEFAULT 0,
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

                rbc_units_cost DECIMAL(10,2) DEFAULT 0,
                ffp_units_cost DECIMAL(10,2) DEFAULT 0,
                plt_units_cost DECIMAL(10,2) DEFAULT 0,
                cryo_units_cost DECIMAL(10,2) DEFAULT 0,
                cell_saver_ml_cost MEDIUMINT UNSIGNED DEFAULT 0,
                overall_cost DECIMAL(10,2) AS (rbc_units_cost + ffp_units_cost + plt_units_cost + cryo_units_cost + cell_saver_ml_cost) STORED,

                PRIMARY KEY (visit_no),
                FOREIGN KEY (visit_no) REFERENCES Visit(visit_no),
                FOREIGN KEY (mrn) REFERENCES Patient(mrn)
            ) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS VisitAttributes;
            """
        ),
        migrations.RunPython(create_materialize_proc, reverse_code=drop_materialize_proc),
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
