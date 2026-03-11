import io
from decimal import Decimal
from unittest.mock import patch

from django.core.management import call_command
from django.test import TransactionTestCase

from api.models_derived import refresh_artifact
from api.models.operations import DerivedArtifactRefresh

from .materialized_view_test_utils import (
    count_visit_attributes_rows,
    create_visit_fixture,
    fetch_guideline_adherence_rows,
    truncate_intelvia_tables,
)


class RefreshDerivedTablesTests(TransactionTestCase):
    def setUp(self):
        truncate_intelvia_tables()

    def test_refresh_command_refreshes_dependencies_and_records_metadata(self):
        visit = create_visit_fixture(
            visit_no=4101,
            mrn="MRN-4101",
            provider_ids=("PROV-4101",),
            hgb_result=Decimal("7.1"),
            inr_result=Decimal("1.8"),
            plt_result=Decimal("20000"),
            fibrinogen_result=Decimal("220"),
        )

        out = io.StringIO()
        call_command("refresh_derived_tables", target="visit_attributes", stdout=out)
        output = out.getvalue()

        self.assertIn("Successfully refreshed GuidelineAdherence", output)
        self.assertIn("Successfully refreshed VisitAttributes", output)
        self.assertEqual(count_visit_attributes_rows(visit.visit_no), 1)

        by_name = {
            record.artifact_name: record
            for record in DerivedArtifactRefresh.objects.all()
        }
        self.assertEqual(set(by_name.keys()), {"guideline_adherence", "visit_attributes"})
        self.assertEqual(by_name["guideline_adherence"].last_status, DerivedArtifactRefresh.STATUS_SUCCESS)
        self.assertEqual(by_name["visit_attributes"].last_status, DerivedArtifactRefresh.STATUS_SUCCESS)
        self.assertGreaterEqual(by_name["guideline_adherence"].last_row_count or 0, 1)
        self.assertGreaterEqual(by_name["visit_attributes"].last_row_count or 0, 1)
        self.assertEqual(by_name["guideline_adherence"].last_error, "")
        self.assertEqual(by_name["visit_attributes"].last_error, "")

    def test_refresh_command_guideline_target_only_refreshes_guideline_adherence(self):
        visit = create_visit_fixture(
            visit_no=4102,
            mrn="MRN-4102",
            provider_ids=("PROV-4102",),
            hgb_result=Decimal("7.1"),
            inr_result=Decimal("1.8"),
            plt_result=Decimal("20000"),
            fibrinogen_result=Decimal("220"),
        )

        call_command("refresh_derived_tables", target="guideline_adherence", stdout=io.StringIO())

        self.assertEqual(len(fetch_guideline_adherence_rows(visit.visit_no)), 1)
        self.assertEqual(count_visit_attributes_rows(visit.visit_no), 0)
        self.assertEqual(
            set(DerivedArtifactRefresh.objects.values_list("artifact_name", flat=True)),
            {"guideline_adherence"},
        )

    def test_refresh_failure_records_metadata(self):
        create_visit_fixture(
            visit_no=4103,
            mrn="MRN-4103",
            provider_ids=("PROV-4103",),
            hgb_result=Decimal("7.1"),
            inr_result=Decimal("1.8"),
            plt_result=Decimal("20000"),
            fibrinogen_result=Decimal("220"),
        )

        with patch("api.models_derived.derived_tables.execute_sql_script", side_effect=RuntimeError("boom")):
            with self.assertRaisesRegex(RuntimeError, "boom") as raised:
                refresh_artifact("guideline_adherence")

        self.assertIn("Failed to refresh 'guideline_adherence'", "\n".join(getattr(raised.exception, "__notes__", [])))
        record = DerivedArtifactRefresh.objects.get(artifact_name="guideline_adherence")
        self.assertEqual(record.last_status, DerivedArtifactRefresh.STATUS_FAILED)
        self.assertIn("boom", record.last_error)
        self.assertIsNone(record.last_row_count)
