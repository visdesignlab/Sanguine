import json
import io
from datetime import date
from decimal import Decimal
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

import pyarrow as pa
import pyarrow.parquet as pq
from django.core.management import call_command
from django.test import TransactionTestCase, override_settings

from api.management.commands.generate_parquets import (
    attach_cpt_dimensions,
    build_visit_attributes_table,
    get_visit_attributes_schema,
)
from api.views.utils.cpt_hierarchy import DepartmentTaxonomy, ProcedureTaxonomy

from .materialized_view_test_utils import (
    add_billing_code,
    create_empty_visit_fixture,
    create_visit_fixture,
    truncate_intelvia_tables,
    utc_dt,
)


ARROW_TYPE_ERROR = getattr(pa, "ArrowTypeError", TypeError)
ARROW_ERRORS = (pa.ArrowInvalid, ARROW_TYPE_ERROR, TypeError, ValueError)


def valid_visit_attributes_row() -> dict:
    return {
        "visit_no": 1,
        "mrn": "MRN-1",
        "adm_dtm": date(2024, 1, 1),
        "dsch_dtm": date(2024, 1, 5),
        "age_at_adm": 64,
        "pat_class_desc": "Inpatient",
        "apr_drg_weight": 1.2,
        "ms_drg_weight": 2.3,
        "month": "2024-Jan",
        "quarter": "2024-Q1",
        "year": "2024",
        "rbc_units": 2,
        "ffp_units": 1,
        "plt_units": 1,
        "cryo_units": 0,
        "whole_units": 0,
        "cell_saver_ml": 0,
        "overall_units": 4,
        "los": 3.5,
        "death": False,
        "vent": True,
        "stroke": False,
        "ecmo": False,
        "b12": True,
        "iron": True,
        "antifibrinolytic": False,
        "rbc_adherent": 1,
        "ffp_adherent": 1,
        "plt_adherent": 1,
        "cryo_adherent": 0,
        "overall_adherent": 3,
        "attending_provider": "Provider A",
        "attending_provider_id": "PROV-A",
        "attending_provider_line": 1,
        "is_admitting_attending": True,
        "department_ids": ["critical-care"],
        "procedure_ids": ["critical-care__stroke"],
    }


def mock_hierarchy(
    code_map: dict[str, tuple[str, str, str, str]],
    departments=(),
):
    return SimpleNamespace(code_map=code_map, departments=departments)


def hierarchy_departments() -> tuple[DepartmentTaxonomy, ...]:
    return (
        DepartmentTaxonomy(
            id="critical-care",
            name="Critical Care",
            procedures=(
                ProcedureTaxonomy(
                    id="critical-care__stroke",
                    name="Stroke",
                    cpt_codes=("99291",),
                ),
            ),
        ),
        DepartmentTaxonomy(
            id="ecmo",
            name="ECMO",
            procedures=(
                ProcedureTaxonomy(
                    id="ecmo__initiation",
                    name="ECMO Initiation",
                    cpt_codes=("33946",),
                ),
            ),
        ),
    )


