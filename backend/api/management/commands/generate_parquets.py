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

from django.utils.text import slugify


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
        pa.field("los", pa.float32(), nullable=True),
        pa.field("death", pa.bool_(), nullable=True),
        pa.field("vent", pa.bool_(), nullable=True),
        pa.field("stroke", pa.bool_(), nullable=True),
        pa.field("ecmo", pa.bool_(), nullable=True),
        pa.field("b12", pa.bool_(), nullable=True),
        pa.field("iron", pa.bool_(), nullable=True),
        pa.field("antifibrinolytic", pa.bool_(), nullable=True),
        pa.field("rbc_units_adherent", pa.uint16(), nullable=False),
        pa.field("ffp_units_adherent", pa.uint16(), nullable=False),
        pa.field("plt_units_adherent", pa.uint16(), nullable=False),
        pa.field("cryo_units_adherent", pa.uint16(), nullable=False),
        pa.field("overall_units_adherent", pa.uint16(), nullable=False),
        pa.field("attending_provider", pa.string(), nullable=True),
        pa.field("attending_provider_id", pa.string(), nullable=True),
        pa.field("attending_provider_line", pa.uint16(), nullable=False),
        pa.field("is_admitting_attending", pa.bool_(), nullable=False),
        pa.field("department_ids", pa.list_(pa.string()), nullable=False),
    ])


def build_visit_attributes_table(rows: list[dict]) -> pa.Table:
    schema = get_visit_attributes_schema()

    normalized_rows: list[dict] = []
    for row_index, row in enumerate(rows):
        normalized_row = dict(row)
        # Defensive normalization: database DATE values must be upgraded to UTC datetimes.
        for field_name in ("adm_dtm", "dsch_dtm"):
            normalized_row[field_name] = coerce_temporal_value_to_utc(normalized_row.get(field_name))

        for field in schema:
            if field.nullable:
                continue
            if normalized_row.get(field.name) is None:
                raise ValueError(
                    f"Row {row_index} has null for non-nullable field '{field.name}'",
                )
        normalized_rows.append(normalized_row)

    try:
        return pa.Table.from_pylist(normalized_rows, schema=schema)
    except (pa.ArrowInvalid, getattr(pa, "ArrowTypeError", TypeError), TypeError, ValueError) as exc:
        # Surface the first offending field/value to make production debugging practical.
        for row_index, row in enumerate(normalized_rows):
            for field in schema:
                value = row.get(field.name)
                try:
                    pa.array([value], type=field.type)
                except Exception as field_exc:  # noqa: BLE001 - include exact value/type context.
                    raise ValueError(
                        "Failed to coerce VisitAttributes value for parquet: "
                        f"row={row_index}, field='{field.name}', "
                        f"value={value!r}, value_type={type(value).__name__}, "
                        f"expected_arrow_type={field.type}",
                    ) from field_exc
        raise


def get_visit_attributes_select_columns() -> list[str]:
    return [
        field.name
        for field in get_visit_attributes_schema()
        if field.name != "department_ids"
    ]


def get_department_encounter_attributes_schema() -> pa.Schema:
    return pa.schema([
        pa.field("visit_no",            pa.int64(),  nullable=False),
        pa.field("attend_prov_line",    pa.uint16(), nullable=False),
        pa.field("department_id",       pa.string(), nullable=False),
        pa.field("department_name",     pa.string(), nullable=False),
        pa.field("rbc_units",           pa.uint16(), nullable=False),
        pa.field("ffp_units",           pa.uint16(), nullable=False),
        pa.field("plt_units",           pa.uint16(), nullable=False),
        pa.field("cryo_units",          pa.uint16(), nullable=False),
        pa.field("whole_units",         pa.uint16(), nullable=False),
        pa.field("cell_saver_ml",       pa.uint32(), nullable=False),
        pa.field("rbc_units_adherent",  pa.uint16(), nullable=False),
        pa.field("ffp_units_adherent",  pa.uint16(), nullable=False),
        pa.field("plt_units_adherent",  pa.uint16(), nullable=False),
        pa.field("cryo_units_adherent", pa.uint16(), nullable=False),
    ])


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


