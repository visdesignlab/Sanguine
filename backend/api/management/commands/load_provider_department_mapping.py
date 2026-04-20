import csv
import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from api.models.intelvia import ProviderDepartmentMapping

_SLUG_PATTERN = re.compile(r'^[a-z0-9-]+$')


class Command(BaseCommand):
    help = (
        "Load provider-to-department mappings from provider_department_mapping.csv "
        "into the ProviderDepartmentMapping table. "
        "Expected columns: prov_id, department_id, department_name, prov_name (optional)."
    )

    def handle(self, *args, **kwargs):
        csv_path = Path(settings.BASE_DIR) / "provider_department_mapping.csv"
        if not csv_path.exists():
            raise CommandError(
                f"Provider department mapping CSV not found at: {csv_path}\n"
                "Generate it by running: python manage.py mockdata"
            )

        rows = []
        with csv_path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row_number, row in enumerate(reader, start=2):
                prov_id = (row.get("prov_id") or "").strip()
                department_id = (row.get("department_id") or "").strip()
                department_name = (row.get("department_name") or "").strip()
                prov_name = (row.get("prov_name") or "").strip() or None

                if not prov_id:
                    raise CommandError(f"Row {row_number}: missing prov_id")
                if not department_id:
                    raise CommandError(f"Row {row_number}: missing department_id")
                if not department_name:
                    raise CommandError(f"Row {row_number}: missing department_name")
                if not _SLUG_PATTERN.match(department_id):
                    raise CommandError(
                        f"Row {row_number}: department_id '{department_id}' contains invalid characters. "
                        "Only lowercase letters, digits, and hyphens are allowed."
                    )

                rows.append(ProviderDepartmentMapping(
                    prov_id=prov_id,
                    department_id=department_id,
                    department_name=department_name,
                    prov_name=prov_name,
                ))

        ProviderDepartmentMapping.objects.all().delete()
        ProviderDepartmentMapping.objects.bulk_create(rows)

        self.stdout.write(
            self.style.SUCCESS(
                f"Loaded {len(rows)} provider-department mappings from {csv_path}"
            )
        )
