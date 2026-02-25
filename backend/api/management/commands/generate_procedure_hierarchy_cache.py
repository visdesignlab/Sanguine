import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection

from api.views.utils.cpt_hierarchy import get_cpt_hierarchy, normalize_cpt_code


class Command(BaseCommand):
    help = "Generate procedure hierarchy cache JSON from billing CPT mappings"
    BILLING_FETCH_BATCH_SIZE = 50000

    def handle(self, *args, **kwargs):
        cache_dir = Path(settings.BASE_DIR) / "parquet_cache"
        cache_dir.mkdir(exist_ok=True)
        procedure_hierarchy_file_path = cache_dir / "procedure_hierarchy.json"

        with connection.cursor() as cursor:
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

        payload = {
            "version": datetime.now(timezone.utc).strftime("%Y-%m-%d.%H%M%S"),
            "source": "cpt-code-mapping.csv",
            "department_level": "department",
            "procedure_level": "procedure",
            "departments": procedure_hierarchy_departments,
        }
        procedure_hierarchy_file_path.write_text(
            json.dumps(payload, separators=(",", ":")),
            encoding="utf-8",
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Procedure hierarchy cache generated at {procedure_hierarchy_file_path}"
            )
        )
