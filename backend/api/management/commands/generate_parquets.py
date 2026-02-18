from collections import defaultdict
import json
from datetime import datetime, timezone
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection

from api.views.utils.cpt_hierarchy import get_cpt_hierarchy, normalize_cpt_code


def get_visit_attributes_schema() -> pa.Schema:
    return pa.schema([
        pa.field("visit_no", pa.int64(), nullable=False),
        pa.field("mrn", pa.string(), nullable=False),
        pa.field("adm_dtm", pa.date32(), nullable=True),
        pa.field("dsch_dtm", pa.date32(), nullable=True),
        pa.field("age_at_adm", pa.uint8(), nullable=True),
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
        pa.field("death", pa.bool_(), nullable=True),
        pa.field("vent", pa.bool_(), nullable=True),
        pa.field("stroke", pa.bool_(), nullable=True),
        pa.field("ecmo", pa.bool_(), nullable=True),
        pa.field("b12", pa.bool_(), nullable=True),
        pa.field("iron", pa.bool_(), nullable=True),
        pa.field("antifibrinolytic", pa.bool_(), nullable=True),
        pa.field("rbc_adherent", pa.uint16(), nullable=False),
        pa.field("ffp_adherent", pa.uint16(), nullable=False),
        pa.field("plt_adherent", pa.uint16(), nullable=False),
        pa.field("cryo_adherent", pa.uint16(), nullable=False),
        pa.field("overall_adherent", pa.uint16(), nullable=False),
        pa.field("attending_provider", pa.string(), nullable=True),
        pa.field("attending_provider_id", pa.string(), nullable=True),
        pa.field("attending_provider_line", pa.uint16(), nullable=False),
        pa.field("is_admitting_attending", pa.bool_(), nullable=False),
        pa.field("department_ids", pa.list_(pa.string()), nullable=False),
        pa.field("procedure_ids", pa.list_(pa.string()), nullable=False),
    ])


def build_visit_attributes_table(rows: list[dict]) -> pa.Table:
    schema = get_visit_attributes_schema()

    for row_index, row in enumerate(rows):
        for field in schema:
            if field.nullable:
                continue
            if row.get(field.name) is None:
                raise ValueError(
                    f"Row {row_index} has null for non-nullable field '{field.name}'",
                )

    return pa.Table.from_pylist(rows, schema=schema)


