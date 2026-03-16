from django.core.management.base import BaseCommand
import subprocess


class Command(BaseCommand):
    help = "Recreate all data: migrate, rebuild derived tables, mock, refresh, and generate parquets"

    def handle(self, *args, **options):
        commands = [
            ["python", "manage.py", "migrate"],
            ["python", "manage.py", "destroydata"],
            ["python", "manage.py", "migrate_derived_tables"],
            ["python", "manage.py", "mockdata"],
            ["python", "manage.py", "refresh_derived_tables"],
            ["python", "manage.py", "generate_parquets"],
        ]
        for cmd in commands:
            self.stdout.write(f"Running: {' '.join(cmd)}")
            result = subprocess.run(cmd)
            if result.returncode != 0:
                self.stderr.write(f"Command failed: {' '.join(cmd)}")
                exit(result.returncode)
        self.stdout.write(self.style.SUCCESS("All commands completed successfully."))