def build_visit_roomtrace_departments(
    fetch_batch_size: int = 50000,
) -> dict[int, list[str]]:
    """Return visit_departments: dict[visit_no -> sorted list of slugified service_in_desc].
    Each entry represents the real hospital departments a patient passed through."""
    visit_departments: dict[int, set[str]] = defaultdict(set)
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT DISTINCT visit_no, service_in_desc
            FROM RoomTrace
            WHERE service_in_desc IS NOT NULL AND service_in_desc <> ''
            """
        )
        while True:
            rows = cursor.fetchmany(fetch_batch_size)
            if not rows:
                break
            for visit_no, service_in_desc in rows:
                dept_id = slugify(service_in_desc)
                if dept_id:
                    visit_departments[visit_no].add(dept_id)
    return {visit_no: sorted(dept_ids) for visit_no, dept_ids in visit_departments.items()}


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


def build_department_hierarchy_payload(
    visit_departments: dict[int, list[str]],
    eligible_visit_numbers: set[int] | None = None,
) -> dict:
    """Return a flat list of real hospital departments with visit counts, sourced from RoomTrace."""
    department_visit_counts = build_visit_counts(visit_departments, eligible_visit_numbers)

    # Fetch canonical display names from ProviderDepartment (each dept_id maps to one name).
    dept_names: dict[str, str] = {}
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT DISTINCT department_id, department_name FROM ProviderDepartment"
        )
        for dept_id, dept_name in cursor.fetchall():
            dept_names[dept_id] = dept_name

    departments = []
    for dept_id, visit_count in sorted(department_visit_counts.items(), key=lambda x: -x[1]):
        if visit_count == 0:
            continue
        departments.append({
            "id": dept_id,
            "name": dept_names.get(dept_id, dept_id),
            "visit_count": visit_count,
        })

    return {
        "version": datetime.now(timezone.utc).strftime("%Y-%m-%d.%H%M%S"),
        "source": "roomtrace",
        "departments": departments,
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
                    visits.append(visit)

                if visits:
                    visit_table = build_visit_attributes_table(visits)
                    writer.write_table(visit_table)
    finally:
        writer.close()


def write_department_encounter_attributes_parquet(
    file_path: Path,
    fetch_batch_size: int,
) -> None:
    schema = get_department_encounter_attributes_schema()
    select_cols = [f.name for f in schema]
    writer = pq.ParquetWriter(file_path, schema=schema)
    uint_fields = (
        "rbc_units", "ffp_units", "plt_units", "cryo_units", "whole_units",
        "rbc_units_adherent", "ffp_units_adherent", "plt_units_adherent", "cryo_units_adherent",
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT {', '.join(select_cols)} FROM DepartmentEncounterAttributes")
            columns = [col[0] for col in cursor.description]
            while True:
                rows = cursor.fetchmany(fetch_batch_size)
                if not rows:
                    break
                records = []
                for row in rows:
                    rec = dict(zip(columns, row))
                    for field_name in uint_fields:
                        rec[field_name] = int(rec[field_name]) if rec[field_name] is not None else 0
                    rec["cell_saver_ml"] = int(rec["cell_saver_ml"]) if rec["cell_saver_ml"] is not None else 0
                    rec["visit_no"] = int(rec["visit_no"])
                    rec["attend_prov_line"] = int(rec["attend_prov_line"])
                    records.append(rec)
                if records:
                    writer.write_table(pa.Table.from_pylist(records, schema=schema))
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
    GENERATE_CHOICES = ("all", "visit_attributes", "department_hierarchy", "surgery_cases", "department_encounter_attributes")
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
                "all, visit_attributes, department_hierarchy, surgery_cases, department_encounter_attributes."
            ),
        )

    def handle(self, *args, **kwargs):
        generate_target = kwargs["generate"]
        should_generate_visit_attributes = generate_target in ("all", "visit_attributes")
        should_generate_department_hierarchy = generate_target in ("all", "department_hierarchy")
        should_generate_surgery_cases = generate_target in ("all", "surgery_cases")
        should_generate_department_encounter_attributes = generate_target in (
            "all", "department_encounter_attributes"
        )

        cache_dir = Path(settings.BASE_DIR) / "parquet_cache"
        cache_dir.mkdir(exist_ok=True)
        visit_file_path = cache_dir / "visit_attributes.parquet"
        temp_visit_file_path = cache_dir / "visit_attributes.parquet.tmp"
        department_hierarchy_file_path = cache_dir / "department_hierarchy.json"
        temp_department_hierarchy_file_path = cache_dir / "department_hierarchy.json.tmp"
        surgery_file_path = cache_dir / "surgery_case_attributes.parquet"
        temp_surgery_file_path = cache_dir / "surgery_case_attributes.parquet.tmp"
        dept_enc_file_path = cache_dir / "department_encounter_attributes.parquet"
        temp_dept_enc_file_path = cache_dir / "department_encounter_attributes.parquet.tmp"

        visit_departments: dict[int, list[str]] = {}
        if should_generate_visit_attributes or should_generate_department_hierarchy:
            visit_departments = build_visit_roomtrace_departments(
                fetch_batch_size=self.BILLING_FETCH_BATCH_SIZE,
            )

        department_hierarchy_payload = None
        if should_generate_department_hierarchy:
            eligible_visit_numbers = fetch_materialized_visit_numbers(self.VISIT_FETCH_BATCH_SIZE)
            department_hierarchy_payload = build_department_hierarchy_payload(
                visit_departments=visit_departments,
                eligible_visit_numbers=eligible_visit_numbers,
            )

        try:
            if should_generate_visit_attributes:
                write_visit_attributes_parquet(
                    file_path=temp_visit_file_path,
                    visit_departments=visit_departments,
                    fetch_batch_size=self.VISIT_FETCH_BATCH_SIZE,
                    nullable_bool_fields=self.NULLABLE_BOOL_FIELDS,
                    required_bool_fields=self.REQUIRED_BOOL_FIELDS,
                )
            if should_generate_department_hierarchy:
                temp_department_hierarchy_file_path.write_text(
                    json.dumps(department_hierarchy_payload, separators=(",", ":")),
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
            if should_generate_department_encounter_attributes:
                write_department_encounter_attributes_parquet(
                    file_path=temp_dept_enc_file_path,
                    fetch_batch_size=self.VISIT_FETCH_BATCH_SIZE,
                )

            if should_generate_visit_attributes:
                temp_visit_file_path.replace(visit_file_path)
            if should_generate_department_hierarchy:
                temp_department_hierarchy_file_path.replace(department_hierarchy_file_path)
            if should_generate_surgery_cases:
                temp_surgery_file_path.replace(surgery_file_path)
            if should_generate_department_encounter_attributes:
                temp_dept_enc_file_path.replace(dept_enc_file_path)
        finally:
            for tmp in (
                temp_visit_file_path,
                temp_department_hierarchy_file_path,
                temp_surgery_file_path,
                temp_dept_enc_file_path,
            ):
                if tmp.exists():
                    tmp.unlink()

        if should_generate_visit_attributes:
            self.stdout.write(self.style.SUCCESS(f"Parquet file generated at {visit_file_path}"))
        if should_generate_department_hierarchy:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Department hierarchy cache generated at {department_hierarchy_file_path}"
                )
            )
        if should_generate_surgery_cases:
            self.stdout.write(self.style.SUCCESS(f"Parquet file generated at {surgery_file_path}"))
        if should_generate_department_encounter_attributes:
            self.stdout.write(self.style.SUCCESS(f"Parquet file generated at {dept_enc_file_path}"))
