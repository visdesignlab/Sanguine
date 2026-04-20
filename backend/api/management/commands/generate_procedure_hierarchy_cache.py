import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from api.management.commands.generate_parquets import (
    build_cpt_procedure_details,
    build_official_visit_departments,
    build_procedure_hierarchy_payload,
    build_visit_procedures,
    fetch_materialized_visit_numbers,
    fetch_provider_departments,
)
from api.views.utils.cpt_hierarchy import get_cpt_hierarchy


class Command(BaseCommand):
    help = "Generate procedure hierarchy cache JSON from billing CPT mappings"
    BILLING_FETCH_BATCH_SIZE = 50000
    VISIT_FETCH_BATCH_SIZE = 50000

    def handle(self, *args, **kwargs):
        cache_dir = Path(settings.BASE_DIR) / "parquet_cache"
        cache_dir.mkdir(exist_ok=True)
        procedure_hierarchy_file_path = cache_dir / "procedure_hierarchy.json"

        hierarchy = get_cpt_hierarchy()
        visit_procedures = build_visit_procedures(
            code_map=hierarchy.code_map,
            billing_fetch_batch_size=self.BILLING_FETCH_BATCH_SIZE,
        )
        provider_departments = fetch_provider_departments()
        official_visit_departments = build_official_visit_departments(
            fetch_batch_size=self.VISIT_FETCH_BATCH_SIZE
        )
        cpt_procedure_details = build_cpt_procedure_details(hierarchy.departments)
        eligible_visit_numbers = fetch_materialized_visit_numbers(self.VISIT_FETCH_BATCH_SIZE)

        payload = build_procedure_hierarchy_payload(
            provider_departments=provider_departments,
            official_visit_departments=official_visit_departments,
            visit_procedures=visit_procedures,
            cpt_procedure_details=cpt_procedure_details,
            eligible_visit_numbers=eligible_visit_numbers,
        )
        procedure_hierarchy_file_path.write_text(
            json.dumps(payload, separators=(",", ":")),
            encoding="utf-8",
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Procedure hierarchy cache generated at {procedure_hierarchy_file_path}"
            )
        )
