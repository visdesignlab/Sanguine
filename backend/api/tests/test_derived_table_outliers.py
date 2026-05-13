"""
Tests for clinical and data-quality outlier flags surfaced by the Data Management view.

Each test mirrors the whereClause used in frontend/src/Components/Views/SettingsView/
DataManagement/flagDefinitions.ts, exercising the derived SQL directly so we know
both the SQL output *and* the DuckDB query will produce consistent results.

Surgery-case tests verify SurgeryCaseAttributes fields (pre_hgb, post_hgb,
intraop_rbc_units, pre_plt, pre_inr).

Visit tests verify VisitAttributes fields (rbc_units, rbc_units_adherent,
ffp_units, ffp_units_adherent, plt_units, plt_units_adherent, attending_provider).

Visit-no range: 5001–5099
Case-id range:  50001–50099
"""
from decimal import Decimal

from django.test import TransactionTestCase

from .materialized_view_test_utils import (
    add_attending_provider,
    add_lab,
    add_surgery_case,
    add_transfusion,
    create_empty_visit_fixture,
    fetch_surgery_case_attributes_row,
    fetch_visit_attributes_rows,
    materialize_surgery_case_attributes,
    materialize_visit_attributes,
    truncate_intelvia_tables,
    utc_dt,
)

# ---------------------------------------------------------------------------
# Timing constants (all tests share the same calendar skeleton)
# ---------------------------------------------------------------------------
SURGERY_START = utc_dt(2024, 1, 2, 9, 0)
SURGERY_END = utc_dt(2024, 1, 2, 11, 0)
PREOP_LAB = utc_dt(2024, 1, 2, 8, 30)   # before SURGERY_START
INTRAOP_BLOOD = utc_dt(2024, 1, 2, 10, 0)  # between start and end
POSTOP_LAB = utc_dt(2024, 1, 2, 12, 0)  # after SURGERY_END
TRANSFUSION_T = utc_dt(2024, 1, 2, 10, 0)  # generic visit transfusion time
LAB_PRETRNSF = utc_dt(2024, 1, 2, 9, 30)   # 30 min before TRANSFUSION_T


# ---------------------------------------------------------------------------
# SurgeryCaseAttributes flag tests
# ---------------------------------------------------------------------------

