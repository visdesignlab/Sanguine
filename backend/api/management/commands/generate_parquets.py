from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import connection
from pathlib import Path
import pyarrow as pa
import pyarrow.parquet as pq


class Command(BaseCommand):
    help = "Generate a Parquet cache of the database data"

    def handle(self, *args, **kwargs):
        # Define output path
        cache_dir = Path(settings.BASE_DIR) / "parquet_cache"
        cache_dir.mkdir(exist_ok=True)
        visit_file_path = cache_dir / "visit_attributes.parquet"

        # Refresh the materialized view using the stored procedure
        with connection.cursor() as cursor:
            # Materialize VisitAttributes
            cursor.execute("CALL intelvia.materializeVisitAttributes()")
            self.stdout.write(self.style.SUCCESS("Successfully materialized VisitAttributes."))

            # Fetch all VisitAttributes records
            cursor.execute("SELECT * FROM VisitAttributes")
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            visits = [dict(zip(columns, row)) for row in rows]
            for v in visits:
                v["los"] = float(v["los"]) if v["los"] is not None else None

            # Materialize SurgeryCaseAttributes
            cursor.execute("CALL intelvia.materializeSurgeryCaseAttributes()")
            self.stdout.write(self.style.SUCCESS("Successfully materialized SurgeryCaseAttributes."))
            
            # Fetch all SurgeryCaseAttributes records
            cursor.execute("SELECT * FROM SurgeryCaseAttributes")
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            cases = [dict(zip(columns, row)) for row in rows]
            for c in cases:
                c["los"] = float(c["los"]) if c["los"] is not None else None
                # float decimals
                for field in ['pre_hgb', 'pre_ferritin', 'pre_plt', 'pre_fibrinogen', 'pre_inr',
                              'post_hgb', 'post_ferritin', 'post_plt', 'post_fibrinogen', 'post_inr',
                              'rbc_cost', 'ffp_cost', 'plt_cost', 'cryo_cost', 'cell_saver_cost', 'total_cost']:
                    c[field] = float(c[field]) if c[field] is not None else None

        # Define schema for visit attributes
        visit_attributes_schema = pa.schema([
            pa.field("visit_no", pa.int64(), nullable=False),
            pa.field("mrn", pa.string(), nullable=False),
            pa.field("adm_dtm", pa.date32(), nullable=True),
            pa.field("dsch_dtm", pa.date32(), nullable=True),
            pa.field("age_at_adm", pa.bool8(), nullable=True),          
            pa.field("pat_class_desc", pa.string(), nullable=True),
            pa.field("apr_drg_weight", pa.float32(), nullable=True),
            pa.field("ms_drg_weight", pa.float32(), nullable=True),

            pa.field("month", pa.string(), nullable=True),                
            pa.field("quarter", pa.string(), nullable=True),             
            pa.field("year", pa.string(), nullable=True),        

            pa.field("rbc_units", pa.uint16(), nullable=False),
            pa.field("ffp_units", pa.uint16(), nullable=False),
            pa.field("plt_units", pa.uint16(), nullable=False),
            pa.field("cryo_units", pa.uint16(), nullable=False),
            pa.field("whole_units", pa.uint16(), nullable=False),
            pa.field("cell_saver_ml", pa.uint32(), nullable=False),
            pa.field("overall_units", pa.uint16(), nullable=False),  

            pa.field("los", pa.float32(), nullable=True),
            pa.field("death", pa.bool8(), nullable=True),
            pa.field("vent", pa.bool8(), nullable=True),
            pa.field("stroke", pa.bool8(), nullable=True),
            pa.field("ecmo", pa.bool8(), nullable=True),

            pa.field("b12", pa.bool8(), nullable=True),
            pa.field("iron", pa.bool8(), nullable=True),
            pa.field("antifibrinolytic", pa.bool8(), nullable=True),

            pa.field("rbc_adherent", pa.uint16(), nullable=False),
            pa.field("ffp_adherent", pa.uint16(), nullable=False),
            pa.field("plt_adherent", pa.uint16(), nullable=False),
            pa.field("cryo_adherent", pa.uint16(), nullable=False),
            pa.field("overall_adherent", pa.uint16(), nullable=False),

            pa.field("attending_provider", pa.string(), nullable=True),
            pa.field("attending_provider_id", pa.string(), nullable=True),
            pa.field("attending_provider_line", pa.uint16(), nullable=False),
            pa.field("is_admitting_attending", pa.bool8(), nullable=False)
        ])

        # Write VisitAttributes Parquet file
        visit_table = pa.Table.from_pylist(visits, schema=visit_attributes_schema)
        pq.write_table(visit_table, visit_file_path)
        self.stdout.write(self.style.SUCCESS(f"Parquet file generated at {visit_file_path}"))

        # Define schema for surgery case attributes
        surgery_case_schema = pa.schema([
            pa.field("case_id", pa.int64(), nullable=False),
            pa.field("visit_no", pa.int64(), nullable=False),
            pa.field("mrn", pa.string(), nullable=True),
            pa.field("surgeon_prov_id", pa.string(), nullable=True),
            pa.field("anesth_prov_id", pa.string(), nullable=True),
            pa.field("surgery_start_dtm", pa.timestamp('us'), nullable=True),
            pa.field("surgery_end_dtm", pa.timestamp('us'), nullable=True),
            pa.field("case_date", pa.date32(), nullable=True),
            pa.field("month", pa.string(), nullable=True),
            pa.field("quarter", pa.string(), nullable=True),
            pa.field("year", pa.string(), nullable=True),

            pa.field("pre_hgb", pa.float32(), nullable=True),
            pa.field("pre_ferritin", pa.float32(), nullable=True),
            pa.field("pre_plt", pa.float32(), nullable=True),
            pa.field("pre_fibrinogen", pa.float32(), nullable=True),
            pa.field("pre_inr", pa.float32(), nullable=True),

            pa.field("post_hgb", pa.float32(), nullable=True),
            pa.field("post_ferritin", pa.float32(), nullable=True),
            pa.field("post_plt", pa.float32(), nullable=True),
            pa.field("post_fibrinogen", pa.float32(), nullable=True),
            pa.field("post_inr", pa.float32(), nullable=True),

            pa.field("intraop_rbc_units", pa.uint16(), nullable=True),
            pa.field("intraop_ffp_units", pa.uint16(), nullable=True),
            pa.field("intraop_plt_units", pa.uint16(), nullable=True),
            pa.field("intraop_cryo_units", pa.uint16(), nullable=True),
            pa.field("intraop_cell_saver_ml", pa.uint32(), nullable=True),

            pa.field("los", pa.float32(), nullable=True),
            pa.field("death", pa.bool8(), nullable=True),
            pa.field("vent", pa.bool8(), nullable=True),
            pa.field("stroke", pa.bool8(), nullable=True),
            pa.field("ecmo", pa.bool8(), nullable=True),

            pa.field("rbc_cost", pa.float32(), nullable=True),
            pa.field("ffp_cost", pa.float32(), nullable=True),
            pa.field("plt_cost", pa.float32(), nullable=True),
            pa.field("cryo_cost", pa.float32(), nullable=True),
            pa.field("cell_saver_cost", pa.float32(), nullable=True),
            pa.field("total_cost", pa.float32(), nullable=True),
        ])

        # Write SurgeryCaseAttributes Parquet file
        surgery_file_path = cache_dir / "surgery_case_attributes.parquet"
        surgery_table = pa.Table.from_pylist(cases, schema=surgery_case_schema)
        pq.write_table(surgery_table, surgery_file_path)
        self.stdout.write(self.style.SUCCESS(f"Parquet file generated at {surgery_file_path}"))

