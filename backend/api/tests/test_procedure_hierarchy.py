import csv
from pathlib import Path
from tempfile import TemporaryDirectory

from django.test import SimpleTestCase, override_settings

from api.views.utils.cpt_hierarchy import get_cpt_hierarchy


class ProcedureHierarchyTests(SimpleTestCase):
    def tearDown(self):
        get_cpt_hierarchy.cache_clear()
        super().tearDown()

    def test_get_cpt_hierarchy_raises_for_missing_mapping_csv(self):
        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            get_cpt_hierarchy.cache_clear()
            with self.assertRaises(FileNotFoundError):
                get_cpt_hierarchy()

    def test_get_cpt_hierarchy_raises_for_duplicate_cpt_codes(self):
        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            mapping_path = Path(base_dir) / "cpt-code-mapping.csv"
            with mapping_path.open("w", encoding="utf-8", newline="") as csv_file:
                writer = csv.DictWriter(csv_file, fieldnames=["Code", "Department", "Procedure"])
                writer.writeheader()
                writer.writerow(
                    {
                        "Code": "99291",
                        "Department": "Critical Care",
                        "Procedure": "Stroke",
                    }
                )
                writer.writerow(
                    {
                        "Code": "99291",
                        "Department": "ECMO",
                        "Procedure": "ECMO Initiation",
                    }
                )

            get_cpt_hierarchy.cache_clear()
            with self.assertRaises(ValueError) as exc:
                get_cpt_hierarchy()
            self.assertIn('Duplicate CPT code "99291"', str(exc.exception))
