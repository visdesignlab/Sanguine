from __future__ import annotations

import csv
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.utils.text import slugify


@dataclass(frozen=True)
class ProcedureTaxonomy:
    id: str
    name: str
    cpt_codes: tuple[str, ...]


@dataclass(frozen=True)
class DepartmentTaxonomy:
    id: str
    name: str
    procedures: tuple[ProcedureTaxonomy, ...]


@dataclass(frozen=True)
class CPTHierarchy:
    # cpt_code -> (department_id, department_name, procedure_id, procedure_name)
    code_map: dict[str, tuple[str, str, str, str]]
    departments: tuple[DepartmentTaxonomy, ...]


def _normalize_cpt_code(raw_code: str | None) -> str | None:
    if raw_code is None:
        return None
    normalized = raw_code.strip().upper()
    if not normalized:
        return None

    # Ignore common suffix/modifier formatting from source systems.
    for delimiter in (' ', '-', '.'):
        normalized = normalized.split(delimiter, 1)[0]

    if normalized.isdigit():
        normalized = normalized.zfill(5)
    return normalized or None


def normalize_cpt_code(raw_code: str | None) -> str | None:
    return _normalize_cpt_code(raw_code)


def _mapping_csv_path() -> Path:
    return Path(settings.BASE_DIR) / 'cpt-code-mapping.csv'


@lru_cache(maxsize=1)
def get_cpt_hierarchy() -> CPTHierarchy:
    csv_path = _mapping_csv_path()
    if not csv_path.exists():
        raise FileNotFoundError(f'Could not find CPT mapping CSV at {csv_path}')

    code_map: dict[str, tuple[str, str, str, str]] = {}
    departments: dict[str, dict] = {}

    with csv_path.open('r', encoding='utf-8', newline='') as csv_file:
        reader = csv.DictReader(csv_file)
        for row_number, row in enumerate(reader, start=2):
            cpt_code = _normalize_cpt_code(row.get('Code'))
            # Prefer normalized naming in CSV and keep legacy fallbacks.
            department_name = (
                row.get('Department')
                or ''
            ).strip()
            procedure_name = (
                row.get('Procedure')
                or ''
            ).strip()

            if not cpt_code or not department_name or not procedure_name:
                continue

            department_id = slugify(department_name)
            procedure_id = f'{department_id}__{slugify(procedure_name)}'

            mapping = (department_id, department_name, procedure_id, procedure_name)
            existing_mapping = code_map.get(cpt_code)
            if existing_mapping is not None:
                raise ValueError(
                    f'Duplicate CPT code "{cpt_code}" in {csv_path} at row {row_number}. '
                    f'Existing mapping={existing_mapping}; duplicate mapping={mapping}',
                )
            code_map[cpt_code] = mapping

            department_bucket = departments.setdefault(
                department_id,
                {
                    'id': department_id,
                    'name': department_name,
                    'procedures': {},
                },
            )

            procedure_bucket = department_bucket['procedures'].setdefault(
                procedure_id,
                {
                    'id': procedure_id,
                    'name': procedure_name,
                    'cpt_codes': set(),
                },
            )
            procedure_bucket['cpt_codes'].add(cpt_code)

    frozen_departments: list[DepartmentTaxonomy] = []
    for department in sorted(departments.values(), key=lambda item: item['name']):
        frozen_procedures: list[ProcedureTaxonomy] = []
        for procedure in sorted(department['procedures'].values(), key=lambda item: item['name']):
            frozen_procedures.append(
                ProcedureTaxonomy(
                    id=procedure['id'],
                    name=procedure['name'],
                    cpt_codes=tuple(sorted(procedure['cpt_codes'])),
                ),
            )
        frozen_departments.append(
            DepartmentTaxonomy(
                id=department['id'],
                name=department['name'],
                procedures=tuple(frozen_procedures),
            ),
        )

    return CPTHierarchy(code_map=code_map, departments=tuple(frozen_departments))
