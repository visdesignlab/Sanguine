from django.core.management.base import BaseCommand

from api.models_derived import DERIVED_ARTIFACTS, refresh_derived_tables


class Command(BaseCommand):
    help = "Refresh derived materialized tables from repo-managed SQL files."

    def add_arguments(self, parser):
        parser.add_argument(
            "--target",
            choices=("all", *DERIVED_ARTIFACTS.keys()),
            default="all",
            help=(
                "Select which derived tables to refresh. "
                "visit_attributes refreshes GuidelineAdherence first."
            ),
        )

    def handle(self, *args, **kwargs):
        for result in refresh_derived_tables(target=kwargs["target"]):
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully refreshed {result.table_name} from {result.sql_path.name}.",
                ),
            )
