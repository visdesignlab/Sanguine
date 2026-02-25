from datetime import date
from decimal import Decimal

from django.db import DatabaseError, connection
from django.test import TransactionTestCase

from api.models.intelvia import Visit

from .materialized_view_test_utils import (
    add_billing_code,
    add_lab,
    add_medication,
    add_transfusion,
    count_visit_attributes_rows,
    create_empty_visit_fixture,
    create_visit_fixture,
    fetch_visit_attributes_rows,
    materialize_visit_attributes,
    truncate_intelvia_tables,
    utc_dt,
)


class MaterializedViewTests(TransactionTestCase):
    def assert_row_matches(self, row: dict, expected: dict) -> None:
        for key, expected_value in expected.items():
            with self.subTest(column=key):
                if isinstance(expected_value, float):
                    self.assertAlmostEqual(row[key], expected_value)
                else:
                    self.assertEqual(row[key], expected_value)

    def setUp(self):
        truncate_intelvia_tables()

    def test_migrations_create_materialization_objects(self):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*) FROM information_schema.tables
                WHERE table_schema = DATABASE()
                  AND table_name = 'VisitAttributes'
                """
            )
            visit_attributes_table_count = cursor.fetchone()[0]

            cursor.execute(
                """
                SELECT COUNT(*) FROM information_schema.routines
                WHERE routine_schema = DATABASE()
                  AND routine_type = 'PROCEDURE'
                  AND routine_name = 'materializeVisitAttributes'
                """
            )
            materialize_proc_count = cursor.fetchone()[0]

        self.assertEqual(visit_attributes_table_count, 1)
        self.assertEqual(materialize_proc_count, 1)

    def test_materialize_visit_attributes_full_row_golden_for_each_provider(self):
        visit = create_visit_fixture(
            visit_no=1001,
            mrn="MRN-1001",
            provider_ids=("PROV-A", "PROV-B"),
            hgb_result=Decimal("7.1"),
            inr_result=Decimal("1.8"),
            plt_result=Decimal("20000"),
            fibrinogen_result=Decimal("200"),
        )

        materialize_visit_attributes()
        rows = fetch_visit_attributes_rows(visit.visit_no)
        self.assertEqual(len(rows), 2)

        first, second = rows

        self.assert_row_matches(
            first,
            {
                "id": "1001-1",
                "visit_no": 1001,
                "mrn": "MRN-1001",
                "adm_dtm": date(2024, 1, 1),
                "dsch_dtm": date(2024, 1, 5),
                "age_at_adm": 64,
                "pat_class_desc": "Inpatient",
                "apr_drg_weight": 1.4,
                "ms_drg_weight": 2.1,
                "month": "2024-Jan",
                "quarter": "2024-Q1",
                "year": "2024",
                "rbc_units": 2,
                "ffp_units": 1,
                "plt_units": 1,
                "cryo_units": 1,
                "whole_units": 0,
                "cell_saver_ml": 0,
                "overall_units": 5,
                "los": 4.0,
                "death": 0,
                "vent": 1,
                "stroke": 1,
                "ecmo": 1,
                "b12": 1,
                "iron": 1,
                "antifibrinolytic": 1,
                "rbc_adherent": 1,
                "ffp_adherent": 1,
                "plt_adherent": 1,
                "cryo_adherent": 1,
                "overall_adherent": 4,
                "rbc_units_cost": Decimal("400.00"),
                "ffp_units_cost": Decimal("50.00"),
                "plt_units_cost": Decimal("500.00"),
                "cryo_units_cost": Decimal("30.00"),
                "overall_cost": Decimal("980.00"),
                "attending_provider": "Provider PROV-A",
                "attending_provider_id": "PROV-A",
                "attending_provider_line": 1,
                "is_admitting_attending": 1,
            },
        )

        self.assert_row_matches(
            second,
            {
                "id": "1001-2",
                "visit_no": 1001,
                "mrn": "MRN-1001",
                "adm_dtm": date(2024, 1, 1),
                "dsch_dtm": date(2024, 1, 5),
                "age_at_adm": 64,
                "pat_class_desc": "Inpatient",
                "apr_drg_weight": 1.4,
                "ms_drg_weight": 2.1,
                "month": "2024-Jan",
                "quarter": "2024-Q1",
                "year": "2024",
                "rbc_units": 0,
                "ffp_units": 0,
                "plt_units": 0,
                "cryo_units": 0,
                "whole_units": 0,
                "cell_saver_ml": 0,
                "overall_units": 0,
                "los": None,
                "death": None,
                "vent": None,
                "stroke": None,
                "ecmo": None,
                "b12": 0,
                "iron": 0,
                "antifibrinolytic": 0,
                "rbc_adherent": 0,
                "ffp_adherent": 0,
                "plt_adherent": 0,
                "cryo_adherent": 0,
                "overall_adherent": 0,
                "rbc_units_cost": Decimal("0.00"),
                "ffp_units_cost": Decimal("0.00"),
                "plt_units_cost": Decimal("0.00"),
                "cryo_units_cost": Decimal("0.00"),
                "overall_cost": Decimal("0.00"),
                "attending_provider": "Provider PROV-B",
                "attending_provider_id": "PROV-B",
                "attending_provider_line": 2,
                "is_admitting_attending": 0,
            },
        )

    def test_materialize_visit_attributes_assigns_overlap_events_to_lowest_provider_line(self):
        visit = create_empty_visit_fixture(
            visit_no=1002,
            mrn="MRN-1002",
            provider_ids=("PROV-1", "PROV-2"),
        )

        add_transfusion(
            visit=visit,
            transfusion_rank=1,
            when=utc_dt(2024, 1, 2, 10, 0),
            blood_unit_number="RBC-1002",
            rbc_units=1,
        )
        add_lab(
            visit=visit,
            lab_id=10021,
            draw_dtm=utc_dt(2024, 1, 2, 9, 30),
            result_desc="HGB",
            result_value=Decimal("7.0"),
            result_code="HGB",
            result_loinc="718-7",
            uom_code="g/dL",
        )
        add_medication(
            visit=visit,
            order_med_id=Decimal("100201"),
            medication_name="Ferrous Sulfate",
            admin_dtm=utc_dt(2024, 1, 2, 10, 10),
        )

        materialize_visit_attributes()
        first, second = fetch_visit_attributes_rows(visit.visit_no)

        self.assertEqual(first["attending_provider_id"], "PROV-1")
        self.assertEqual(first["rbc_units"], 1)
        self.assertEqual(first["rbc_adherent"], 1)
        self.assertEqual(first["iron"], 1)

        self.assertEqual(second["attending_provider_id"], "PROV-2")
        self.assertEqual(second["rbc_units"], 0)
        self.assertEqual(second["rbc_adherent"], 0)
        self.assertEqual(second["iron"], 0)

    def test_materialize_visit_attributes_enforces_adherence_threshold_boundaries(self):
        cases = [
            {
                "name": "exact_thresholds_are_adherent",
                "visit_no": 1003,
                "hgb": Decimal("7.5"),
                "inr": Decimal("1.5"),
                "plt": Decimal("15000"),
                "fib": Decimal("175"),
                "expected": (1, 1, 1, 1, 4),
            },
            {
                "name": "off_by_one_thresholds_are_non_adherent",
                "visit_no": 1004,
                "hgb": Decimal("7.6"),
                "inr": Decimal("1.49"),
                "plt": Decimal("14999"),
                "fib": Decimal("174.9"),
                "expected": (0, 0, 0, 0, 0),
            },
        ]

        for case in cases:
            with self.subTest(case=case["name"]):
                visit = create_visit_fixture(
                    visit_no=case["visit_no"],
                    mrn=f"MRN-{case['visit_no']}",
                    provider_ids=(f"PROV-{case['visit_no']}",),
                    hgb_result=case["hgb"],
                    inr_result=case["inr"],
                    plt_result=case["plt"],
                    fibrinogen_result=case["fib"],
                )

                materialize_visit_attributes()
                row = fetch_visit_attributes_rows(visit.visit_no)[0]
                self.assertEqual(
                    (
                        row["rbc_adherent"],
                        row["ffp_adherent"],
                        row["plt_adherent"],
                        row["cryo_adherent"],
                        row["overall_adherent"],
                    ),
                    case["expected"],
                )

    def test_materialize_visit_attributes_uses_latest_lab_within_two_hour_window(self):
        visit = create_empty_visit_fixture(
            visit_no=1005,
            mrn="MRN-1005",
            provider_ids=("PROV-LAB",),
        )
        add_transfusion(
            visit=visit,
            transfusion_rank=1,
            when=utc_dt(2024, 1, 2, 12, 0),
            blood_unit_number="RBC-1005",
            rbc_units=1,
        )
        add_lab(
            visit=visit,
            lab_id=10051,
            draw_dtm=utc_dt(2024, 1, 2, 9, 0),  # outside window
            result_desc="HGB",
            result_value=Decimal("6.0"),
            result_code="HGB",
            result_loinc="718-7",
            uom_code="g/dL",
        )
        add_lab(
            visit=visit,
            lab_id=10052,
            draw_dtm=utc_dt(2024, 1, 2, 10, 30),  # inside window, older
            result_desc="HGB",
            result_value=Decimal("6.8"),
            result_code="HGB",
            result_loinc="718-7",
            uom_code="g/dL",
        )
        add_lab(
            visit=visit,
            lab_id=10053,
            draw_dtm=utc_dt(2024, 1, 2, 11, 30),  # inside window, latest
            result_desc="HGB",
            result_value=Decimal("8.0"),
            result_code="HGB",
            result_loinc="718-7",
            uom_code="g/dL",
        )

        materialize_visit_attributes()
        row = fetch_visit_attributes_rows(visit.visit_no)[0]

        self.assertEqual(row["rbc_units"], 1)
        self.assertEqual(row["rbc_adherent"], 0)

    def test_materialize_visit_attributes_treats_null_lab_results_as_non_adherent(self):
        visit = create_empty_visit_fixture(
            visit_no=1006,
            mrn="MRN-1006",
            provider_ids=("PROV-NULL-LAB",),
        )
        add_transfusion(
            visit=visit,
            transfusion_rank=1,
            when=utc_dt(2024, 1, 2, 12, 0),
            blood_unit_number="RBC-1006",
            rbc_units=1,
        )
        add_lab(
            visit=visit,
            lab_id=10061,
            draw_dtm=utc_dt(2024, 1, 2, 11, 30),
            result_desc="HGB",
            result_value=None,
            result_code="HGB",
            result_loinc="718-7",
            uom_code="g/dL",
        )

        materialize_visit_attributes()
        row = fetch_visit_attributes_rows(visit.visit_no)[0]
        self.assertEqual(row["rbc_adherent"], 0)

    def test_materialize_visit_attributes_coalesces_nullable_transfusion_fields(self):
        visit = create_empty_visit_fixture(
            visit_no=1007,
            mrn="MRN-1007",
            provider_ids=("PROV-NULL-TRN",),
        )
        add_transfusion(
            visit=visit,
            transfusion_rank=1,
            when=utc_dt(2024, 1, 2, 10, 0),
            blood_unit_number="NULLS-1007",
            rbc_units=None,
            ffp_units=None,
            plt_units=None,
            cryo_units=None,
            whole_units=None,
            rbc_vol=None,
            ffp_vol=None,
            plt_vol=None,
            cryo_vol=None,
            whole_vol=None,
            cell_saver_ml=None,
        )
        add_transfusion(
            visit=visit,
            transfusion_rank=2,
            when=utc_dt(2024, 1, 2, 11, 0),
            blood_unit_number="FFP-1007",
            ffp_units=1,
            cell_saver_ml=None,
        )

        materialize_visit_attributes()
        row = fetch_visit_attributes_rows(visit.visit_no)[0]

        self.assertEqual(row["rbc_units"], 0)
        self.assertEqual(row["ffp_units"], 1)
        self.assertEqual(row["plt_units"], 0)
        self.assertEqual(row["cryo_units"], 0)
        self.assertEqual(row["whole_units"], 0)
        self.assertEqual(row["cell_saver_ml"], 0)
        self.assertEqual(row["overall_units"], 1)

    def test_materialize_visit_attributes_ignores_unmatched_medications_and_billing_codes(self):
        visit = create_empty_visit_fixture(
            visit_no=1008,
            mrn="MRN-1008",
            provider_ids=("PROV-BOGUS",),
            total_vent_mins=0,
        )
        add_medication(
            visit=visit,
            order_med_id=Decimal("100801"),
            medication_name="Completely Unknown Medication",
            admin_dtm=utc_dt(2024, 1, 2, 9, 0),
        )
        add_billing_code(
            visit=visit,
            cpt_code="ABC??",
            proc_dtm=utc_dt(2024, 1, 2, 9, 0),
            provider_id="PROV-BOGUS",
            code_rank=1,
        )
        add_billing_code(
            visit=visit,
            cpt_code="",
            proc_dtm=utc_dt(2024, 1, 2, 9, 5),
            provider_id="PROV-BOGUS",
            code_rank=2,
        )

        materialize_visit_attributes()
        row = fetch_visit_attributes_rows(visit.visit_no)[0]

        self.assertEqual(row["b12"], 0)
        self.assertEqual(row["iron"], 0)
        self.assertEqual(row["antifibrinolytic"], 0)
        self.assertEqual(row["stroke"], 0)
        self.assertEqual(row["ecmo"], 0)

    def test_materialize_visit_attributes_only_assigns_outcomes_to_admitting_attending(self):
        visit = create_visit_fixture(
            visit_no=1009,
            mrn="MRN-1009",
            provider_ids=("PROV-OUT-1", "PROV-OUT-2"),
            hgb_result=Decimal("7.0"),
            inr_result=Decimal("1.8"),
            plt_result=Decimal("17000"),
            fibrinogen_result=Decimal("200"),
        )
        Visit.objects.filter(visit_no=visit.visit_no).update(
            clinical_los=Decimal("5.25"),
            pat_expired_f="Y",
            total_vent_mins=2000,
        )

        materialize_visit_attributes()
        first, second = fetch_visit_attributes_rows(visit.visit_no)

        self.assertEqual(first["los"], 5.25)
        self.assertEqual(first["death"], 1)
        self.assertEqual(first["vent"], 1)
        self.assertEqual(first["stroke"], 1)
        self.assertEqual(first["ecmo"], 1)

        self.assertIsNone(second["los"])
        self.assertIsNone(second["death"])
        self.assertIsNone(second["vent"])
        self.assertIsNone(second["stroke"])
        self.assertIsNone(second["ecmo"])

    def test_materialize_visit_attributes_is_idempotent_and_reflects_current_source_data(self):
        visit = create_empty_visit_fixture(
            visit_no=1010,
            mrn="MRN-1010",
            provider_ids=("PROV-IDEMP",),
        )
        add_transfusion(
            visit=visit,
            transfusion_rank=1,
            when=utc_dt(2024, 1, 2, 10, 0),
            blood_unit_number="RBC-1010-1",
            rbc_units=2,
        )

        materialize_visit_attributes()
        first_run = fetch_visit_attributes_rows(visit.visit_no)[0]
        self.assertEqual(first_run["rbc_units"], 2)
        self.assertEqual(count_visit_attributes_rows(visit.visit_no), 1)

        add_transfusion(
            visit=visit,
            transfusion_rank=2,
            when=utc_dt(2024, 1, 2, 11, 0),
            blood_unit_number="RBC-1010-2",
            rbc_units=1,
        )

        materialize_visit_attributes()
        second_run = fetch_visit_attributes_rows(visit.visit_no)[0]
        self.assertEqual(second_run["rbc_units"], 3)
        self.assertEqual(count_visit_attributes_rows(visit.visit_no), 1)

    def test_materialize_visit_attributes_fails_fast_for_unsigned_overflow_values(self):
        visit = create_empty_visit_fixture(
            visit_no=1011,
            mrn="MRN-1011",
            provider_ids=("PROV-OVERFLOW",),
        )
        add_transfusion(
            visit=visit,
            transfusion_rank=1,
            when=utc_dt(2024, 1, 2, 10, 0),
            blood_unit_number="RBC-OVERFLOW",
            rbc_units=70000,
        )

        with self.assertRaises(DatabaseError):
            materialize_visit_attributes()
