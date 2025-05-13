from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Delete all data from the database"

    def handle(self, *args, **options):
        self.stdout.write("Deleting all data from the database...")
        from django.apps import apps
        from django.db import transaction

        with transaction.atomic():
            for model in apps.get_models():
                if model._meta.app_label == "api":
                    model.objects.all().delete()
                    self.stdout.write(f"Deleted all data from {model.__name__}")
        self.stdout.write(self.style.SUCCESS("Successfully deleted all data from the database."))