class SurgeryCaseAttributesFlagTests(TransactionTestCase):
    """Validates SurgeryCaseAttributes fields used by the Data Management flags."""

    def setUp(self):
        truncate_intelvia_tables()

    def _make_visit_with_surgery(
        self,
        visit_no: int,
        case_id: int,
        *,
        provider_id: str | None = "PROV-SCA",
    ):
        """Visit + attending + surgery case. Returns (visit, surgery)."""
        if provider_id is not None:
            visit = create_empty_visit_fixture(
                visit_no=visit_no,
                mrn=f"MRN-{visit_no}",
                provider_ids=(provider_id,),
            )
        else:
            visit = create_empty_visit_fixture(
                visit_no=visit_no,
                mrn=f"MRN-{visit_no}",
                provider_ids=(),
            )
        surgery = add_surgery_case(
            visit=visit,
            case_id=case_id,
            surgery_start_dtm=SURGERY_START,
            surgery_end_dtm=SURGERY_END,
        )
        return visit, surgery

    def _add_preop_hgb(self, visit, lab_id: int, value: Decimal):
        add_lab(
            visit=visit,
            lab_id=lab_id,
            draw_dtm=PREOP_LAB,
            result_desc="HGB",
            result_value=value,
            result_code="HGB",
            result_loinc="718-7",
            uom_code="g/dL",
        )

    def _add_postop_hgb(self, visit, lab_id: int, value: Decimal):
        add_lab(
            visit=visit,
            lab_id=lab_id,
            draw_dtm=POSTOP_LAB,
            result_desc="HGB",
            result_value=value,
            result_code="HGB",
            result_loinc="718-7",
            uom_code="g/dL",
        )

    # -----------------------------------------------------------------------
    # Golden row: verifies pre/post/intraop field computation end-to-end
    # -----------------------------------------------------------------------
    def test_golden_row_full_attributes(self):
        visit, _ = self._make_visit_with_surgery(5001, 50001)

        # Pre-op labs (before surgery start)
        self._add_preop_hgb(visit, 500011, Decimal("9.0"))
        add_lab(
            visit=visit, lab_id=500012, draw_dtm=PREOP_LAB,
            result_desc="PLT", result_value=Decimal("180000"),
            result_code="PLT", result_loinc="777-3", uom_code="K/uL",
        )
        add_lab(
            visit=visit, lab_id=500013, draw_dtm=PREOP_LAB,
            result_desc="INR", result_value=Decimal("1.2"),
            result_code="INR", result_loinc="6301-6", uom_code="ratio",
        )
        add_lab(
            visit=visit, lab_id=500014, draw_dtm=PREOP_LAB,
            result_desc="FIBRINOGEN", result_value=Decimal("280"),
            result_code="FIB", result_loinc="3255-7", uom_code="mg/dL",
        )
        # Post-op lab (after surgery end)
        self._add_postop_hgb(visit, 500015, Decimal("7.8"))
        # Intraop transfusion
        add_transfusion(
            visit=visit, transfusion_rank=1, when=INTRAOP_BLOOD,
            blood_unit_number="RBC-5001", rbc_units=2, cell_saver_ml=500,
        )

        materialize_surgery_case_attributes()
        row = fetch_surgery_case_attributes_row(50001)

        self.assertIsNotNone(row)
        self.assertAlmostEqual(float(row["pre_hgb"]), 9.0)
        self.assertAlmostEqual(float(row["pre_plt"]), 180000)
        self.assertAlmostEqual(float(row["pre_inr"]), 1.2)
        self.assertAlmostEqual(float(row["pre_fibrinogen"]), 280)
        self.assertAlmostEqual(float(row["post_hgb"]), 7.8)
        self.assertEqual(row["intraop_rbc_units"], 2)
        self.assertEqual(row["intraop_cell_saver_ml"], 500)
        self.assertEqual(row["intraop_ffp_units"], 0)

    # -----------------------------------------------------------------------
    # Flag: missing_preop_hgb_with_rbc
    # whereClause: pre_hgb IS NULL AND intraop_rbc_units > 0
    # -----------------------------------------------------------------------
    def test_missing_preop_hgb_with_rbc_is_flagged(self):
        """No pre-op HGB lab but RBC transfused → flag should fire."""
        visit, _ = self._make_visit_with_surgery(5002, 50002)
        # No HGB lab at all
        add_transfusion(
            visit=visit, transfusion_rank=1, when=INTRAOP_BLOOD,
            blood_unit_number="RBC-5002", rbc_units=2,
        )

        materialize_surgery_case_attributes()
        row = fetch_surgery_case_attributes_row(50002)

        self.assertIsNone(row["pre_hgb"])
        self.assertGreater(row["intraop_rbc_units"], 0)

    def test_preop_hgb_present_with_rbc_not_flagged(self):
        """Pre-op HGB present → flag should NOT fire."""
        visit, _ = self._make_visit_with_surgery(5003, 50003)
        self._add_preop_hgb(visit, 500031, Decimal("8.5"))
        add_transfusion(
            visit=visit, transfusion_rank=1, when=INTRAOP_BLOOD,
            blood_unit_number="RBC-5003", rbc_units=2,
        )

        materialize_surgery_case_attributes()
        row = fetch_surgery_case_attributes_row(50003)

        self.assertIsNotNone(row["pre_hgb"])
        self.assertGreater(row["intraop_rbc_units"], 0)
        # Flag condition: pre_hgb IS NULL AND intraop_rbc_units > 0 → FALSE

    # -----------------------------------------------------------------------
    # Flag: impossible_lab_values
    # whereClause: (pre_hgb < 3 OR pre_hgb > 20) OR (pre_plt > 3000) OR (pre_inr > 20)
    # -----------------------------------------------------------------------
    def test_impossible_hgb_too_low_is_flagged(self):
        visit, _ = self._make_visit_with_surgery(5004, 50004)
        self._add_preop_hgb(visit, 500041, Decimal("1.5"))

        materialize_surgery_case_attributes()
        row = fetch_surgery_case_attributes_row(50004)

        self.assertAlmostEqual(float(row["pre_hgb"]), 1.5)
        self.assertLess(float(row["pre_hgb"]), 3.0)  # flag condition met

    def test_impossible_hgb_too_high_is_flagged(self):
        visit, _ = self._make_visit_with_surgery(5005, 50005)
        self._add_preop_hgb(visit, 500051, Decimal("22.0"))

        materialize_surgery_case_attributes()
        row = fetch_surgery_case_attributes_row(50005)

        self.assertAlmostEqual(float(row["pre_hgb"]), 22.0)
        self.assertGreater(float(row["pre_hgb"]), 20.0)  # flag condition met

    def test_impossible_plt_too_high_is_flagged(self):
        visit, _ = self._make_visit_with_surgery(5006, 50006)
        add_lab(
            visit=visit, lab_id=500061, draw_dtm=PREOP_LAB,
            result_desc="PLT", result_value=Decimal("3500"),
            result_code="PLT", result_loinc="777-3", uom_code="K/uL",
        )

        materialize_surgery_case_attributes()
        row = fetch_surgery_case_attributes_row(50006)

        self.assertAlmostEqual(float(row["pre_plt"]), 3500)
        self.assertGreater(float(row["pre_plt"]), 3000)  # flag condition met

    def test_impossible_inr_too_high_is_flagged(self):
        visit, _ = self._make_visit_with_surgery(5007, 50007)
        add_lab(
            visit=visit, lab_id=500071, draw_dtm=PREOP_LAB,
            result_desc="INR", result_value=Decimal("25.0"),
            result_code="INR", result_loinc="6301-6", uom_code="ratio",
        )

        materialize_surgery_case_attributes()
        row = fetch_surgery_case_attributes_row(50007)

        self.assertAlmostEqual(float(row["pre_inr"]), 25.0)
        self.assertGreater(float(row["pre_inr"]), 20.0)  # flag condition met

    def test_normal_labs_not_flagged_as_impossible(self):
        """Normal lab values → impossible_lab_values flag should NOT fire."""
        visit, _ = self._make_visit_with_surgery(5008, 50008)
        self._add_preop_hgb(visit, 500081, Decimal("12.0"))
        add_lab(
            visit=visit, lab_id=500082, draw_dtm=PREOP_LAB,
            result_desc="PLT", result_value=Decimal("200000"),
            result_code="PLT", result_loinc="777-3", uom_code="K/uL",
        )
        add_lab(
            visit=visit, lab_id=500083, draw_dtm=PREOP_LAB,
            result_desc="INR", result_value=Decimal("1.1"),
            result_code="INR", result_loinc="6301-6", uom_code="ratio",
        )

        materialize_surgery_case_attributes()
        row = fetch_surgery_case_attributes_row(50008)

        hgb = float(row["pre_hgb"])
        plt = float(row["pre_plt"])
        inr = float(row["pre_inr"])
        # None of the impossible conditions should be true
        self.assertFalse(hgb < 3 or hgb > 20)
        self.assertFalse(plt > 3000)
        self.assertFalse(inr > 20)

    # -----------------------------------------------------------------------
    # Flag: liberal_rbc_trigger
    # whereClause: pre_hgb IS NOT NULL AND pre_hgb >= 8.0 AND intraop_rbc_units > 0
    # -----------------------------------------------------------------------
    def test_liberal_rbc_trigger_is_flagged(self):
        """Hgb ≥ 8.0 with intraop RBC → liberal trigger flag fires."""
        visit, _ = self._make_visit_with_surgery(5009, 50009)
        self._add_preop_hgb(visit, 500091, Decimal("9.5"))
        add_transfusion(
            visit=visit, transfusion_rank=1, when=INTRAOP_BLOOD,
            blood_unit_number="RBC-5009", rbc_units=2,
        )

        materialize_surgery_case_attributes()
        row = fetch_surgery_case_attributes_row(50009)

        self.assertGreaterEqual(float(row["pre_hgb"]), 8.0)
        self.assertGreater(row["intraop_rbc_units"], 0)

    def test_low_hgb_with_rbc_not_liberal_trigger(self):
        """Hgb < 8.0 with intraop RBC → flag should NOT fire."""
        visit, _ = self._make_visit_with_surgery(5010, 50010)
        self._add_preop_hgb(visit, 500101, Decimal("6.5"))
        add_transfusion(
            visit=visit, transfusion_rank=1, when=INTRAOP_BLOOD,
            blood_unit_number="RBC-5010", rbc_units=2,
        )

        materialize_surgery_case_attributes()
        row = fetch_surgery_case_attributes_row(50010)

        self.assertLess(float(row["pre_hgb"]), 8.0)
        self.assertGreater(row["intraop_rbc_units"], 0)
        # Flag condition: pre_hgb >= 8.0 → FALSE

    # -----------------------------------------------------------------------
    # Flag: preop_anemia
    # whereClause: pre_hgb > 0 AND pre_hgb < 10
    # -----------------------------------------------------------------------
    def test_preop_anemia_is_flagged(self):
        """Hgb between 0 and 10 → preop_anemia flag fires."""
        visit, _ = self._make_visit_with_surgery(5011, 50011)
        self._add_preop_hgb(visit, 500111, Decimal("8.5"))

        materialize_surgery_case_attributes()
        row = fetch_surgery_case_attributes_row(50011)

        hgb = float(row["pre_hgb"])
        self.assertGreater(hgb, 0)
        self.assertLess(hgb, 10.0)

    def test_normal_hgb_not_preop_anemia(self):
        """Hgb >= 10 → preop_anemia flag should NOT fire."""
        visit, _ = self._make_visit_with_surgery(5012, 50012)
        self._add_preop_hgb(visit, 500121, Decimal("11.5"))

        materialize_surgery_case_attributes()
        row = fetch_surgery_case_attributes_row(50012)

        self.assertGreaterEqual(float(row["pre_hgb"]), 10.0)

    # -----------------------------------------------------------------------
    # Flag: large_hgb_drop_no_transfusion  (NEW)
    # whereClause: pre_hgb IS NOT NULL AND post_hgb IS NOT NULL
    #              AND (pre_hgb - post_hgb) >= 3.0 AND intraop_rbc_units = 0
    # Rationale: significant intraoperative blood loss without a transfusion —
    #            possible undertransfusion or documentation gap.
    # -----------------------------------------------------------------------
    def test_large_hgb_drop_no_transfusion_is_flagged(self):
        """Drop of 4 g/dL with no intraop RBC → flag fires."""
        visit, _ = self._make_visit_with_surgery(5013, 50013)
        self._add_preop_hgb(visit, 500131, Decimal("11.0"))
        self._add_postop_hgb(visit, 500132, Decimal("7.0"))
        # No intraop transfusion

        materialize_surgery_case_attributes()
        row = fetch_surgery_case_attributes_row(50013)

        pre = float(row["pre_hgb"])
        post = float(row["post_hgb"])
        self.assertIsNotNone(pre)
        self.assertIsNotNone(post)
        self.assertGreaterEqual(pre - post, 3.0)
        self.assertEqual(row["intraop_rbc_units"], 0)

    def test_large_hgb_drop_with_transfusion_not_flagged(self):
        """Same drop but intraop RBC given → flag should NOT fire."""
        visit, _ = self._make_visit_with_surgery(5014, 50014)
        self._add_preop_hgb(visit, 500141, Decimal("11.0"))
        self._add_postop_hgb(visit, 500142, Decimal("7.0"))
        add_transfusion(
            visit=visit, transfusion_rank=1, when=INTRAOP_BLOOD,
            blood_unit_number="RBC-5014", rbc_units=2,
        )

        materialize_surgery_case_attributes()
        row = fetch_surgery_case_attributes_row(50014)

        self.assertGreaterEqual(float(row["pre_hgb"]) - float(row["post_hgb"]), 3.0)
        self.assertGreater(row["intraop_rbc_units"], 0)
        # Flag condition: intraop_rbc_units = 0 → FALSE

    def test_small_hgb_drop_no_transfusion_not_flagged(self):
        """Drop < 3 g/dL → flag should NOT fire."""
        visit, _ = self._make_visit_with_surgery(5015, 50015)
        self._add_preop_hgb(visit, 500151, Decimal("10.0"))
        self._add_postop_hgb(visit, 500152, Decimal("8.5"))  # drop = 1.5

        materialize_surgery_case_attributes()
        row = fetch_surgery_case_attributes_row(50015)

        drop = float(row["pre_hgb"]) - float(row["post_hgb"])
        self.assertLess(drop, 3.0)
        # Flag condition: (pre_hgb - post_hgb) >= 3.0 → FALSE


