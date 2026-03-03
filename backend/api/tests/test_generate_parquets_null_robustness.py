from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

from django.core.management import call_command
from django.test import TransactionTestCase, override_settings

from .materialized_view_test_utils import (
    create_generate_parquets_null_robustness_fixture,
    set_generate_parquets_fixture_cell_to_null,
    truncate_intelvia_tables,
)


VISIT_FIELDS = (
    "epic_pat_id",
    "hsp_account_id",
    "adm_dtm",
    "dsch_dtm",
    "clinical_los",
    "age_at_adm",
    "pat_class_desc",
    "pat_expired_f",
    "invasive_vent_f",
    "total_vent_mins",
    "total_vent_days",
    "apr_drg_code",
    "apr_drg_rom",
    "apr_drg_soi",
    "apr_drg_desc",
    "apr_drg_weight",
    "ms_drg_weight",
    "cci_mi",
    "cci_chf",
    "cci_pvd",
    "cci_cvd",
    "cci_dementia",
    "cci_copd",
    "cci_rheum_dz",
    "cci_pud",
    "cci_liver_dz_mild",
    "cci_dm_wo_compl",
    "cci_dm_w_compl",
    "cci_paraplegia",
    "cci_renal_dz",
    "cci_malign_wo_mets",
    "cci_liver_dz_severe",
    "cci_malign_w_mets",
    "cci_hiv_aids",
    "cci_score",
)
ATTENDING_PROVIDER_FIELDS = (
    "prov_id",
    "prov_name",
    "attend_start_dtm",
    "attend_end_dtm",
    "attend_prov_line",
)
TRANSFUSION_FIELDS = (
    "trnsfsn_dtm",
    "transfusion_rank",
    "blood_unit_number",
    "rbc_units",
    "ffp_units",
    "plt_units",
    "cryo_units",
    "whole_units",
    "rbc_vol",
    "ffp_vol",
    "plt_vol",
    "cryo_vol",
    "whole_vol",
    "cell_saver_ml",
)
LAB_FIELDS = (
    "lab_id",
    "lab_draw_dtm",
    "lab_panel_code",
    "lab_panel_desc",
    "result_dtm",
    "result_code",
    "result_loinc",
    "result_desc",
    "result_value",
    "uom_code",
    "lower_limit",
    "upper_limit",
)
MEDICATION_FIELDS = (
    "order_med_id",
    "order_dtm",
    "medication_id",
    "medication_name",
    "med_admin_line",
    "admin_dtm",
    "admin_dose",
    "med_form",
    "admin_route_desc",
    "dose_unit_desc",
    "med_start_dtm",
    "med_end_dtm",
)
BILLING_CODE_FIELDS = (
    "cpt_code",
    "cpt_code_desc",
    "proc_dtm",
    "prov_id",
    "prov_name",
    "code_rank",
)
SURGERY_CASE_FIELDS = (
    "case_date",
    "surgery_start_dtm",
    "surgery_end_dtm",
    "surgery_elap",
    "surgery_type_desc",
    "surgeon_prov_id",
    "surgeon_prov_name",
    "anesth_prov_id",
    "anesth_prov_name",
    "prim_proc_desc",
    "postop_icu_los",
    "sched_site_desc",
    "asa_code",
)

FIELD_GROUPS = {
    "Visit": VISIT_FIELDS,
    "AttendingProvider": ATTENDING_PROVIDER_FIELDS,
    "Transfusion": TRANSFUSION_FIELDS,
    "Lab": LAB_FIELDS,
    "Medication": MEDICATION_FIELDS,
    "BillingCode": BILLING_CODE_FIELDS,
    "SurgeryCase": SURGERY_CASE_FIELDS,
}

GENERATE_MODE_BY_TABLE = {
    "Visit": "all",
    "Lab": "all",
    "Transfusion": "all",
    "BillingCode": "all",
    "AttendingProvider": "visit_attributes",
    "Medication": "visit_attributes",
    "SurgeryCase": "surgery_cases",
}

FIELD_CASES = [
    {
        "table": table_name,
        "field": field_name,
        "mode": GENERATE_MODE_BY_TABLE[table_name],
    }
    for table_name, fields in FIELD_GROUPS.items()
    for field_name in fields
]

EXPECTED_CASE_COUNT = 97
if len(FIELD_CASES) != EXPECTED_CASE_COUNT:
    raise RuntimeError(
        f"Expected {EXPECTED_CASE_COUNT} null robustness cases, found {len(FIELD_CASES)}",
    )


class GenerateParquetsNullRobustnessTests(TransactionTestCase):
    def setUp(self):
        truncate_intelvia_tables()

    def _run_generate_and_assert_artifacts(self, *, generate_mode: str) -> None:
        with TemporaryDirectory() as base_dir, override_settings(BASE_DIR=base_dir):
            mock_hierarchy = SimpleNamespace(
                code_map={
                    "99291": (
                        "critical-care",
                        "Critical Care",
                        "critical-care__stroke",
                        "Stroke",
                    ),
                },
                departments=(),
            )

            with patch(
                "api.management.commands.generate_parquets.get_cpt_hierarchy",
                return_value=mock_hierarchy,
            ):
                call_command("generate_parquets", generate=generate_mode)

            cache_dir = Path(base_dir) / "parquet_cache"
            expected_artifacts = []
            if generate_mode in ("all", "visit_attributes"):
                expected_artifacts.append(cache_dir / "visit_attributes.parquet")
            if generate_mode in ("all", "procedure_hierarchy"):
                expected_artifacts.append(cache_dir / "procedure_hierarchy.json")
            if generate_mode in ("all", "surgery_cases"):
                expected_artifacts.append(cache_dir / "surgery_case_attributes.parquet")

            for artifact_path in expected_artifacts:
                self.assertTrue(
                    artifact_path.exists(),
                    f"Expected generated artifact at {artifact_path}",
                )

    def _run_single_null_case(self, *, table_name: str, field_name: str, generate_mode: str) -> None:
        fixture_ids = create_generate_parquets_null_robustness_fixture(
            visit_no=990001,
            mrn="MRN-990001",
            case_id=880001,
        )
        set_generate_parquets_fixture_cell_to_null(
            fixture_ids=fixture_ids,
            table_name=table_name,
            field_name=field_name,
        )
        self._run_generate_and_assert_artifacts(generate_mode=generate_mode)


def _make_case_test(case: dict[str, str]):
    def _test(self):
        self._run_single_null_case(
            table_name=case["table"],
            field_name=case["field"],
            generate_mode=case["mode"],
        )

    _test.__name__ = f"test_null_{case['table'].lower()}_{case['field']}_does_not_block_generation"
    return _test


for _case in FIELD_CASES:
    setattr(
        GenerateParquetsNullRobustnessTests,
        f"test_null_{_case['table'].lower()}_{_case['field']}_does_not_block_generation",
        _make_case_test(_case),
    )