def attach_cpt_dimensions(
    rows: list[dict],
    code_map: dict[str, tuple[str, str, str, str]],
    billing_fetch_batch_size: int = 50000,
) -> list[dict]:
    visit_departments: dict[int, set[str]] = defaultdict(set)
    visit_procedures: dict[int, set[str]] = defaultdict(set)

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT DISTINCT visit_no, cpt_code
            FROM BillingCode
            WHERE cpt_code IS NOT NULL AND cpt_code <> ''
            """
        )

        while True:
            billing_rows = cursor.fetchmany(billing_fetch_batch_size)
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

    for row in rows:
        visit_no = row["visit_no"]
        row["department_ids"] = sorted(visit_departments.get(visit_no, set()))
        row["procedure_ids"] = sorted(visit_procedures.get(visit_no, set()))

    return rows


def build_procedure_hierarchy_payload(
    rows: list[dict],
    hierarchy_departments,
) -> dict:
    visit_departments: dict[int, set[str]] = defaultdict(set)
    visit_procedures: dict[int, set[str]] = defaultdict(set)

    for row in rows:
        visit_no = row["visit_no"]
        visit_departments[visit_no].update(row.get("department_ids", []))
        visit_procedures[visit_no].update(row.get("procedure_ids", []))

    department_visit_counts: dict[str, int] = defaultdict(int)
    for department_ids in visit_departments.values():
        for department_id in department_ids:
            department_visit_counts[department_id] += 1

    procedure_visit_counts: dict[str, int] = defaultdict(int)
    for procedure_ids in visit_procedures.values():
        for procedure_id in procedure_ids:
            procedure_visit_counts[procedure_id] += 1

    procedure_hierarchy_departments = []
    for department in hierarchy_departments:
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

    return {
        "version": datetime.now(timezone.utc).strftime("%Y-%m-%d.%H%M%S"),
        "source": "cpt-code-mapping.csv",
        "department_level": "department",
        "procedure_level": "procedure",
        "departments": procedure_hierarchy_departments,
    }


class Command(BaseCommand):
    help = "Generate a Parquet cache of the database data"
    GENERATE_CHOICES = ("all", "visit_attributes", "procedure_hierarchy")
    BILLING_FETCH_BATCH_SIZE = 50000
    NULLABLE_BOOL_FIELDS = (
        "death",
        "vent",
        "stroke",
        "ecmo",
        "b12",
        "iron",
        "antifibrinolytic",
    )
    REQUIRED_BOOL_FIELDS = ("is_admitting_attending",)

    def add_arguments(self, parser):
        parser.add_argument(
            "--generate",
            choices=self.GENERATE_CHOICES,
            default="all",
            help=(
                "Select which cache artifacts to generate: "
                "all, visit_attributes, procedure_hierarchy."
            ),
        )

    def handle(self, *args, **kwargs):
        generate_target = kwargs["generate"]
        should_generate_visit_attributes = generate_target in ("all", "visit_attributes")
        should_generate_procedure_hierarchy = generate_target in ("all", "procedure_hierarchy")

        cache_dir = Path(settings.BASE_DIR) / "parquet_cache"
        cache_dir.mkdir(exist_ok=True)
        visit_file_path = cache_dir / "visit_attributes.parquet"
        temp_visit_file_path = cache_dir / "visit_attributes.parquet.tmp"
        procedure_hierarchy_file_path = cache_dir / "procedure_hierarchy.json"
        temp_procedure_hierarchy_file_path = cache_dir / "procedure_hierarchy.json.tmp"

        with connection.cursor() as cursor:
            cursor.execute("CALL materializeVisitAttributes()")
            self.stdout.write(self.style.SUCCESS("Successfully materialized VisitAttributes."))

            cursor.execute("SELECT * FROM VisitAttributes")
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            visits = [dict(zip(columns, row)) for row in rows]
            for visit in visits:
                visit["los"] = float(visit["los"]) if visit["los"] is not None else None
                for field_name in self.NULLABLE_BOOL_FIELDS:
                    value = visit[field_name]
                    visit[field_name] = None if value is None else bool(value)
                for field_name in self.REQUIRED_BOOL_FIELDS:
                    visit[field_name] = bool(visit[field_name])

        hierarchy = get_cpt_hierarchy()
        visits = attach_cpt_dimensions(
            rows=visits,
            code_map=hierarchy.code_map,
            billing_fetch_batch_size=self.BILLING_FETCH_BATCH_SIZE,
        )

        visit_table = None
        if should_generate_visit_attributes:
            visit_table = build_visit_attributes_table(visits)

        procedure_hierarchy_payload = None
        if should_generate_procedure_hierarchy:
            procedure_hierarchy_payload = build_procedure_hierarchy_payload(
                rows=visits,
                hierarchy_departments=hierarchy.departments,
            )

        try:
            if should_generate_visit_attributes:
                pq.write_table(visit_table, temp_visit_file_path)
            if should_generate_procedure_hierarchy:
                temp_procedure_hierarchy_file_path.write_text(
                    json.dumps(procedure_hierarchy_payload, separators=(",", ":")),
                    encoding="utf-8",
                )
            if should_generate_visit_attributes:
                temp_visit_file_path.replace(visit_file_path)
            if should_generate_procedure_hierarchy:
                temp_procedure_hierarchy_file_path.replace(procedure_hierarchy_file_path)
        finally:
            if temp_visit_file_path.exists():
                temp_visit_file_path.unlink()
            if temp_procedure_hierarchy_file_path.exists():
                temp_procedure_hierarchy_file_path.unlink()

        if should_generate_visit_attributes:
            self.stdout.write(self.style.SUCCESS(f"Parquet file generated at {visit_file_path}"))
        if should_generate_procedure_hierarchy:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Procedure hierarchy cache generated at {procedure_hierarchy_file_path}"
                )
            )
