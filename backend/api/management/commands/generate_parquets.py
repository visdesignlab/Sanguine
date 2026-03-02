from collections import defaultdict
import json
from datetime import date, datetime, time, timezone
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection

from api.views.utils.cpt_hierarchy import get_cpt_hierarchy, normalize_cpt_code


def coerce_temporal_value_to_utc(value):
    if value is None:
        return None

    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    if isinstance(value, date):
        return datetime.combine(value, time.min, tzinfo=timezone.utc)

    return value


def get_visit_attributes_schema() -> pa.Schema:
    return pa.schema([
        pa.field("visit_no", pa.int64(), nullable=False),
        pa.field("mrn", pa.string(), nullable=False),
        pa.field("adm_dtm", pa.timestamp('us', tz='UTC'), nullable=True),
        pa.field("dsch_dtm", pa.timestamp('us', tz='UTC'), nullable=True),
        pa.field("age_at_adm", pa.uint16(), nullable=True),
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
        pa.field("los", pa.decimal128(6, 2), nullable=True),
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


def get_visit_attributes_select_columns() -> list[str]:
    return [
        field.name
        for field in get_visit_attributes_schema()
        if field.name not in ("department_ids", "procedure_ids")
    ]


def get_surgery_case_attributes_schema() -> pa.Schema:
    return pa.schema([
        pa.field("case_id", pa.int64(), nullable=False),
        pa.field("visit_no", pa.int64(), nullable=False),
        pa.field("mrn", pa.string(), nullable=True),
        pa.field("surgeon_prov_id", pa.string(), nullable=True),
        pa.field("surgeon_prov_name", pa.string(), nullable=True),
        pa.field("anesth_prov_id", pa.string(), nullable=True),
        pa.field("anesth_prov_name", pa.string(), nullable=True),
        pa.field("surgery_start_dtm", pa.timestamp('us', tz='UTC'), nullable=True),
        pa.field("surgery_end_dtm", pa.timestamp('us', tz='UTC'), nullable=True),
        pa.field("case_date", pa.timestamp('us', tz='UTC'), nullable=True),
        pa.field("month", pa.string(), nullable=True),
        pa.field("quarter", pa.string(), nullable=True),
        pa.field("year", pa.string(), nullable=True),
        pa.field("pre_hgb", pa.float32(), nullable=True),
        pa.field("pre_plt", pa.float32(), nullable=True),
        pa.field("pre_fibrinogen", pa.float32(), nullable=True),
        pa.field("pre_inr", pa.float32(), nullable=True),
        pa.field("post_hgb", pa.float32(), nullable=True),
        pa.field("post_plt", pa.float32(), nullable=True),
        pa.field("post_fibrinogen", pa.float32(), nullable=True),
        pa.field("post_inr", pa.float32(), nullable=True),
        pa.field("intraop_rbc_units", pa.uint16(), nullable=True),
        pa.field("intraop_ffp_units", pa.uint16(), nullable=True),
        pa.field("intraop_plt_units", pa.uint16(), nullable=True),
        pa.field("intraop_cryo_units", pa.uint16(), nullable=True),
        pa.field("intraop_whole_units", pa.uint16(), nullable=True),
        pa.field("intraop_cell_saver_ml", pa.uint32(), nullable=True),
        pa.field("los", pa.float32(), nullable=True),
        pa.field("death", pa.bool_(), nullable=True),
        pa.field("vent", pa.bool_(), nullable=True),
        pa.field("stroke", pa.bool_(), nullable=True),
        pa.field("ecmo", pa.bool_(), nullable=True),
        pa.field("rbc_cost", pa.float32(), nullable=True),
        pa.field("ffp_cost", pa.float32(), nullable=True),
        pa.field("plt_cost", pa.float32(), nullable=True),
        pa.field("cryo_cost", pa.float32(), nullable=True),
        pa.field("whole_cost", pa.float32(), nullable=True),
        pa.field("cell_saver_cost", pa.float32(), nullable=True),
        pa.field("total_cost", pa.float32(), nullable=True),
    ])


def build_visit_cpt_dimensions(
    code_map: dict[str, tuple[str, str, str, str]],
    billing_fetch_batch_size: int = 50000,
) -> tuple[dict[int, list[str]], dict[int, list[str]]]:
    visit_departments: dict[int, set[str]] = defaultdict(set)
    visit_procedures: dict[int, set[str]] = defaultdict(set)
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT visit_no, cpt_code
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

    return (
        {visit_no: sorted(department_ids) for visit_no, department_ids in visit_departments.items()},
        {visit_no: sorted(procedure_ids) for visit_no, procedure_ids in visit_procedures.items()},
    )


def build_visit_counts(
    visit_dimensions: dict[int, list[str]],
    eligible_visit_numbers: set[int] | None = None,
) -> dict[str, int]:
    dimension_visit_counts: dict[str, int] = defaultdict(int)
    for visit_no, dimension_ids in visit_dimensions.items():
        if eligible_visit_numbers is not None and visit_no not in eligible_visit_numbers:
            continue
        for dimension_id in dimension_ids:
            dimension_visit_counts[dimension_id] += 1
    return dict(dimension_visit_counts)


def fetch_materialized_visit_numbers(fetch_batch_size: int) -> set[int]:
    visit_numbers: set[int] = set()
    with connection.cursor() as cursor:
        cursor.execute("SELECT DISTINCT visit_no FROM VisitAttributes")
        while True:
            rows = cursor.fetchmany(fetch_batch_size)
            if not rows:
                break
            for row in rows:
                visit_numbers.add(row[0])
    return visit_numbers


def build_procedure_hierarchy_payload(
    hierarchy_departments,
    visit_departments: dict[int, list[str]],
    visit_procedures: dict[int, list[str]],
    eligible_visit_numbers: set[int] | None = None,
) -> dict:
    department_visit_counts = build_visit_counts(visit_departments, eligible_visit_numbers)
    procedure_visit_counts = build_visit_counts(visit_procedures, eligible_visit_numbers)

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


def normalize_visit_attributes_row(
    row: dict[str, Any],
    nullable_bool_fields: tuple[str, ...],
    required_bool_fields: tuple[str, ...],
) -> dict[str, Any]:
    row["los"] = float(row["los"]) if row["los"] is not None else None
    for field_name in nullable_bool_fields:
        value = row[field_name]
        row[field_name] = None if value is None else bool(value)
    for field_name in required_bool_fields:
        row[field_name] = bool(row[field_name])
    return row


def write_visit_attributes_parquet(
    file_path: Path,
    visit_departments: dict[int, list[str]],
    visit_procedures: dict[int, list[str]],
    fetch_batch_size: int,
    nullable_bool_fields: tuple[str, ...],
    required_bool_fields: tuple[str, ...],
) -> None:
    schema = get_visit_attributes_schema()
    select_columns = get_visit_attributes_select_columns()
    writer = pq.ParquetWriter(file_path, schema=schema)
    try:
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT {', '.join(select_columns)} FROM VisitAttributes")
            columns = [col[0] for col in cursor.description]

            while True:
                rows = cursor.fetchmany(fetch_batch_size)
                if not rows:
                    break

                visits = []
                for row in rows:
                    visit = dict(zip(columns, row))
                    visit = normalize_visit_attributes_row(
                        row=visit,
                        nullable_bool_fields=nullable_bool_fields,
                        required_bool_fields=required_bool_fields,
                    )
                    visit_no = visit["visit_no"]
                    visit["department_ids"] = visit_departments.get(visit_no, [])
                    visit["procedure_ids"] = visit_procedures.get(visit_no, [])
                    visits.append(visit)

                if visits:
                    visit_table = build_visit_attributes_table(visits)
                    writer.write_table(visit_table)
    finally:
        writer.close()


def normalize_surgery_case_attributes_row(
    row: dict[str, Any],
    float_fields: tuple[str, ...],
    nullable_bool_fields: tuple[str, ...],
    temporal_fields: tuple[str, ...],
) -> dict[str, Any]:
    row["los"] = float(row["los"]) if row["los"] is not None else None
    for field_name in float_fields:
        row[field_name] = float(row[field_name]) if row[field_name] is not None else None
    for field_name in nullable_bool_fields:
        value = row[field_name]
        row[field_name] = None if value is None else bool(value)
    for field_name in temporal_fields:
        row[field_name] = coerce_temporal_value_to_utc(row.get(field_name))
    return row


def write_surgery_case_attributes_parquet(
    file_path: Path,
    fetch_batch_size: int,
    float_fields: tuple[str, ...],
    nullable_bool_fields: tuple[str, ...],
    temporal_fields: tuple[str, ...],
) -> None:
    schema = get_surgery_case_attributes_schema()
    writer = pq.ParquetWriter(file_path, schema=schema)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM SurgeryCaseAttributes")
            columns = [col[0] for col in cursor.description]

            while True:
                rows = cursor.fetchmany(fetch_batch_size)
                if not rows:
                    break

                cases = []
                for row in rows:
                    case = dict(zip(columns, row))
                    case = normalize_surgery_case_attributes_row(
                        row=case,
                        float_fields=float_fields,
                        nullable_bool_fields=nullable_bool_fields,
                        temporal_fields=temporal_fields,
                    )
                    cases.append(case)

                if cases:
                    writer.write_table(pa.Table.from_pylist(cases, schema=schema))
    finally:
        writer.close()


class Command(BaseCommand):
    help = "Generate a Parquet cache of the database data"
    GENERATE_CHOICES = ("all", "visit_attributes", "procedure_hierarchy", "surgery_cases")
    BILLING_FETCH_BATCH_SIZE = 50000
    VISIT_FETCH_BATCH_SIZE = 50000
    SURGERY_FETCH_BATCH_SIZE = 50000
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
    SURGERY_FLOAT_FIELDS = (
        "pre_hgb",
        "pre_plt",
        "pre_fibrinogen",
        "pre_inr",
        "post_hgb",
        "post_plt",
        "post_fibrinogen",
        "post_inr",
        "rbc_cost",
        "ffp_cost",
        "plt_cost",
        "cryo_cost",
        "whole_cost",
        "cell_saver_cost",
        "total_cost",
    )
    SURGERY_NULLABLE_BOOL_FIELDS = ("death", "vent", "stroke", "ecmo")
    SURGERY_TEMPORAL_FIELDS = ("surgery_start_dtm", "surgery_end_dtm", "case_date")

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
        parser.add_argument(
            "--skip-materialize",
            action="store_true",
            help="Skip calling materializeVisitAttributes() before cache generation.",
        )

    def handle(self, *args, **kwargs):
        generate_target = kwargs["generate"]
        skip_materialize = kwargs["skip_materialize"]
        should_generate_visit_attributes = generate_target in ("all", "visit_attributes")
        should_generate_procedure_hierarchy = generate_target in ("all", "procedure_hierarchy")
        should_generate_surgery_cases = generate_target in ("all", "surgery_cases")

        cache_dir = Path(settings.BASE_DIR) / "parquet_cache"
        cache_dir.mkdir(exist_ok=True)
        visit_file_path = cache_dir / "visit_attributes.parquet"
        temp_visit_file_path = cache_dir / "visit_attributes.parquet.tmp"
        procedure_hierarchy_file_path = cache_dir / "procedure_hierarchy.json"
        temp_procedure_hierarchy_file_path = cache_dir / "procedure_hierarchy.json.tmp"

        surgery_file_path = cache_dir / "surgery_case_attributes.parquet"
        temp_surgery_file_path = cache_dir / "surgery_case_attributes.parquet.tmp"

        hierarchy = None
        visit_departments: dict[int, list[str]] = {}
        visit_procedures: dict[int, list[str]] = {}
        if should_generate_visit_attributes or should_generate_procedure_hierarchy:
            if not skip_materialize:
                with connection.cursor() as cursor:
                    cursor.execute("CALL materializeVisitAttributes()")
                self.stdout.write(self.style.SUCCESS("Successfully materialized VisitAttributes."))
            else:
                self.stdout.write("Skipping VisitAttributes materialization.")

            hierarchy = get_cpt_hierarchy()
            visit_departments, visit_procedures = build_visit_cpt_dimensions(
                code_map=hierarchy.code_map,
                billing_fetch_batch_size=self.BILLING_FETCH_BATCH_SIZE,
            )

        if should_generate_surgery_cases:
            with connection.cursor() as cursor:
                cursor.execute("CALL materializeSurgeryCaseAttributes()")
            self.stdout.write(self.style.SUCCESS("Successfully materialized SurgeryCaseAttributes."))

        procedure_hierarchy_payload = None
        if should_generate_procedure_hierarchy:
            eligible_visit_numbers = fetch_materialized_visit_numbers(self.VISIT_FETCH_BATCH_SIZE)
            procedure_hierarchy_payload = build_procedure_hierarchy_payload(
                hierarchy_departments=hierarchy.departments,
                visit_departments=visit_departments,
                visit_procedures=visit_procedures,
                eligible_visit_numbers=eligible_visit_numbers,
            )

        try:
            if should_generate_visit_attributes:
                write_visit_attributes_parquet(
                    file_path=temp_visit_file_path,
                    visit_departments=visit_departments,
                    visit_procedures=visit_procedures,
                    fetch_batch_size=self.VISIT_FETCH_BATCH_SIZE,
                    nullable_bool_fields=self.NULLABLE_BOOL_FIELDS,
                    required_bool_fields=self.REQUIRED_BOOL_FIELDS,
                )
            if should_generate_procedure_hierarchy:
                temp_procedure_hierarchy_file_path.write_text(
                    json.dumps(procedure_hierarchy_payload, separators=(",", ":")),
                    encoding="utf-8",
                )
            if should_generate_surgery_cases:
                write_surgery_case_attributes_parquet(
                    file_path=temp_surgery_file_path,
                    fetch_batch_size=self.SURGERY_FETCH_BATCH_SIZE,
                    float_fields=self.SURGERY_FLOAT_FIELDS,
                    nullable_bool_fields=self.SURGERY_NULLABLE_BOOL_FIELDS,
                    temporal_fields=self.SURGERY_TEMPORAL_FIELDS,
                )

            if should_generate_visit_attributes:
                temp_visit_file_path.replace(visit_file_path)
            if should_generate_procedure_hierarchy:
                temp_procedure_hierarchy_file_path.replace(procedure_hierarchy_file_path)
            if should_generate_surgery_cases:
                temp_surgery_file_path.replace(surgery_file_path)
        finally:
            if temp_visit_file_path.exists():
                temp_visit_file_path.unlink()
            if temp_procedure_hierarchy_file_path.exists():
                temp_procedure_hierarchy_file_path.unlink()
            if temp_surgery_file_path.exists():
                temp_surgery_file_path.unlink()

        if should_generate_visit_attributes:
            self.stdout.write(self.style.SUCCESS(f"Parquet file generated at {visit_file_path}"))
        if should_generate_procedure_hierarchy:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Procedure hierarchy cache generated at {procedure_hierarchy_file_path}"
                )
            )
        if should_generate_surgery_cases:
            self.stdout.write(self.style.SUCCESS(f"Parquet file generated at {surgery_file_path}"))
