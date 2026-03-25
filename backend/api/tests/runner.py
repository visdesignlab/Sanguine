from django.test.runner import DiscoverRunner, ParallelTestSuite, _init_worker

from api.models_derived import migrate_derived_tables


def _init_worker_with_derived_tables(*args, **kwargs):
    _init_worker(*args, **kwargs)
    migrate_derived_tables()


class DerivedArtifactsParallelTestSuite(ParallelTestSuite):
    init_worker = _init_worker_with_derived_tables


class DerivedArtifactsDiscoverRunner(DiscoverRunner):
    parallel_test_suite = DerivedArtifactsParallelTestSuite

    def setup_databases(self, **kwargs):
        config = super().setup_databases(**kwargs)
        migrate_derived_tables()
        return config
