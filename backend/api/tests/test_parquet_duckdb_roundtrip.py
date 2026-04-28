import json
import subprocess
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

from django.core.management import call_command
from django.test import TransactionTestCase, override_settings, tag

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


def _read_parquet_rows_with_duckdb(parquet_path: Path) -> dict:
    frontend_dir = Path(__file__).resolve().parents[3] / "frontend"
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

        materialize_visit_attributes()

        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            with patch(
                "api.management.commands.generate_parquets.get_cpt_hierarchy",
                return_value=_mock_hierarchy(
                    code_map=code_map,
                    departments=_hierarchy_departments(),
                ),
            ):
                call_command("generate_parquets", generate="visit_attributes")

            parquet_path = Path(base_dir) / "parquet_cache" / "visit_attributes.parquet"
            payload = _read_parquet_rows_with_duckdb(parquet_path)

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
        self.assertEqual(row["stroke"], False)
        self.assertEqual(row["ecmo"], False)
        self.assertEqual(row["b12"], True)
        self.assertEqual(row["iron"], True)
        self.assertEqual(row["antifibrinolytic"], False)
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

        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            call_command("generate_parquets", generate="surgery_cases")

            parquet_path = Path(base_dir) / "parquet_cache" / "surgery_case_attributes.parquet"
            payload = _read_parquet_rows_with_duckdb(parquet_path)

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
