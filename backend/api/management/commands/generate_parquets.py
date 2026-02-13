from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import connection
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone
import json
import pyarrow as pa
import pyarrow.parquet as pq

from api.views.utils.cpt_hierarchy import get_cpt_hierarchy, normalize_cpt_code


class Command(BaseCommand):
    help = "Generate a Parquet cache of the database data"
    BILLING_FETCH_BATCH_SIZE = 50000

    def handle(self, *args, **kwargs):
        # Define output path
        cache_dir = Path(settings.BASE_DIR) / "parquet_cache"
        cache_dir.mkdir(exist_ok=True)
        visit_file_path = cache_dir / "visit_attributes.parquet"
        procedure_hierarchy_file_path = cache_dir / "procedure_hierarchy.json"

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

            hierarchy = get_cpt_hierarchy()
            code_map = hierarchy.code_map

            visit_departments: dict[int, set[str]] = defaultdict(set)
            visit_procedures: dict[int, set[str]] = defaultdict(set)

            cursor.execute(
                """
                SELECT DISTINCT visit_no, cpt_code
                FROM BillingCode
                WHERE cpt_code IS NOT NULL AND cpt_code <> ''
                """
            )

            while True:
                billing_rows = cursor.fetchmany(self.BILLING_FETCH_BATCH_SIZE)
                if not billing_rows:
                    break

                for visit_no, raw_cpt_code in billing_rows:
                    normalized_cpt_code = normalize_cpt_code(raw_cpt_code)
                    if not normalized_cpt_code:
                        continue
                    mapped = code_map.get(normalized_cpt_code)
                    if not mapped:
                        continue

                    department_id, _department_name, procedure_id, _procedure_name = mapped
                    visit_departments[visit_no].add(department_id)
                    visit_procedures[visit_no].add(procedure_id)

            department_visit_counts: dict[str, int] = defaultdict(int)
            for department_ids in visit_departments.values():
                for department_id in department_ids:
                    department_visit_counts[department_id] += 1

            procedure_visit_counts: dict[str, int] = defaultdict(int)
            for procedure_ids in visit_procedures.values():
                for procedure_id in procedure_ids:
                    procedure_visit_counts[procedure_id] += 1

            procedure_hierarchy_departments = []
            for department in hierarchy.departments:
                procedure_payload = []
                for procedure in department.procedures:
                    procedure_visit_count = procedure_visit_counts.get(procedure.id, 0)
                    if procedure_visit_count == 0:
                        continue
                    procedure_payload.append(
                        {
                            "id": procedure.id,
                            "name": procedure.name,
                            "visit_count": procedure_visit_count,
                            "cpt_codes": list(procedure.cpt_codes),
                        }
                    )

                if not procedure_payload:
                    continue

                procedure_hierarchy_departments.append(
                    {
                        "id": department.id,
                        "name": department.name,
                        "visit_count": department_visit_counts.get(department.id, 0),
                        "procedures": procedure_payload,
                    }
                )

            for v in visits:
                visit_no = v["visit_no"]
                v["department_ids"] = sorted(visit_departments.get(visit_no, set()))
                v["procedure_ids"] = sorted(visit_procedures.get(visit_no, set()))

        procedure_hierarchy_payload = {
            "version": datetime.now(timezone.utc).strftime("%Y-%m-%d.%H%M%S"),
            "source": "cpt-code-mapping.csv",
            "department_level": "department",
            "procedure_level": "procedure",
            "departments": procedure_hierarchy_departments,
        }

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
            pa.field("is_admitting_attending", pa.bool8(), nullable=False),

            pa.field("department_ids", pa.list_(pa.string()), nullable=False),
            pa.field("procedure_ids", pa.list_(pa.string()), nullable=False),
        ])

        # Write Parquet file
        visit_table = pa.Table.from_pylist(visits, schema=visit_attributes_schema)

        pq.write_table(visit_table, visit_file_path)
        procedure_hierarchy_file_path.write_text(
            json.dumps(procedure_hierarchy_payload, separators=(",", ":")),
            encoding="utf-8",
        )

        self.stdout.write(self.style.SUCCESS(f"Parquet file generated at {visit_file_path}"))
        self.stdout.write(self.style.SUCCESS(f"Procedure hierarchy cache generated at {procedure_hierarchy_file_path}"))
