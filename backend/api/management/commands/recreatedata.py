from django.core.management.base import BaseCommand
import subprocess

class Command(BaseCommand):
    help = "Recreate all data: migrate, destroy, mock, and generate parquets"

    def handle(self, *args, **options):
        commands = [
            ["python", "manage.py", "migrate", "api"],
            ["python", "manage.py", "destroydata"],
            ["python", "manage.py", "mock50million"],
            ["python", "manage.py", "generate_parquets"],
            ["python", "manage.py", "generate_procedure_hierarchy_cache"],
        ]
        for cmd in commands:
            self.stdout.write(f"Running: {' '.join(cmd)}")
            result = subprocess.run(cmd)
            if result.returncode != 0:
                self.stderr.write(f"Command failed: {' '.join(cmd)}")
                exit(result.returncode)
        self.stdout.write(self.style.SUCCESS("All commands completed successfully."))