from django.core.management.base import BaseCommand

from api.models_derived import (
    DERIVED_ARTIFACTS,
    get_migrate_targets,
    migrate_derived_tables,
)


class Command(BaseCommand):
    help = "Create or replace derived artifact tables from repo-managed SQL schema files."

    def add_arguments(self, parser):
        parser.add_argument(
            "--target",
            choices=("all", *DERIVED_ARTIFACTS.keys()),
            default="all",
            help="Select which derived tables to migrate.",
        )

    def handle(self, *args, **kwargs):
        target = kwargs["target"]
        migrate_derived_tables(target=target)
        for artifact_name in get_migrate_targets(target):
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully migrated {DERIVED_ARTIFACTS[artifact_name].table_name}.",
                ),
            )
