from django.db import migrations


def create_materialize_proc(apps, schema_editor):
    create_sql = """
    CREATE PROCEDURE intelvia.materializeSurgeryCaseAttributes()
    BEGIN
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

            -- Pre-op Labs (Last result before surgery start)
            pre_hgb,
            pre_ferritin,
            pre_plt,
            pre_fibrinogen,
            pre_inr,

            -- Post-op Labs (First result after surgery end - within reasonable window e.g., 24h? or just next?)
            -- Decision: Just next result.
            post_hgb,
            post_ferritin,
            post_plt,
            post_fibrinogen,
            post_inr,

            -- Intraop Transfusions
            intraop_rbc_units,
            intraop_ffp_units,
            intraop_plt_units,
            intraop_cryo_units,
            intraop_cell_saver_ml,

            -- Visit Outcomes (Repeated per case for easier querying)
            los,
            death,
            vent,
            stroke,
            ecmo,
            
            -- Costs (Calculated per case based on intraop usage)
            rbc_cost,
            ffp_cost,
            plt_cost,
            cryo_cost,
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

            -- Pre-op Labs
            (
                SELECT l.result_value FROM Lab l 
                WHERE l.visit_no = sc.visit_no 
                AND l.lab_draw_dtm < sc.surgery_start_dtm 
                AND UPPER(l.result_desc) IN ('HGB', 'HEMOGLOBIN')
                ORDER BY l.lab_draw_dtm DESC LIMIT 1
            ) as pre_hgb,
            (
                SELECT l.result_value FROM Lab l 
                WHERE l.visit_no = sc.visit_no 
                AND l.lab_draw_dtm < sc.surgery_start_dtm 
                AND UPPER(l.result_desc) LIKE '%FERRITIN%'
                ORDER BY l.lab_draw_dtm DESC LIMIT 1
            ) as pre_ferritin,
            (
                SELECT l.result_value FROM Lab l 
                WHERE l.visit_no = sc.visit_no 
                AND l.lab_draw_dtm < sc.surgery_start_dtm 
                AND UPPER(l.result_desc) IN ('PLT', 'PLATELET COUNT')
                ORDER BY l.lab_draw_dtm DESC LIMIT 1
            ) as pre_plt,
            (
                SELECT l.result_value FROM Lab l 
                WHERE l.visit_no = sc.visit_no 
                AND l.lab_draw_dtm < sc.surgery_start_dtm 
                AND UPPER(l.result_desc) = 'FIBRINOGEN'
                ORDER BY l.lab_draw_dtm DESC LIMIT 1
            ) as pre_fibrinogen,
            (
                SELECT l.result_value FROM Lab l 
                WHERE l.visit_no = sc.visit_no 
                AND l.lab_draw_dtm < sc.surgery_start_dtm 
                AND UPPER(l.result_desc) = 'INR'
                ORDER BY l.lab_draw_dtm DESC LIMIT 1
            ) as pre_inr,

            -- Post-op Labs
            (
                SELECT l.result_value FROM Lab l 
                WHERE l.visit_no = sc.visit_no 
                AND l.lab_draw_dtm > sc.surgery_end_dtm 
                AND UPPER(l.result_desc) IN ('HGB', 'HEMOGLOBIN')
                ORDER BY l.lab_draw_dtm ASC LIMIT 1
            ) as post_hgb,
            (
                SELECT l.result_value FROM Lab l 
                WHERE l.visit_no = sc.visit_no 
                AND l.lab_draw_dtm > sc.surgery_end_dtm 
                AND UPPER(l.result_desc) LIKE '%FERRITIN%'
                ORDER BY l.lab_draw_dtm ASC LIMIT 1
            ) as post_ferritin,
            (
                SELECT l.result_value FROM Lab l 
                WHERE l.visit_no = sc.visit_no 
                AND l.lab_draw_dtm > sc.surgery_end_dtm 
                AND UPPER(l.result_desc) IN ('PLT', 'PLATELET COUNT')
                ORDER BY l.lab_draw_dtm ASC LIMIT 1
            ) as post_plt,
            (
                SELECT l.result_value FROM Lab l 
                WHERE l.visit_no = sc.visit_no 
                AND l.lab_draw_dtm > sc.surgery_end_dtm 
                AND UPPER(l.result_desc) = 'FIBRINOGEN'
                ORDER BY l.lab_draw_dtm ASC LIMIT 1
            ) as post_fibrinogen,
            (
                SELECT l.result_value FROM Lab l 
                WHERE l.visit_no = sc.visit_no 
                AND l.lab_draw_dtm > sc.surgery_end_dtm 
                AND UPPER(l.result_desc) = 'INR'
                ORDER BY l.lab_draw_dtm ASC LIMIT 1
            ) as post_inr,

            -- Intraop Transfusions
            COALESCE(intra.sum_rbc, 0) as intraop_rbc_units,
            COALESCE(intra.sum_ffp, 0) as intraop_ffp_units,
            COALESCE(intra.sum_plt, 0) as intraop_plt_units,
            COALESCE(intra.sum_cryo, 0) as intraop_cryo_units,
            COALESCE(intra.sum_cs, 0) as intraop_cell_saver_ml,

            -- Visit Outcomes
            v.clinical_los as los,
            (CASE WHEN v.pat_expired_f = 'Y' THEN TRUE ELSE FALSE END) as death,
            (CASE WHEN v.total_vent_mins > 1440 THEN TRUE ELSE FALSE END) as vent,
            (CASE WHEN bc.stroke = 1 THEN TRUE ELSE FALSE END) AS stroke,
            (CASE WHEN bc.ecmo = 1 THEN TRUE ELSE FALSE END) AS ecmo,

            -- Costs
            (COALESCE(intra.sum_rbc, 0) * 200.00) as rbc_cost,
            (COALESCE(intra.sum_ffp, 0) * 50.00) as ffp_cost,
            (COALESCE(intra.sum_plt, 0) * 500.00) as plt_cost,
            (COALESCE(intra.sum_cryo, 0) * 30.00) as cryo_cost,
            (CASE WHEN COALESCE(intra.sum_cs, 0) > 0 THEN 225.00 ELSE 0.00 END) as cell_saver_cost,
            
            -- Total Cost computation
            ((COALESCE(intra.sum_rbc, 0) * 200.00) +
             (COALESCE(intra.sum_ffp, 0) * 50.00) +
             (COALESCE(intra.sum_plt, 0) * 500.00) +
             (COALESCE(intra.sum_cryo, 0) * 30.00) +
             (CASE WHEN COALESCE(intra.sum_cs, 0) > 0 THEN 225.00 ELSE 0.00 END)) as total_cost

        FROM SurgeryCase sc
        JOIN Visit v ON sc.visit_no = v.visit_no

        -- Aggregate transfusions strictly within surgery times
        LEFT JOIN (
            SELECT
                sc.visit_no,
                SUM(rbc_units) as sum_rbc,
                SUM(ffp_units) as sum_ffp,
                SUM(plt_units) as sum_plt,
                SUM(cryo_units) as sum_cryo,
                SUM(cell_saver_ml) as sum_cs,
                -- We need min/max time? No, we filter in join. 
                -- Wait, we can't easily join on time range inside a subquery if we group by visit_no unless we carry time.
                -- Actually it's easier to join Transfusion to SurgeryCase directly in the main query? 
                -- One surgery per visit? Usually yes. But let's handle via LATERAL or correlated subquery if multiple?
                -- MySQL 8.0 support lateral. But let's use a standard join approach assuming Transfusions link to Visit.
                -- To be safe given the schema doesn't link Transfusion to SurgeryCase directly, we use time range.
                -- But grouping by visit *and* time range is tricky.
                -- Let's use a correlated subquery approach for transfusions if we can, or a pre-aggregated join.
                -- Actually, since we need to match on time range, we should join Transfusion t ON t.visit_no = sc.visit_no AND t.trnsfsn_dtm BETWEEN sc.surgery_start_dtm AND sc.surgery_end_dtm.
                -- But multiple transfusions map to one case. So we need to group.
                -- So we can join a derived table that joins Transfusion and SurgeryCase on time.
               sc.case_id as case_id_ref
            FROM Transfusion t
            JOIN SurgeryCase sc ON t.visit_no = sc.visit_no 
                AND t.trnsfsn_dtm BETWEEN sc.surgery_start_dtm AND sc.surgery_end_dtm
            GROUP BY sc.case_id
        ) intra ON intra.case_id_ref = sc.case_id

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
        cursor.execute("DROP PROCEDURE IF EXISTS intelvia.materializeSurgeryCaseAttributes")
        cursor.execute(create_sql)


def drop_materialize_proc(apps, schema_editor):
    conn = schema_editor.connection
    with conn.cursor() as cursor:
        cursor.execute("DROP PROCEDURE IF EXISTS intelvia.materializeSurgeryCaseAttributes")


class Migration(migrations.Migration):
    atomic = False
    dependencies = [
        ('api', '0003_manual_view'),
    ]
    operations = [
        migrations.RunSQL(
            sql="""
            DROP TABLE IF EXISTS SurgeryCaseAttributes;

            CREATE TABLE SurgeryCaseAttributes (
                case_id BIGINT PRIMARY KEY,
                visit_no BIGINT,
                mrn varchar(20),
                surgeon_prov_id varchar(25),
                surgeon_prov_name varchar(100),
                anesth_prov_id varchar(25),
                anesth_prov_name varchar(100),
                surgery_start_dtm DATETIME,
                surgery_end_dtm DATETIME,
                case_date DATE,
                month char(8),
                quarter char(7),
                year char(4),

                pre_hgb DECIMAL(10, 4),
                pre_ferritin DECIMAL(10, 4),
                pre_plt DECIMAL(10, 4),
                pre_fibrinogen DECIMAL(10, 4),
                pre_inr DECIMAL(10, 4),

                post_hgb DECIMAL(10, 4),
                post_ferritin DECIMAL(10, 4),
                post_plt DECIMAL(10, 4),
                post_fibrinogen DECIMAL(10, 4),
                post_inr DECIMAL(10, 4),

                intraop_rbc_units SMALLINT UNSIGNED DEFAULT 0,
                intraop_ffp_units SMALLINT UNSIGNED DEFAULT 0,
                intraop_plt_units SMALLINT UNSIGNED DEFAULT 0,
                intraop_cryo_units SMALLINT UNSIGNED DEFAULT 0,
                intraop_cell_saver_ml MEDIUMINT UNSIGNED DEFAULT 0,

                los FLOAT,
                death BOOLEAN,
                vent BOOLEAN,
                stroke BOOLEAN,
                ecmo BOOLEAN,

                rbc_cost DECIMAL(8,2),
                ffp_cost DECIMAL(8,2),
                plt_cost DECIMAL(8,2),
                cryo_cost DECIMAL(8,2),
                cell_saver_cost DECIMAL(8,2),
                total_cost DECIMAL(10,2),

                FOREIGN KEY (visit_no) REFERENCES Visit(visit_no) ON DELETE CASCADE,
                FOREIGN KEY (mrn) REFERENCES Patient(mrn) ON DELETE CASCADE
            ) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS SurgeryCaseAttributes;
            """
        ),
        migrations.RunPython(create_materialize_proc, reverse_code=drop_materialize_proc),
        migrations.RunSQL(
            sql="""
            CREATE EVENT IF NOT EXISTS updateSurgeryCaseAttributesEvent
            ON SCHEDULE EVERY 1 DAY
            STARTS (CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 4 HOUR + INTERVAL 30 MINUTE)
            DO CALL intelvia.materializeSurgeryCaseAttributes();
            """,
            reverse_sql="""
            DROP EVENT IF EXISTS updateSurgeryCaseAttributesEvent;
            """
        )
    ]
