from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path

from django.db import connection
from django.utils import timezone

from api.models.operations import DerivedArtifactRefresh


@dataclass(frozen=True)
class DerivedArtifact:
    artifact_name: str
    table_name: str
    schema_file_name: str
    refresh_file_name: str


@dataclass(frozen=True)
class RefreshResult:
    artifact_name: str
    table_name: str
    definition_hash: str
    row_count: int
    sql_path: Path


DERIVED_ARTIFACTS = {
    "guideline_adherence": DerivedArtifact(
        artifact_name="guideline_adherence",
        table_name="GuidelineAdherence",
        schema_file_name="guideline_adherence_schema.sql",
        refresh_file_name="guideline_adherence_refresh.sql",
    ),
    "visit_attributes": DerivedArtifact(
        artifact_name="visit_attributes",
        table_name="VisitAttributes",
        schema_file_name="visit_attributes_schema.sql",
        refresh_file_name="visit_attributes_refresh.sql",
    ),
    "surgery_case_attributes": DerivedArtifact(
        artifact_name="surgery_case_attributes",
        table_name="SurgeryCaseAttributes",
        schema_file_name="surgery_case_attributes_schema.sql",
        refresh_file_name="surgery_case_attributes_refresh.sql",
    ),
}

DERIVED_MIGRATE_ORDER = (
    "guideline_adherence",
    "visit_attributes",
    "surgery_case_attributes",
)

DERIVED_REFRESH_ORDER = (
    "guideline_adherence",
    "visit_attributes",
    "surgery_case_attributes",
)


def get_migrate_targets(target: str) -> list[str]:
    if target == "all":
        return list(DERIVED_MIGRATE_ORDER)
    if target in DERIVED_ARTIFACTS:
        return [target]
    raise ValueError(f"Unsupported derived table migrate target: {target}")


def get_refresh_targets(target: str) -> list[str]:
    if target == "all":
        return list(DERIVED_REFRESH_ORDER)
    if target == "guideline_adherence":
        return ["guideline_adherence"]
    if target == "visit_attributes":
        return ["guideline_adherence", "visit_attributes"]
    if target == "surgery_case_attributes":
        return ["surgery_case_attributes"]
    raise ValueError(f"Unsupported derived table refresh target: {target}")


def get_sql_path(file_name: str) -> Path:
    return Path(__file__).resolve().parent / file_name


def load_sql_file(file_name: str, *, descriptor: str) -> tuple[Path, str]:
    sql_path = get_sql_path(file_name)
    try:
        sql_text = sql_path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise FileNotFoundError(
            f"{descriptor} SQL is missing at {sql_path}",
        ) from exc
    return sql_path, sql_text


def split_sql_statements(sql_text: str) -> list[str]:
    statements: list[str] = []
    current: list[str] = []
    in_single_quote = False
    in_double_quote = False

    for char in sql_text:
        if char == "'" and not in_double_quote:
            in_single_quote = not in_single_quote
        elif char == '"' and not in_single_quote:
            in_double_quote = not in_double_quote

        if char == ";" and not in_single_quote and not in_double_quote:
            statement = "".join(current).strip()
            if statement:
                statements.append(statement)
            current = []
            continue

        current.append(char)

    trailing = "".join(current).strip()
    if trailing:
        statements.append(trailing)

    return statements


def execute_sql_script(cursor, sql_text: str) -> None:
    for statement in split_sql_statements(sql_text):
        cursor.execute(statement)


def migrate_artifact(artifact_name: str) -> None:
    artifact = DERIVED_ARTIFACTS[artifact_name]
    _sql_path, sql_text = load_sql_file(
        artifact.schema_file_name,
        descriptor=f"Schema for '{artifact_name}'",
    )
    with connection.cursor() as cursor:
        execute_sql_script(cursor, sql_text)


def migrate_derived_tables(target: str = "all") -> None:
    for artifact_name in get_migrate_targets(target):
        migrate_artifact(artifact_name)


def record_refresh_success(
    *,
    artifact_name: str,
    definition_hash: str,
    row_count: int,
) -> None:
    DerivedArtifactRefresh.objects.update_or_create(
        artifact_name=artifact_name,
        defaults={
            "definition_hash": definition_hash,
            "last_refreshed_at": timezone.now(),
            "last_row_count": row_count,
            "last_status": DerivedArtifactRefresh.STATUS_SUCCESS,
            "last_error": "",
        },
    )


def record_refresh_failure(
    *,
    artifact_name: str,
    definition_hash: str,
    error_message: str,
) -> None:
    DerivedArtifactRefresh.objects.update_or_create(
        artifact_name=artifact_name,
        defaults={
            "definition_hash": definition_hash,
            "last_refreshed_at": timezone.now(),
            "last_row_count": None,
            "last_status": DerivedArtifactRefresh.STATUS_FAILED,
            "last_error": error_message,
        },
    )


def refresh_artifact(artifact_name: str) -> RefreshResult:
    artifact = DERIVED_ARTIFACTS[artifact_name]
    sql_path, sql_text = load_sql_file(
        artifact.refresh_file_name,
        descriptor=f"Refresh for '{artifact_name}'",
    )
    definition_hash = sha256(sql_text.encode("utf-8")).hexdigest()

    try:
        with connection.cursor() as cursor:
            execute_sql_script(cursor, sql_text)
            cursor.execute(f"SELECT COUNT(*) FROM `{artifact.table_name}`")
            row_count = cursor.fetchone()[0]
    except Exception as exc:
        error_message = (
            f"Failed to refresh '{artifact_name}' using {sql_path}: {exc}"
        )
        record_refresh_failure(
            artifact_name=artifact_name,
            definition_hash=definition_hash,
            error_message=error_message,
        )
        if hasattr(exc, "add_note"):
            exc.add_note(error_message)
        raise

    record_refresh_success(
        artifact_name=artifact_name,
        definition_hash=definition_hash,
        row_count=row_count,
    )
    return RefreshResult(
        artifact_name=artifact_name,
        table_name=artifact.table_name,
        definition_hash=definition_hash,
        row_count=row_count,
        sql_path=sql_path,
    )


def refresh_derived_tables(target: str = "all") -> list[RefreshResult]:
    refresh_targets = get_refresh_targets(target)
    for artifact_name in refresh_targets:
        migrate_artifact(artifact_name)
    return [refresh_artifact(artifact_name) for artifact_name in refresh_targets]