# ---------------------------------------------------------------------------
# VisitAttributes flag tests
# ---------------------------------------------------------------------------

class VisitAttributesFlagTests(TransactionTestCase):
    """Validates VisitAttributes fields used by the Data Management flags."""

    def setUp(self):
        truncate_intelvia_tables()

    # -----------------------------------------------------------------------
    # Flag: no_provider
    # whereClause: attending_provider = 'No Provider'
    # -----------------------------------------------------------------------
    def test_null_attending_line_produces_no_provider_row(self):
        """Visit with attend_prov_line=NULL → VisitAttributes has 'No Provider' row."""
        visit = create_empty_visit_fixture(
            visit_no=5020,
            mrn="MRN-5020",
            provider_ids=(),
        )
        add_attending_provider(
            visit=visit,
            provider_id="GHOST",
            provider_line=None,   # triggers 'No Provider' bucket
            start=utc_dt(2024, 1, 1, 0, 0),
            end=utc_dt(2024, 1, 6, 0, 0),
        )
        add_transfusion(
            visit=visit, transfusion_rank=1, when=TRANSFUSION_T,
            blood_unit_number="RBC-5020", rbc_units=1,
        )

        materialize_visit_attributes()
        rows = fetch_visit_attributes_rows(5020)

        no_prov = [r for r in rows if r["attending_provider"] == "No Provider"]
        self.assertEqual(len(no_prov), 1)

    def test_real_provider_row_is_not_no_provider(self):
        """Visit with a real attending → no 'No Provider' row produced."""
        visit = create_empty_visit_fixture(
            visit_no=5021,
            mrn="MRN-5021",
            provider_ids=("PROV-5021",),
        )
        add_transfusion(
            visit=visit, transfusion_rank=1, when=TRANSFUSION_T,
            blood_unit_number="RBC-5021", rbc_units=1,
        )

        materialize_visit_attributes()
        rows = fetch_visit_attributes_rows(5021)

        no_prov = [r for r in rows if r["attending_provider"] == "No Provider"]
        self.assertEqual(len(no_prov), 0)

    # -----------------------------------------------------------------------
    # Flag: massive_transfusion
    # whereClause: rbc_units >= 10
    # -----------------------------------------------------------------------
    def test_ten_rbc_units_triggers_massive_transfusion_flag(self):
        visit = create_empty_visit_fixture(
            visit_no=5022,
            mrn="MRN-5022",
            provider_ids=("PROV-5022",),
        )
        # Two transfusion events totalling 10 RBC within provider window
        add_transfusion(
            visit=visit, transfusion_rank=1, when=TRANSFUSION_T,
            blood_unit_number="RBC-5022A", rbc_units=6,
        )
        add_transfusion(
            visit=visit, transfusion_rank=2, when=utc_dt(2024, 1, 2, 14, 0),
            blood_unit_number="RBC-5022B", rbc_units=4,
        )

        materialize_visit_attributes()
        rows = fetch_visit_attributes_rows(5022)
        primary = next(r for r in rows if r["is_admitting_attending"])

        self.assertGreaterEqual(primary["rbc_units"], 10)

    def test_nine_rbc_units_not_massive_transfusion(self):
        visit = create_empty_visit_fixture(
            visit_no=5023,
            mrn="MRN-5023",
            provider_ids=("PROV-5023",),
        )
        add_transfusion(
            visit=visit, transfusion_rank=1, when=TRANSFUSION_T,
            blood_unit_number="RBC-5023", rbc_units=9,
        )

        materialize_visit_attributes()
        rows = fetch_visit_attributes_rows(5023)
        primary = next(r for r in rows if r["is_admitting_attending"])

        self.assertLess(primary["rbc_units"], 10)

    # -----------------------------------------------------------------------
    # Flag: fully_non_adherent_rbc
    # whereClause: rbc_units > 0 AND rbc_units_adherent = 0
    # -----------------------------------------------------------------------
    def test_rbc_above_threshold_scores_zero_adherent_units(self):
        """Hgb 9.5 (above all thresholds, no special criteria) → rbc_units_adherent = 0."""
        visit = create_empty_visit_fixture(
            visit_no=5024,
            mrn="MRN-5024",
            provider_ids=("PROV-5024",),
        )
        # Lab within 24h before transfusion
        add_lab(
            visit=visit, lab_id=502401, draw_dtm=LAB_PRETRNSF,
            result_desc="HGB", result_value=Decimal("9.5"),
            result_code="HGB", result_loinc="718-7", uom_code="g/dL",
        )
        add_transfusion(
            visit=visit, transfusion_rank=1, when=TRANSFUSION_T,
            blood_unit_number="RBC-5024", rbc_units=1,
        )

        materialize_visit_attributes()
        rows = fetch_visit_attributes_rows(5024)
        primary = next(r for r in rows if r["is_admitting_attending"])

        self.assertGreater(primary["rbc_units"], 0)
        self.assertEqual(primary["rbc_units_adherent"], 0)

    def test_rbc_below_threshold_scores_all_units_adherent(self):
        """Hgb 6.5 (< 7.0) → all RBC units are adherent."""
        visit = create_empty_visit_fixture(
            visit_no=5025,
            mrn="MRN-5025",
            provider_ids=("PROV-5025",),
        )
        add_lab(
            visit=visit, lab_id=502501, draw_dtm=LAB_PRETRNSF,
            result_desc="HGB", result_value=Decimal("6.5"),
            result_code="HGB", result_loinc="718-7", uom_code="g/dL",
        )
        add_transfusion(
            visit=visit, transfusion_rank=1, when=TRANSFUSION_T,
            blood_unit_number="RBC-5025", rbc_units=2,
        )

        materialize_visit_attributes()
        rows = fetch_visit_attributes_rows(5025)
        primary = next(r for r in rows if r["is_admitting_attending"])

        self.assertEqual(primary["rbc_units"], 2)
        self.assertEqual(primary["rbc_units_adherent"], 2)

    # -----------------------------------------------------------------------
    # Flag: non_adherent_ffp  (NEW)
    # whereClause: ffp_units > 0 AND ffp_units_adherent = 0
    # Rationale: FFP given but INR below guideline threshold (< 2.0) and no
    #            massive-transfusion trigger — unwarranted plasma exposure.
    # -----------------------------------------------------------------------
    def test_ffp_with_low_inr_scores_zero_adherent_ffp(self):
        """INR 1.2 (< 2.0), no bleeding, <3 FFP in 4h → ffp_units_adherent = 0."""
        visit = create_empty_visit_fixture(
            visit_no=5026,
            mrn="MRN-5026",
            provider_ids=("PROV-5026",),
        )
        add_lab(
            visit=visit, lab_id=502601, draw_dtm=LAB_PRETRNSF,
            result_desc="INR", result_value=Decimal("1.2"),
            result_code="INR", result_loinc="6301-6", uom_code="ratio",
        )
        add_transfusion(
            visit=visit, transfusion_rank=1, when=TRANSFUSION_T,
            blood_unit_number="FFP-5026", ffp_units=1,
        )

        materialize_visit_attributes()
        rows = fetch_visit_attributes_rows(5026)
        primary = next(r for r in rows if r["is_admitting_attending"])

        self.assertGreater(primary["ffp_units"], 0)
        self.assertEqual(primary["ffp_units_adherent"], 0)

    def test_ffp_with_high_inr_scores_all_units_adherent(self):
        """INR 2.5 (≥ 2.0), no bleeding, <4 RBC in 4h → all FFP units are adherent."""
        visit = create_empty_visit_fixture(
            visit_no=5027,
            mrn="MRN-5027",
            provider_ids=("PROV-5027",),
        )
        add_lab(
            visit=visit, lab_id=502701, draw_dtm=LAB_PRETRNSF,
            result_desc="INR", result_value=Decimal("2.5"),
            result_code="INR", result_loinc="6301-6", uom_code="ratio",
        )
        add_transfusion(
            visit=visit, transfusion_rank=1, when=TRANSFUSION_T,
            blood_unit_number="FFP-5027", ffp_units=1,
        )

        materialize_visit_attributes()
        rows = fetch_visit_attributes_rows(5027)
        primary = next(r for r in rows if r["is_admitting_attending"])

        self.assertEqual(primary["ffp_units"], 1)
        self.assertEqual(primary["ffp_units_adherent"], 1)

    # -----------------------------------------------------------------------
    # Flag: non_adherent_plt  (NEW)
    # whereClause: plt_units > 0 AND plt_units_adherent = 0
    # Rationale: Platelets given when count was well above all guideline
    #            thresholds (≥ 100K) — transfusion is clinically unwarranted.
    # -----------------------------------------------------------------------
    def test_plt_with_high_count_scores_zero_adherent_units(self):
        """PLT count 250,000 (above all thresholds, no special procedures) → plt_units_adherent = 0."""
        visit = create_empty_visit_fixture(
            visit_no=5028,
            mrn="MRN-5028",
            provider_ids=("PROV-5028",),
        )
        add_lab(
            visit=visit, lab_id=502801, draw_dtm=LAB_PRETRNSF,
            result_desc="PLT", result_value=Decimal("250000"),
            result_code="PLT", result_loinc="777-3", uom_code="K/uL",
        )
        add_transfusion(
            visit=visit, transfusion_rank=1, when=TRANSFUSION_T,
            blood_unit_number="PLT-5028", plt_units=1,
        )

        materialize_visit_attributes()
        rows = fetch_visit_attributes_rows(5028)
        primary = next(r for r in rows if r["is_admitting_attending"])

        self.assertGreater(primary["plt_units"], 0)
        self.assertEqual(primary["plt_units_adherent"], 0)

    def test_plt_with_critically_low_count_scores_all_units_adherent(self):
        """PLT count 5,000 (< 10,000 — adherent at any context) → all PLT units adherent."""
        visit = create_empty_visit_fixture(
            visit_no=5029,
            mrn="MRN-5029",
            provider_ids=("PROV-5029",),
        )
        add_lab(
            visit=visit, lab_id=502901, draw_dtm=LAB_PRETRNSF,
            result_desc="PLT", result_value=Decimal("5000"),
            result_code="PLT", result_loinc="777-3", uom_code="K/uL",
        )
        add_transfusion(
            visit=visit, transfusion_rank=1, when=TRANSFUSION_T,
            blood_unit_number="PLT-5029", plt_units=1,
        )

        materialize_visit_attributes()
        rows = fetch_visit_attributes_rows(5029)
        primary = next(r for r in rows if r["is_admitting_attending"])

        self.assertEqual(primary["plt_units"], 1)
        self.assertEqual(primary["plt_units_adherent"], 1)
