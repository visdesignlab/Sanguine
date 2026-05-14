import json
import subprocess
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

from django.core.management import call_command
from django.test import TransactionTestCase, override_settings, tag

from api.models.intelvia import SurgeryCase, Visit
from api.views.utils.cpt_hierarchy import DepartmentTaxonomy, ProcedureTaxonomy
from .materialized_view_test_utils import (
    create_generate_parquets_null_robustness_fixture,
    create_visit_fixture,
    materialize_visit_attributes,
    refresh_derived_tables,
    set_generate_parquets_fixture_cell_to_null,
    truncate_intelvia_tables,
)


def _mock_hierarchy(
    code_map: dict[str, tuple[str, str, str, str]],
    departments=(),
):
    return SimpleNamespace(code_map=code_map, departments=departments)


def _hierarchy_departments() -> tuple[DepartmentTaxonomy, ...]:
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


def _code_map() -> dict[str, tuple[str, str, str, str]]:
    return {
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


def _read_parquet_rows_with_duckdb(parquet_path: Path) -> dict:
    frontend_dir = Path(__file__).resolve().parents[2] / "frontend"
    parquet_sql_literal = str(parquet_path).replace("'", "''")
    node_script = f"""
import * as duckdb from '@duckdb/duckdb-wasm/blocking';
import {{ fileURLToPath }} from 'node:url';

const wasmPath = fileURLToPath(await import.meta.resolve('@duckdb/duckdb-wasm/dist/duckdb-eh.wasm'));
const bundles = {{
  mvp: {{ mainModule: wasmPath }},
  eh: {{ mainModule: wasmPath }},
}};
const db = await duckdb.createDuckDB(bundles, new duckdb.VoidLogger(), duckdb.NODE_RUNTIME);
await db.instantiate();
const conn = db.connect();

try {{
  const table = conn.query("SELECT * FROM read_parquet('{parquet_sql_literal}')");
  const payload = {{
    rows: table.toArray().map((row) => row.toJSON()),
    schema: table.schema.fields.reduce((acc, field) => {{
      acc[field.name] = field.type.toString();
      return acc;
    }}, {{}}),
  }};
  console.log(JSON.stringify(payload));
}} finally {{
  conn.close();
}}
"""

    completed = subprocess.run(
        ["node", "--input-type=module", "-e", node_script],
        cwd=frontend_dir,
        capture_output=True,
        text=True,
        check=False,
    )

    if completed.returncode != 0:
        raise AssertionError(
            "DuckDB parquet read failed\n"
            f"stdout:\n{completed.stdout}\n"
            f"stderr:\n{completed.stderr}"
        )

    return json.loads(completed.stdout.strip())


def _utc_epoch_ms(value: datetime) -> int:
    return int(value.astimezone(timezone.utc).timestamp() * 1000)


@tag("duckdb-roundtrip")
class ParquetDuckDBRoundTripTests(TransactionTestCase):
    def setUp(self):
        truncate_intelvia_tables()

    def _generate_visit_attributes_payload(
        self,
        *,
        code_map: dict[str, tuple[str, str, str, str]],
        departments=(),
    ) -> dict:
        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            with patch(
                "api.management.commands.generate_parquets.get_cpt_hierarchy",
                return_value=_mock_hierarchy(
                    code_map=code_map,
                    departments=departments,
                ),
            ):
                call_command("generate_parquets", generate="visit_attributes")

            parquet_path = Path(base_dir) / "parquet_cache" / "visit_attributes.parquet"
            return _read_parquet_rows_with_duckdb(parquet_path)

    def _generate_surgery_case_attributes_payload(self) -> dict:
        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            call_command("generate_parquets", generate="surgery_cases")

            parquet_path = Path(base_dir) / "parquet_cache" / "surgery_case_attributes.parquet"
            return _read_parquet_rows_with_duckdb(parquet_path)

    def test_visit_attributes_parquet_round_trips_through_duckdb(self):
        visit = create_visit_fixture(
            visit_no=3001,
            mrn="MRN-3001",
            provider_ids=("PROV-PQ",),
            hgb_result=Decimal("3.1"),
            inr_result=Decimal("1.8"),
            plt_result=Decimal("20000"),
            fibrinogen_result=Decimal("220"),
        )

        materialize_visit_attributes()

        payload = self._generate_visit_attributes_payload(
            code_map=_code_map(),
            departments=_hierarchy_departments(),
        )

        self.assertEqual(len(payload["rows"]), 1)
        self.assertEqual(payload["schema"]["procedure_ids"], "List<Utf8>")

        row = payload["rows"][0]
        self.assertEqual(row["visit_no"], visit.visit_no)
        self.assertEqual(row["mrn"], "MRN-3001")
        self.assertEqual(row["adm_dtm"], _utc_epoch_ms(datetime(2024, 1, 1, tzinfo=timezone.utc)))
        self.assertEqual(row["dsch_dtm"], _utc_epoch_ms(datetime(2024, 1, 5, tzinfo=timezone.utc)))
        self.assertEqual(row["age_at_adm"], 64)
        self.assertAlmostEqual(row["apr_drg_weight"], 1.2)
        self.assertAlmostEqual(row["ms_drg_weight"], 2.3)
        self.assertEqual(row["rbc_units"], 2)
        self.assertEqual(row["ffp_units"], 1)
        self.assertEqual(row["plt_units"], 1)
        self.assertEqual(row["cryo_units"], 1)
        self.assertEqual(row["whole_units"], 0)
        self.assertEqual(row["cell_saver_ml"], 0)
        self.assertEqual(row["overall_units"], 5)
        self.assertAlmostEqual(row["los"], 3.5)
        self.assertEqual(row["death"], False)
        self.assertEqual(row["vent"], True)
        self.assertEqual(row["stroke"], True)
        self.assertEqual(row["ecmo"], True)
        self.assertEqual(row["b12"], True)
        self.assertEqual(row["iron"], True)
        self.assertEqual(row["antifibrinolytic"], True)
        self.assertEqual(row["rbc_units_adherent"], 2)
        self.assertEqual(row["ffp_units_adherent"], 0)
        self.assertEqual(row["plt_units_adherent"], 0)
        self.assertEqual(row["cryo_units_adherent"], 0)
        self.assertEqual(row["overall_units_adherent"], 2)
        self.assertEqual(row["attending_provider"], "Provider PROV-PQ")
        self.assertEqual(row["attending_provider_id"], "PROV-PQ")
        self.assertEqual(row["attending_provider_line"], 1)
        self.assertEqual(row["is_admitting_attending"], True)
        self.assertEqual(
            row["procedure_ids"],
            ["critical-care__stroke", "ecmo__initiation"],
        )

    def test_visit_attributes_parquet_preserves_null_dates_and_nullable_booleans(self):
        visit = create_visit_fixture(
            visit_no=3002,
            mrn="MRN-3002",
            provider_ids=("PROV-1", "PROV-2"),
            hgb_result=Decimal("7.0"),
            inr_result=Decimal("1.8"),
            plt_result=Decimal("17000"),
            fibrinogen_result=Decimal("200"),
        )
        Visit.objects.filter(visit_no=visit.visit_no).update(
            adm_dtm=None,
            dsch_dtm=None,
            clinical_los=Decimal("5.25"),
            pat_expired_f="Y",
            total_vent_mins=2000,
        )

        materialize_visit_attributes()

        payload = self._generate_visit_attributes_payload(
            code_map=_code_map(),
            departments=_hierarchy_departments(),
        )

        self.assertEqual(len(payload["rows"]), 2)
        rows = sorted(payload["rows"], key=lambda row: row["attending_provider_line"])
        first, second = rows

        self.assertIsNone(first["adm_dtm"])
        self.assertIsNone(first["dsch_dtm"])
        self.assertEqual(first["attending_provider_line"], 1)
        self.assertEqual(first["attending_provider_id"], "PROV-1")
        self.assertAlmostEqual(first["los"], 5.25)
        self.assertEqual(first["death"], True)
        self.assertEqual(first["vent"], True)
        self.assertEqual(first["stroke"], True)
        self.assertEqual(first["ecmo"], True)
        self.assertEqual(first["is_admitting_attending"], True)

        self.assertIsNone(second["adm_dtm"])
        self.assertIsNone(second["dsch_dtm"])
        self.assertEqual(second["attending_provider_line"], 2)
        self.assertEqual(second["attending_provider_id"], "PROV-2")
        self.assertIsNone(second["los"])
        self.assertIsNone(second["death"])
        self.assertIsNone(second["vent"])
        self.assertIsNone(second["stroke"])
        self.assertIsNone(second["ecmo"])
        self.assertEqual(second["is_admitting_attending"], False)

    def test_surgery_case_attributes_parquet_preserves_nullable_temporal_and_cost_fields(self):
        fixture_ids = create_generate_parquets_null_robustness_fixture(
            visit_no=3101,
            mrn="MRN-3101",
            case_id=9101,
        )
        set_generate_parquets_fixture_cell_to_null(
            fixture_ids=fixture_ids,
            table_name="SurgeryCase",
            field_name="case_date",
        )

        refresh_derived_tables(target="surgery_case_attributes")

        payload = self._generate_surgery_case_attributes_payload()

        self.assertEqual(len(payload["rows"]), 1)
        self.assertEqual(payload["schema"]["surgery_start_dtm"], "Timestamp<MICROSECOND>")
        self.assertEqual(payload["schema"]["case_date"], "Date32<DAY>")

        row = payload["rows"][0]
        self.assertEqual(row["case_id"], 9101)
        self.assertEqual(row["visit_no"], 3101)
        self.assertEqual(row["mrn"], "MRN-3101")
        self.assertEqual(
            row["surgery_start_dtm"],
            _utc_epoch_ms(datetime(2024, 1, 2, 9, 0, tzinfo=timezone.utc)),
        )
        self.assertEqual(
            row["surgery_end_dtm"],
            _utc_epoch_ms(datetime(2024, 1, 2, 11, 0, tzinfo=timezone.utc)),
        )
        self.assertIsNone(row["case_date"])
        self.assertIsNone(row["month"])
        self.assertIsNone(row["quarter"])
        self.assertIsNone(row["year"])
        self.assertAlmostEqual(row["pre_hgb"], 7.1)
        self.assertAlmostEqual(row["pre_plt"], 20000.0)
        self.assertAlmostEqual(row["pre_fibrinogen"], 220.0)
        self.assertAlmostEqual(row["pre_inr"], 1.8)
        self.assertIsNone(row["post_hgb"])
        self.assertIsNone(row["post_plt"])
        self.assertIsNone(row["post_fibrinogen"])
        self.assertIsNone(row["post_inr"])
        self.assertEqual(row["intraop_rbc_units"], 1)
        self.assertEqual(row["intraop_ffp_units"], 1)
        self.assertEqual(row["intraop_plt_units"], 1)
        self.assertEqual(row["intraop_cryo_units"], 1)
        self.assertEqual(row["intraop_whole_units"], 1)
        self.assertEqual(row["intraop_cell_saver_ml"], 100)
        self.assertAlmostEqual(row["los"], 4.25)
        self.assertEqual(row["death"], False)
        self.assertEqual(row["vent"], True)
        self.assertEqual(row["stroke"], True)
        self.assertEqual(row["ecmo"], False)
        self.assertAlmostEqual(row["rbc_cost"], 200.0)
        self.assertAlmostEqual(row["ffp_cost"], 50.0)
        self.assertAlmostEqual(row["plt_cost"], 500.0)
        self.assertAlmostEqual(row["cryo_cost"], 30.0)
        self.assertAlmostEqual(row["whole_cost"], 300.0)
        self.assertAlmostEqual(row["cell_saver_cost"], 225.0)
        self.assertAlmostEqual(row["total_cost"], 1305.0)

    def test_surgery_case_attributes_parquet_normalizes_offset_timestamps_to_utc(self):
        fixture_ids = create_generate_parquets_null_robustness_fixture(
            visit_no=3102,
            mrn="MRN-3102",
            case_id=9102,
        )
        eastern = timezone(timedelta(hours=-5))
        SurgeryCase.objects.filter(case_id=fixture_ids["case_id"]).update(
            surgery_start_dtm=datetime(2024, 1, 2, 4, 30, tzinfo=eastern),
            surgery_end_dtm=datetime(2024, 1, 2, 6, 15, tzinfo=eastern),
        )

        refresh_derived_tables(target="surgery_case_attributes")

        payload = self._generate_surgery_case_attributes_payload()

        self.assertEqual(len(payload["rows"]), 1)
        self.assertEqual(payload["schema"]["surgery_start_dtm"], "Timestamp<MICROSECOND>")

        row = payload["rows"][0]
        self.assertEqual(
            row["surgery_start_dtm"],
            _utc_epoch_ms(datetime(2024, 1, 2, 9, 30, tzinfo=timezone.utc)),
        )
        self.assertEqual(
            row["surgery_end_dtm"],
            _utc_epoch_ms(datetime(2024, 1, 2, 11, 15, tzinfo=timezone.utc)),
        )
        self.assertIsNotNone(row["case_date"])
        self.assertEqual(row["month"], "2024-Jan")
        self.assertEqual(row["quarter"], "2024-Q1")
        self.assertEqual(row["year"], "2024")
