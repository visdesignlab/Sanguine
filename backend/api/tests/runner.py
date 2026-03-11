from django.test.runner import DiscoverRunner

from api.models_derived import migrate_derived_tables


class DerivedArtifactsDiscoverRunner(DiscoverRunner):
    def setup_databases(self, **kwargs):
        config = super().setup_databases(**kwargs)
        migrate_derived_tables()
        return config
