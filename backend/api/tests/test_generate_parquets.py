import json
import io
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from tempfile import TemporaryDirectory

import pyarrow as pa
import pyarrow.parquet as pq
from django.core.management import call_command
from django.test import TransactionTestCase, override_settings

from api.management.commands.generate_parquets import (
    build_visit_billing_code_procedures,
    build_visit_roomtrace_departments,
    build_visit_attributes_table,
    coerce_temporal_value_to_utc,
    get_department_encounter_attributes_schema,
    get_surgery_case_attributes_schema,
    get_visit_attributes_schema,
)

from .materialized_view_test_utils import (
    add_provider_department,
    add_room_trace,
    create_empty_visit_fixture,
    create_visit_fixture,
    materialize_visit_attributes,
    truncate_intelvia_tables,
    utc_dt,
)


ARROW_TYPE_ERROR = getattr(pa, "ArrowTypeError", TypeError)
ARROW_ERRORS = (pa.ArrowInvalid, ARROW_TYPE_ERROR, TypeError, ValueError)


def valid_visit_attributes_row() -> dict:
    return {
        "visit_no": 1,
        "mrn": "MRN-1",
        "adm_dtm": datetime(2024, 1, 1, tzinfo=timezone.utc),
        "dsch_dtm": datetime(2024, 1, 5, tzinfo=timezone.utc),
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
        "rbc_units_adherent": 1,
        "ffp_units_adherent": 1,
        "plt_units_adherent": 1,
        "cryo_units_adherent": 0,
        "overall_units_adherent": 3,
        "attending_provider": "Provider A",
        "attending_provider_id": "PROV-A",
        "attending_provider_line": 1,
        "is_admitting_attending": True,
        "department_ids": ["critical-care"],
        "procedure_ids": ["anesthesia__critical-care-services"],
    }


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
        add_room_trace(
            visit=visit,
            service_in_desc="Critical Care",
            in_dtm=utc_dt(2024, 1, 1, 0, 0),
            out_dtm=utc_dt(2024, 1, 3, 0, 0),
        )
        add_room_trace(
            visit=visit,
            service_in_desc="Surgical ICU",
            in_dtm=utc_dt(2024, 1, 3, 0, 0),
            out_dtm=utc_dt(2024, 1, 5, 0, 0),
        )
        add_provider_department(
            prov_id="PROV-PQ",
            department_name="Critical Care",
            department_id="critical-care",
        )
        materialize_visit_attributes()

        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            call_command("generate_parquets")

            parquet_path = Path(base_dir) / "parquet_cache" / "visit_attributes.parquet"
            self.assertTrue(parquet_path.exists())
            dept_hierarchy_path = Path(base_dir) / "parquet_cache" / "department_hierarchy.json"
            self.assertTrue(dept_hierarchy_path.exists())
            proc_hierarchy_path = Path(base_dir) / "parquet_cache" / "procedure_hierarchy.json"
            self.assertTrue(proc_hierarchy_path.exists())

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
            self.assertEqual(row["adm_dtm"], datetime(2024, 1, 1, tzinfo=timezone.utc))
            self.assertEqual(row["dsch_dtm"], datetime(2024, 1, 5, tzinfo=timezone.utc))
            self.assertEqual(row["age_at_adm"], 64)
            self.assertEqual(row["rbc_units"], 2)
            self.assertEqual(row["ffp_units"], 1)
            self.assertEqual(row["plt_units"], 1)
            self.assertEqual(row["cryo_units"], 1)
            self.assertEqual(row["overall_units"], 5)
            self.assertEqual(row["rbc_units_adherent"], 2)
            self.assertEqual(row["ffp_units_adherent"], 0)
            self.assertEqual(row["plt_units_adherent"], 0)
            self.assertEqual(row["cryo_units_adherent"], 0)
            self.assertEqual(row["overall_units_adherent"], 2)
            self.assertEqual(
                sorted(row["department_ids"]),
                ["critical-care", "surgical-icu"],
            )
            self.assertEqual(
                sorted(row["procedure_ids"]),
                ["anesthesia__critical-care-services", "surgery__surgical-procedures-on-the-cardiovascular-system"],
            )

            hierarchy_payload = json.loads(dept_hierarchy_path.read_text(encoding="utf-8"))
            self.assertEqual(hierarchy_payload["source"], "roomtrace")
            self.assertIn("departments", hierarchy_payload)
            dept_by_id = {d["id"]: d for d in hierarchy_payload["departments"]}
            self.assertEqual(dept_by_id["critical-care"]["visit_count"], 1)
            self.assertEqual(dept_by_id["critical-care"]["name"], "Critical Care")
            self.assertEqual(dept_by_id["surgical-icu"]["visit_count"], 1)

            proc_hierarchy_payload = json.loads(proc_hierarchy_path.read_text(encoding="utf-8"))
            self.assertEqual(proc_hierarchy_payload["source"], "cpt-code-mapping.csv")
            proc_by_id = {
                proc["id"]: proc
                for dept in proc_hierarchy_payload["departments"]
                for proc in dept["procedures"]
            }
            self.assertIn("anesthesia__critical-care-services", proc_by_id)
            self.assertEqual(proc_by_id["anesthesia__critical-care-services"]["visit_count"], 1)

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
        materialize_visit_attributes()

        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            call_command("generate_parquets", generate="visit_attributes")

            parquet_path = Path(base_dir) / "parquet_cache" / "visit_attributes.parquet"
            dept_hierarchy_path = Path(base_dir) / "parquet_cache" / "department_hierarchy.json"
            self.assertTrue(parquet_path.exists())
            self.assertFalse(dept_hierarchy_path.exists())

    def test_generate_parquets_does_not_refresh_derived_tables(self):
        create_visit_fixture(
            visit_no=2113,
            mrn="MRN-2113",
            provider_ids=("PROV-2113",),
            hgb_result=Decimal("7.1"),
            inr_result=Decimal("1.8"),
            plt_result=Decimal("20000"),
            fibrinogen_result=Decimal("220"),
        )

        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            call_command("generate_parquets", generate="visit_attributes")

            parquet_path = Path(base_dir) / "parquet_cache" / "visit_attributes.parquet"
            self.assertTrue(parquet_path.exists())
            self.assertEqual(pq.read_table(parquet_path).num_rows, 0)

    def test_generate_parquets_can_generate_only_department_hierarchy(self):
        visit = create_visit_fixture(
            visit_no=2112,
            mrn="MRN-2112",
            provider_ids=("PROV-PH",),
            hgb_result=Decimal("7.1"),
            inr_result=Decimal("1.8"),
            plt_result=Decimal("20000"),
            fibrinogen_result=Decimal("220"),
        )
        add_room_trace(
            visit=visit,
            service_in_desc="Critical Care",
            in_dtm=utc_dt(2024, 1, 1, 0, 0),
            out_dtm=utc_dt(2024, 1, 5, 0, 0),
        )
        add_room_trace(
            visit=visit,
            service_in_desc="Surgical ICU",
            in_dtm=utc_dt(2024, 1, 1, 8, 0),
            out_dtm=utc_dt(2024, 1, 2, 8, 0),
        )
        materialize_visit_attributes()

        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            call_command("generate_parquets", generate="department_hierarchy")

            parquet_path = Path(base_dir) / "parquet_cache" / "visit_attributes.parquet"
            dept_hierarchy_path = Path(base_dir) / "parquet_cache" / "department_hierarchy.json"
            self.assertFalse(parquet_path.exists())
            self.assertTrue(dept_hierarchy_path.exists())

            hierarchy_payload = json.loads(dept_hierarchy_path.read_text(encoding="utf-8"))
            department_ids = {dept["id"] for dept in hierarchy_payload["departments"]}
            self.assertEqual(department_ids, {"critical-care", "surgical-icu"})

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
            "rbc_units_adherent": {"bad": "uint16"},
            "ffp_units_adherent": {"bad": "uint16"},
            "plt_units_adherent": {"bad": "uint16"},
            "cryo_units_adherent": {"bad": "uint16"},
            "overall_units_adherent": {"bad": "uint16"},
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

    def test_coerce_temporal_value_to_utc_handles_date_and_datetime(self):
        naive_dt = datetime(2024, 7, 4, 11, 30)
        aware_non_utc_dt = datetime(2024, 7, 4, 11, 30, tzinfo=timezone(timedelta(hours=-5)))
        date_value = date(2024, 7, 4)

        converted_naive_dt = coerce_temporal_value_to_utc(naive_dt)
        self.assertEqual(converted_naive_dt, datetime(2024, 7, 4, 11, 30, tzinfo=timezone.utc))

        converted_aware_dt = coerce_temporal_value_to_utc(aware_non_utc_dt)
        self.assertEqual(converted_aware_dt, datetime(2024, 7, 4, 16, 30, tzinfo=timezone.utc))

        converted_date = coerce_temporal_value_to_utc(date_value)
        self.assertEqual(converted_date, datetime(2024, 7, 4, 0, 0, tzinfo=timezone.utc))

        self.assertIsNone(coerce_temporal_value_to_utc(None))

    def test_build_visit_attributes_table_coerces_date_fields_to_utc_timestamps(self):
        row = valid_visit_attributes_row()
        row["adm_dtm"] = date(2024, 1, 1)
        row["dsch_dtm"] = date(2024, 1, 5)

        table = build_visit_attributes_table([row])
        actual = table.to_pylist()[0]
        self.assertEqual(actual["adm_dtm"], datetime(2024, 1, 1, 0, 0, tzinfo=timezone.utc))
        self.assertEqual(actual["dsch_dtm"], datetime(2024, 1, 5, 0, 0, tzinfo=timezone.utc))

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
        materialize_visit_attributes()

        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            cache_dir = Path(base_dir) / "parquet_cache"
            cache_dir.mkdir(parents=True, exist_ok=True)
            parquet_path = cache_dir / "visit_attributes.parquet"
            sentinel = b"existing-sentinel-data"
            parquet_path.write_bytes(sentinel)

            from unittest.mock import patch
            with patch(
                "api.management.commands.generate_parquets.build_visit_attributes_table",
                side_effect=ValueError("forced schema failure"),
            ):
                with self.assertRaises(ValueError):
                    call_command("generate_parquets")

            self.assertEqual(parquet_path.read_bytes(), sentinel)

    def test_build_visit_roomtrace_departments_returns_sorted_department_ids(self):
        visit = create_empty_visit_fixture(
            visit_no=3003,
            mrn="MRN-3003",
            provider_ids=("P3",),
        )
        add_room_trace(
            visit=visit,
            service_in_desc="Surgical Critical Care",
            in_dtm=utc_dt(2024, 1, 1, 0, 0),
            out_dtm=utc_dt(2024, 1, 2, 0, 0),
        )
        add_room_trace(
            visit=visit,
            service_in_desc="ECMO",
            in_dtm=utc_dt(2024, 1, 2, 0, 0),
            out_dtm=utc_dt(2024, 1, 3, 0, 0),
        )

        visit_departments = build_visit_roomtrace_departments(fetch_batch_size=2)
        self.assertEqual(visit_departments[3003], ["ecmo", "surgical-critical-care"])

    def test_build_visit_roomtrace_departments_handles_multiple_fetch_batches(self):
        visit = create_empty_visit_fixture(
            visit_no=3004,
            mrn="MRN-3004",
            provider_ids=("P4",),
        )
        add_room_trace(
            visit=visit,
            service_in_desc="Surgical Critical Care",
            in_dtm=utc_dt(2024, 1, 1, 0, 0),
            out_dtm=utc_dt(2024, 1, 2, 0, 0),
        )
        add_room_trace(
            visit=visit,
            service_in_desc="ECMO",
            in_dtm=utc_dt(2024, 1, 2, 0, 0),
            out_dtm=utc_dt(2024, 1, 3, 0, 0),
        )
        # Duplicate department — should be deduplicated
        add_room_trace(
            visit=visit,
            service_in_desc="Surgical Critical Care",
            in_dtm=utc_dt(2024, 1, 3, 0, 0),
            out_dtm=utc_dt(2024, 1, 4, 0, 0),
        )

        visit_departments = build_visit_roomtrace_departments(fetch_batch_size=1)
        self.assertEqual(visit_departments[3004], ["ecmo", "surgical-critical-care"])

    def test_build_visit_roomtrace_departments_ignores_null_and_empty_service_desc(self):
        from api.models.intelvia import RoomTrace
        visit = create_empty_visit_fixture(
            visit_no=3005,
            mrn="MRN-3005",
            provider_ids=("P5",),
        )
        # Null service_in_desc
        RoomTrace.objects.create(
            visit_no=visit,
            service_in_desc=None,
            in_dtm=utc_dt(2024, 1, 1, 0, 0),
            out_dtm=utc_dt(2024, 1, 2, 0, 0),
        )
        # Empty string service_in_desc
        RoomTrace.objects.create(
            visit_no=visit,
            service_in_desc="",
            in_dtm=utc_dt(2024, 1, 2, 0, 0),
            out_dtm=utc_dt(2024, 1, 3, 0, 0),
        )
        # Valid entry
        add_room_trace(
            visit=visit,
            service_in_desc="Cardiac ICU",
            in_dtm=utc_dt(2024, 1, 3, 0, 0),
            out_dtm=utc_dt(2024, 1, 4, 0, 0),
        )

        visit_departments = build_visit_roomtrace_departments()
        self.assertEqual(visit_departments[3005], ["cardiac-icu"])

    def test_generate_parquets_emits_expected_success_messages_by_generate_mode(self):
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
                "mode": "department_hierarchy",
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
                    out = io.StringIO()
                    call_command("generate_parquets", generate=case["mode"], stdout=out)
                    output = out.getvalue()

                if case["expect_visit_msg"]:
                    self.assertIn("Parquet file generated at", output)
                else:
                    self.assertNotIn("Parquet file generated at", output)

                if case["expect_hierarchy_msg"]:
                    self.assertIn("Department hierarchy cache generated at", output)
                else:
                    self.assertNotIn("Department hierarchy cache generated at", output)

    def test_generate_parquets_has_no_skip_materialization_flag(self):
        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            with self.assertRaises(TypeError):
                call_command(
                    "generate_parquets",
                    generate="department_hierarchy",
                    skip_materialize=True,
                )

    def test_surgery_case_attributes_schema_has_utc_timestamps(self):
        schema = get_surgery_case_attributes_schema()
        for field_name in ("surgery_start_dtm", "surgery_end_dtm", "case_date"):
            field = schema.field(field_name)
            self.assertEqual(field.type, pa.timestamp('us', tz='UTC'),
                             f"{field_name} must be a UTC-annotated timestamp to avoid timezone offset issues")

    def test_visit_attributes_schema_has_utc_timestamps(self):
        schema = get_visit_attributes_schema()
        for field_name in ("adm_dtm", "dsch_dtm"):
            field = schema.field(field_name)
            self.assertEqual(
                field.type,
                pa.timestamp('us', tz='UTC'),
                f"{field_name} must be a UTC-annotated timestamp to avoid timezone offset issues",
            )

    def test_surgery_case_attributes_naive_datetimes_are_localized_to_utc(self):
        schema = get_surgery_case_attributes_schema()
        utc_dt_val = datetime(2024, 6, 15, 14, 30, 0, tzinfo=timezone.utc)
        row = {
            "case_id": 1,
            "visit_no": 1001,
            "mrn": "MRN-1",
            "surgeon_prov_id": "SURG-1",
            "surgeon_prov_name": "Surgeon One",
            "anesth_prov_id": "ANES-1",
            "anesth_prov_name": "Anesthesiologist One",
            "surgery_start_dtm": utc_dt_val,
            "surgery_end_dtm": utc_dt_val,
            "case_date": datetime(2024, 6, 15, 0, 0, 0, tzinfo=timezone.utc),
            "month": "2024-Jun",
            "quarter": "2024-Q2",
            "year": "2024",
            "pre_hgb": None, "pre_plt": None, "pre_fibrinogen": None, "pre_inr": None,
            "post_hgb": None, "post_plt": None, "post_fibrinogen": None, "post_inr": None,
            "intraop_rbc_units": None, "intraop_ffp_units": None, "intraop_plt_units": None,
            "intraop_cryo_units": None, "intraop_whole_units": None, "intraop_cell_saver_ml": None,
            "los": None, "death": None, "vent": None, "stroke": None, "ecmo": None,
            "rbc_cost": None, "ffp_cost": None, "plt_cost": None, "cryo_cost": None,
            "whole_cost": None, "cell_saver_cost": None, "total_cost": None,
        }
        table = pa.Table.from_pylist([row], schema=schema)
        result = table.to_pylist()[0]
        self.assertEqual(result["surgery_start_dtm"], utc_dt_val)
        self.assertEqual(result["surgery_end_dtm"], utc_dt_val)
        self.assertEqual(result["case_date"], datetime(2024, 6, 15, 0, 0, 0, tzinfo=timezone.utc))