class GenerateParquetsTests(TransactionTestCase):
    def setUp(self):
        truncate_intelvia_tables()

    def test_generate_parquets_end_to_end_writes_expected_schema_and_values(self):
        visit = create_visit_fixture(
            visit_no=2001,
            mrn="MRN-2001",
            provider_ids=("PROV-PQ",),
            hgb_result=Decimal("7.1"),
            inr_result=Decimal("1.8"),
            plt_result=Decimal("20000"),
            fibrinogen_result=Decimal("220"),
        )
        code_map = {
            "99291": (
                "critical-care",
                "Critical Care",
                "critical-care__stroke",
                "Stroke",
            ),
            "33946": (
                "ecmo",
                "ECMO",
                "ecmo__initiation",
                "ECMO Initiation",
            ),
        }
        departments = hierarchy_departments()

        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            with patch(
                "api.management.commands.generate_parquets.get_cpt_hierarchy",
                return_value=mock_hierarchy(code_map=code_map, departments=departments),
            ):
                call_command("generate_parquets")

            parquet_path = Path(base_dir) / "parquet_cache" / "visit_attributes.parquet"
            self.assertTrue(parquet_path.exists())
            procedure_hierarchy_path = Path(base_dir) / "parquet_cache" / "procedure_hierarchy.json"
            self.assertTrue(procedure_hierarchy_path.exists())

            table = pq.read_table(parquet_path)
            expected_schema = get_visit_attributes_schema()
            self.assertEqual(table.schema.names, expected_schema.names)

            for expected_field in expected_schema:
                actual_field = table.schema.field(expected_field.name)
                self.assertEqual(actual_field.type, expected_field.type)
                self.assertEqual(actual_field.nullable, expected_field.nullable)

            rows = table.to_pylist()
            self.assertEqual(len(rows), 1)
            row = rows[0]
            self.assertEqual(row["visit_no"], visit.visit_no)
            self.assertEqual(row["mrn"], "MRN-2001")
            self.assertEqual(row["age_at_adm"], 64)
            self.assertEqual(row["rbc_units"], 2)
            self.assertEqual(row["ffp_units"], 1)
            self.assertEqual(row["plt_units"], 1)
            self.assertEqual(row["cryo_units"], 1)
            self.assertEqual(row["overall_units"], 5)
            self.assertEqual(row["rbc_adherent"], 1)
            self.assertEqual(row["ffp_adherent"], 1)
            self.assertEqual(row["plt_adherent"], 1)
            self.assertEqual(row["cryo_adherent"], 1)
            self.assertEqual(row["overall_adherent"], 4)
            self.assertEqual(sorted(row["department_ids"]), ["critical-care", "ecmo"])
            self.assertEqual(
                sorted(row["procedure_ids"]),
                ["critical-care__stroke", "ecmo__initiation"],
            )

            hierarchy_payload = json.loads(procedure_hierarchy_path.read_text(encoding="utf-8"))
            self.assertEqual(hierarchy_payload["source"], "cpt-code-mapping.csv")
            self.assertEqual(hierarchy_payload["department_level"], "department")
            self.assertEqual(hierarchy_payload["procedure_level"], "procedure")
            self.assertEqual(len(hierarchy_payload["departments"]), 2)
            by_department_id = {
                department["id"]: department
                for department in hierarchy_payload["departments"]
            }

            self.assertEqual(by_department_id["critical-care"]["visit_count"], 1)
            self.assertEqual(by_department_id["ecmo"]["visit_count"], 1)
            self.assertEqual(
                by_department_id["critical-care"]["procedures"][0]["visit_count"],
                1,
            )
            self.assertEqual(
                by_department_id["ecmo"]["procedures"][0]["visit_count"],
                1,
            )

    def test_generate_parquets_can_generate_only_visit_attributes(self):
        create_visit_fixture(
            visit_no=2111,
            mrn="MRN-2111",
            provider_ids=("PROV-VA",),
            hgb_result=Decimal("7.1"),
            inr_result=Decimal("1.8"),
            plt_result=Decimal("20000"),
            fibrinogen_result=Decimal("220"),
        )
        code_map = {
            "99291": (
                "critical-care",
                "Critical Care",
                "critical-care__stroke",
                "Stroke",
            ),
        }

        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            with patch(
                "api.management.commands.generate_parquets.get_cpt_hierarchy",
                return_value=mock_hierarchy(code_map=code_map),
            ):
                call_command("generate_parquets", generate="visit_attributes")

            parquet_path = Path(base_dir) / "parquet_cache" / "visit_attributes.parquet"
            procedure_hierarchy_path = Path(base_dir) / "parquet_cache" / "procedure_hierarchy.json"
            self.assertTrue(parquet_path.exists())
            self.assertFalse(procedure_hierarchy_path.exists())

    def test_generate_parquets_can_generate_only_procedure_hierarchy(self):
        create_visit_fixture(
            visit_no=2112,
            mrn="MRN-2112",
            provider_ids=("PROV-PH",),
            hgb_result=Decimal("7.1"),
            inr_result=Decimal("1.8"),
            plt_result=Decimal("20000"),
            fibrinogen_result=Decimal("220"),
        )
        code_map = {
            "99291": (
                "critical-care",
                "Critical Care",
                "critical-care__stroke",
                "Stroke",
            ),
            "33946": (
                "ecmo",
                "ECMO",
                "ecmo__initiation",
                "ECMO Initiation",
            ),
        }

        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            with patch(
                "api.management.commands.generate_parquets.get_cpt_hierarchy",
                return_value=mock_hierarchy(code_map=code_map, departments=hierarchy_departments()),
            ):
                call_command("generate_parquets", generate="procedure_hierarchy")

            parquet_path = Path(base_dir) / "parquet_cache" / "visit_attributes.parquet"
            procedure_hierarchy_path = Path(base_dir) / "parquet_cache" / "procedure_hierarchy.json"
            self.assertFalse(parquet_path.exists())
            self.assertTrue(procedure_hierarchy_path.exists())

            hierarchy_payload = json.loads(procedure_hierarchy_path.read_text(encoding="utf-8"))
            department_ids = {department["id"] for department in hierarchy_payload["departments"]}
            self.assertEqual(department_ids, {"critical-care", "ecmo"})

    def test_generate_parquets_cpt_enrichment_ignores_blank_and_unmapped_codes(self):
        visit = create_empty_visit_fixture(
            visit_no=2002,
            mrn="MRN-2002",
            provider_ids=("PROV-CPT",),
        )
        add_billing_code(
            visit=visit,
            cpt_code=" 99291-26 ",
            proc_dtm=utc_dt(2024, 1, 2, 9, 0),
            provider_id="PROV-CPT",
            code_rank=1,
        )
        add_billing_code(
            visit=visit,
            cpt_code="",
            proc_dtm=utc_dt(2024, 1, 2, 9, 5),
            provider_id="PROV-CPT",
            code_rank=2,
        )
        add_billing_code(
            visit=visit,
            cpt_code="XXXXX",
            proc_dtm=utc_dt(2024, 1, 2, 9, 10),
            provider_id="PROV-CPT",
            code_rank=3,
        )

        code_map = {
            "99291": (
                "critical-care",
                "Critical Care",
                "critical-care__stroke",
                "Stroke",
            ),
        }

        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            with patch(
                "api.management.commands.generate_parquets.get_cpt_hierarchy",
                return_value=mock_hierarchy(code_map=code_map),
            ):
                call_command("generate_parquets")

            parquet_path = Path(base_dir) / "parquet_cache" / "visit_attributes.parquet"
            row = pq.read_table(parquet_path).to_pylist()[0]
            self.assertEqual(row["department_ids"], ["critical-care"])
            self.assertEqual(row["procedure_ids"], ["critical-care__stroke"])

    def test_build_visit_attributes_table_enforces_nullability_for_every_column(self):
        schema = get_visit_attributes_schema()
        base_row = valid_visit_attributes_row()

        for field in schema:
            with self.subTest(field=field.name):
                row = dict(base_row)
                row[field.name] = None

                if field.nullable:
                    table = build_visit_attributes_table([row])
                    value = table.to_pylist()[0][field.name]
                    self.assertIsNone(value)
                else:
                    with self.assertRaises(ARROW_ERRORS):
                        build_visit_attributes_table([row])

    def test_build_visit_attributes_table_accepts_large_unsigned_age_values(self):
        row = valid_visit_attributes_row()
        row["age_at_adm"] = 168

        table = build_visit_attributes_table([row])
        self.assertEqual(table.to_pylist()[0]["age_at_adm"], 168)

    def test_build_visit_attributes_table_rejects_bogus_values_for_every_column(self):
        schema = get_visit_attributes_schema()
        base_row = valid_visit_attributes_row()
        bogus_values = {
            "visit_no": {"bad": "int"},
            "mrn": {"bad": "string"},
            "adm_dtm": {"bad": "date"},
            "dsch_dtm": {"bad": "date"},
            "age_at_adm": {"bad": "uint16"},
            "pat_class_desc": {"bad": "string"},
            "apr_drg_weight": {"bad": "float"},
            "ms_drg_weight": {"bad": "float"},
            "month": {"bad": "string"},
            "quarter": {"bad": "string"},
            "year": {"bad": "string"},
            "rbc_units": {"bad": "uint16"},
            "ffp_units": {"bad": "uint16"},
            "plt_units": {"bad": "uint16"},
            "cryo_units": {"bad": "uint16"},
            "whole_units": {"bad": "uint16"},
            "cell_saver_ml": {"bad": "uint32"},
            "overall_units": {"bad": "uint16"},
            "los": {"bad": "float"},
            "death": {"bad": "bool"},
            "vent": {"bad": "bool"},
            "stroke": {"bad": "bool"},
            "ecmo": {"bad": "bool"},
            "b12": {"bad": "bool"},
            "iron": {"bad": "bool"},
            "antifibrinolytic": {"bad": "bool"},
            "rbc_adherent": {"bad": "uint16"},
            "ffp_adherent": {"bad": "uint16"},
            "plt_adherent": {"bad": "uint16"},
            "cryo_adherent": {"bad": "uint16"},
            "overall_adherent": {"bad": "uint16"},
            "attending_provider": {"bad": "string"},
            "attending_provider_id": {"bad": "string"},
            "attending_provider_line": {"bad": "uint16"},
            "is_admitting_attending": {"bad": "bool"},
            "department_ids": [{"bad": "string-list"}],
            "procedure_ids": [{"bad": "string-list"}],
        }

        self.assertEqual(set(bogus_values.keys()), set(schema.names))

        for field_name in schema.names:
            with self.subTest(field=field_name):
                row = dict(base_row)
                row[field_name] = bogus_values[field_name]
                with self.assertRaises(ARROW_ERRORS):
                    build_visit_attributes_table([row])

    def test_generate_parquets_failure_does_not_overwrite_existing_artifact(self):
        create_visit_fixture(
            visit_no=2003,
            mrn="MRN-2003",
            provider_ids=("PROV-FAIL",),
            hgb_result=Decimal("7.1"),
            inr_result=Decimal("1.8"),
            plt_result=Decimal("20000"),
            fibrinogen_result=Decimal("200"),
        )

        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            cache_dir = Path(base_dir) / "parquet_cache"
            cache_dir.mkdir(parents=True, exist_ok=True)
            parquet_path = cache_dir / "visit_attributes.parquet"
            sentinel = b"existing-sentinel-data"
            parquet_path.write_bytes(sentinel)

            with patch(
                "api.management.commands.generate_parquets.get_cpt_hierarchy",
                return_value=mock_hierarchy(code_map={}),
            ):
                with patch(
                    "api.management.commands.generate_parquets.build_visit_attributes_table",
                    side_effect=ValueError("forced schema failure"),
                ):
                    with self.assertRaises(ValueError):
                        call_command("generate_parquets")

            self.assertEqual(parquet_path.read_bytes(), sentinel)

    def test_attach_cpt_dimensions_mutates_rows_with_sorted_dimension_ids(self):
        code_map = {
            "99291": ("critical-care", "Critical Care", "critical-care__stroke", "Stroke"),
            "33946": ("ecmo", "ECMO", "ecmo__initiation", "ECMO Initiation"),
        }

        visit = create_empty_visit_fixture(
            visit_no=3003,
            mrn="MRN-3003",
            provider_ids=("P3",),
        )
        add_billing_code(
            visit=visit,
            cpt_code="99291",
            proc_dtm=utc_dt(2024, 1, 2, 9, 0),
            provider_id="P3",
            code_rank=1,
        )
        add_billing_code(
            visit=visit,
            cpt_code="33946",
            proc_dtm=utc_dt(2024, 1, 2, 9, 5),
            provider_id="P3",
            code_rank=2,
        )

        rows = [{"visit_no": 3003}]
        attached = attach_cpt_dimensions(rows=rows, code_map=code_map, billing_fetch_batch_size=2)
        self.assertEqual(attached[0]["department_ids"], ["critical-care", "ecmo"])
        self.assertEqual(
            attached[0]["procedure_ids"],
            ["critical-care__stroke", "ecmo__initiation"],
        )

    def test_attach_cpt_dimensions_handles_multiple_fetch_batches(self):
        code_map = {
            "99291": ("critical-care", "Critical Care", "critical-care__stroke", "Stroke"),
            "33946": ("ecmo", "ECMO", "ecmo__initiation", "ECMO Initiation"),
        }

        visit = create_empty_visit_fixture(
            visit_no=3004,
            mrn="MRN-3004",
            provider_ids=("P4",),
        )
        add_billing_code(
            visit=visit,
            cpt_code="99291",
            proc_dtm=utc_dt(2024, 1, 2, 9, 0),
            provider_id="P4",
            code_rank=1,
        )
        add_billing_code(
            visit=visit,
            cpt_code="33946",
            proc_dtm=utc_dt(2024, 1, 2, 9, 1),
            provider_id="P4",
            code_rank=2,
        )
        add_billing_code(
            visit=visit,
            cpt_code="99291-26",
            proc_dtm=utc_dt(2024, 1, 2, 9, 2),
            provider_id="P4",
            code_rank=3,
        )
        add_billing_code(
            visit=visit,
            cpt_code="XXXXX",
            proc_dtm=utc_dt(2024, 1, 2, 9, 3),
            provider_id="P4",
            code_rank=4,
        )
        add_billing_code(
            visit=visit,
            cpt_code="   ",
            proc_dtm=utc_dt(2024, 1, 2, 9, 4),
            provider_id="P4",
            code_rank=5,
        )

        rows = [{"visit_no": 3004}]
        attached = attach_cpt_dimensions(rows=rows, code_map=code_map, billing_fetch_batch_size=1)
        self.assertEqual(attached[0]["department_ids"], ["critical-care", "ecmo"])
        self.assertEqual(
            attached[0]["procedure_ids"],
            ["critical-care__stroke", "ecmo__initiation"],
        )

    def test_generate_parquets_emits_expected_success_messages_by_generate_mode(self):
        code_map = {
            "99291": (
                "critical-care",
                "Critical Care",
                "critical-care__stroke",
                "Stroke",
            ),
            "33946": (
                "ecmo",
                "ECMO",
                "ecmo__initiation",
                "ECMO Initiation",
            ),
        }

        cases = [
            {
                "mode": "all",
                "expect_visit_msg": True,
                "expect_hierarchy_msg": True,
            },
            {
                "mode": "visit_attributes",
                "expect_visit_msg": True,
                "expect_hierarchy_msg": False,
            },
            {
                "mode": "procedure_hierarchy",
                "expect_visit_msg": False,
                "expect_hierarchy_msg": True,
            },
        ]

        for index, case in enumerate(cases, start=1):
            with self.subTest(mode=case["mode"]):
                create_visit_fixture(
                    visit_no=3200 + index,
                    mrn=f"MRN-320{index}",
                    provider_ids=(f"PROV-320{index}",),
                    hgb_result=Decimal("7.1"),
                    inr_result=Decimal("1.8"),
                    plt_result=Decimal("20000"),
                    fibrinogen_result=Decimal("220"),
                )

                with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
                    with patch(
                        "api.management.commands.generate_parquets.get_cpt_hierarchy",
                        return_value=mock_hierarchy(
                            code_map=code_map,
                            departments=hierarchy_departments(),
                        ),
                    ):
                        out = io.StringIO()
                        call_command("generate_parquets", generate=case["mode"], stdout=out)
                        output = out.getvalue()

                self.assertIn("Successfully materialized VisitAttributes.", output)

                if case["expect_visit_msg"]:
                    self.assertIn("Parquet file generated at", output)
                else:
                    self.assertNotIn("Parquet file generated at", output)

                if case["expect_hierarchy_msg"]:
                    self.assertIn("Procedure hierarchy cache generated at", output)
                else:
                    self.assertNotIn("Procedure hierarchy cache generated at", output)

    def test_generate_parquets_can_skip_materialization(self):
        visit = create_empty_visit_fixture(
            visit_no=3301,
            mrn="MRN-3301",
            provider_ids=("PROV-3301",),
        )
        add_billing_code(
            visit=visit,
            cpt_code="99291",
            proc_dtm=utc_dt(2024, 1, 2, 9, 0),
            provider_id="PROV-3301",
            code_rank=1,
        )
        code_map = {
            "99291": (
                "critical-care",
                "Critical Care",
                "critical-care__stroke",
                "Stroke",
            ),
        }

        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            with patch(
                "api.management.commands.generate_parquets.get_cpt_hierarchy",
                return_value=mock_hierarchy(code_map=code_map, departments=hierarchy_departments()),
            ):
                out = io.StringIO()
                call_command(
                    "generate_parquets",
                    generate="procedure_hierarchy",
                    skip_materialize=True,
                    stdout=out,
                )
                output = out.getvalue()

        self.assertIn("Skipping VisitAttributes materialization.", output)
        self.assertNotIn("Successfully materialized VisitAttributes.", output)
