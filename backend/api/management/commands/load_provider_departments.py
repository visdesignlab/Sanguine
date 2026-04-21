import csv
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.utils.text import slugify

from api.models.intelvia import ProviderDepartmentMapping


class Command(BaseCommand):
    help = (
        "Load provider-to-department mappings from backend/provider-department-mapping.csv "
        "into the ProviderDepartment table. The CSV must have columns: prov_id, department_name. "
        "Every department_name value must exactly match a service_in_desc value in RoomTrace. "
        "Run this command once after receiving the CSV from the hospital, before running "
        "refresh_derived_tables --target department_encounter_attributes."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--csv",
            type=str,
            default=None,
            help=(
                "Path to the provider-department-mapping CSV file. "
                "Defaults to backend/provider-department-mapping.csv."
            ),
        )

    def handle(self, *args, **kwargs):
        csv_path_arg = kwargs.get("csv")
        if csv_path_arg:
            csv_path = Path(csv_path_arg)
        else:
            csv_path = Path(settings.BASE_DIR) / "provider-department-mapping.csv"

        if not csv_path.exists():
            raise CommandError(
                f"Provider-department mapping CSV not found at {csv_path}. "
                "Please place the file there or provide --csv <path>."
            )

        # Parse CSV
        rows: list[dict] = []
        with csv_path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            if "prov_id" not in (reader.fieldnames or []) or "department_name" not in (reader.fieldnames or []):
                raise CommandError(
                    f"CSV at {csv_path} must have columns: prov_id, department_name. "
                    f"Found: {reader.fieldnames}"
                )
            for row in reader:
                prov_id = (row.get("prov_id") or "").strip()
                department_name = (row.get("department_name") or "").strip()
                if not prov_id or not department_name:
                    continue
                rows.append({"prov_id": prov_id, "department_name": department_name})

        if not rows:
            raise CommandError(f"No valid rows found in {csv_path}.")

        self.stdout.write(f"Parsed {len(rows)} provider rows from {csv_path}.")

        # Drop all rows from ProviderDepartmentMapping
        ProviderDepartmentMapping.objects.all().delete()
        
        # Create all rows in ProviderDepartment
        for row in rows:
            ProviderDepartmentMapping.objects.create(
                prov_id=row["prov_id"],
                department_name=row["department_name"],
            )
        self.stdout.write(self.style.SUCCESS(f"Successfully loaded provider-department mappings from {csv_path}."))