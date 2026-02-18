from datetime import date, datetime, timezone
from decimal import Decimal

from django.db import connection
from django.test import TransactionTestCase

from api.models.intelvia import (
    AttendingProvider,
    BillingCode,
    Lab,
    Medication,
    Patient,
    Transfusion,
    Visit,
)


TABLES_TO_TRUNCATE = [
    "VisitAttributes",
    "GuidelineAdherence",
    "BillingCode",
    "Medication",
    "Lab",
    "Transfusion",
    "AttendingProvider",
    "RoomTrace",
    "SurgeryCase",
    "Visit",
    "Patient",
]


def utc_dt(year: int, month: int, day: int, hour: int, minute: int = 0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=timezone.utc)


def fetch_visit_attributes(visit_no: int) -> list[dict]:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                visit_no,
                attending_provider_id,
                attending_provider_line,
                month,
                quarter,
                year,
                rbc_units,
                ffp_units,
                plt_units,
                cryo_units,
                whole_units,
                overall_units,
                rbc_adherent,
                ffp_adherent,
                plt_adherent,
                cryo_adherent,
                overall_adherent,
                b12,
                iron,
                antifibrinolytic,
                los,
                death,
                vent,
                stroke,
                ecmo,
                is_admitting_attending
            FROM VisitAttributes
            WHERE visit_no = %s
            ORDER BY attending_provider_line
            """,
            [visit_no],
        )
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]


def materialize_visit_attributes() -> None:
    with connection.cursor() as cursor:
        cursor.execute("CALL materializeVisitAttributes()")


def create_visit_fixture(
    *,
    visit_no: int,
    mrn: str,
    provider_ids: tuple[str, ...],
    hgb_result: Decimal,
    inr_result: Decimal,
    plt_result: Decimal,
    fibrinogen_result: Decimal,
) -> Visit:
    patient = Patient.objects.create(
        mrn=mrn,
        last_name="Patient",
        first_name="Fixture",
        birth_date=date(1960, 1, 1),
        sex_code="F",
        race_desc="Unknown",
        ethnicity_desc="Unknown",
    )

    visit = Visit.objects.create(
        visit_no=visit_no,
        mrn=patient,
        epic_pat_id=f"EPIC-{visit_no}",
        hsp_account_id=f"HSP-{visit_no}",
        adm_dtm=date(2024, 1, 1),
        dsch_dtm=date(2024, 1, 5),
        clinical_los=Decimal("4.00"),
        age_at_adm=64,
        pat_class_desc="Inpatient",
        pat_expired_f="N",
        total_vent_mins=1501,
        total_vent_days=1.1,
        apr_drg_code="100",
        apr_drg_desc="Fixture DRG",
        apr_drg_weight=1.4,
        ms_drg_weight=2.1,
    )

    for provider_line, provider_id in enumerate(provider_ids, start=1):
        AttendingProvider.objects.create(
            visit_no=visit,
            prov_id=provider_id,
            prov_name=f"Provider {provider_id}",
            attend_start_dtm=utc_dt(2024, 1, 1, 0, 0),
            attend_end_dtm=utc_dt(2024, 1, 6, 0, 0),
            attend_prov_line=provider_line,
        )

    Transfusion.objects.create(
        visit_no=visit,
        trnsfsn_dtm=utc_dt(2024, 1, 2, 10, 0),
        transfusion_rank=1,
        blood_unit_number=f"RBC-{visit_no}",
        rbc_units=2,
        ffp_units=0,
        plt_units=0,
        cryo_units=0,
        whole_units=0,
        rbc_vol=0,
        ffp_vol=0,
        plt_vol=0,
        cryo_vol=0,
        whole_vol=0,
        cell_saver_ml=0,
    )
    Transfusion.objects.create(
        visit_no=visit,
        trnsfsn_dtm=utc_dt(2024, 1, 2, 11, 0),
        transfusion_rank=2,
        blood_unit_number=f"FFP-{visit_no}",
        rbc_units=0,
        ffp_units=1,
        plt_units=0,
        cryo_units=0,
        whole_units=0,
        rbc_vol=0,
        ffp_vol=0,
        plt_vol=0,
        cryo_vol=0,
        whole_vol=0,
        cell_saver_ml=0,
    )
    Transfusion.objects.create(
        visit_no=visit,
        trnsfsn_dtm=utc_dt(2024, 1, 2, 11, 30),
        transfusion_rank=3,
        blood_unit_number=f"PLT-{visit_no}",
        rbc_units=0,
        ffp_units=0,
        plt_units=1,
        cryo_units=0,
        whole_units=0,
        rbc_vol=0,
        ffp_vol=0,
        plt_vol=0,
        cryo_vol=0,
        whole_vol=0,
        cell_saver_ml=0,
    )
    Transfusion.objects.create(
        visit_no=visit,
        trnsfsn_dtm=utc_dt(2024, 1, 2, 12, 0),
        transfusion_rank=4,
        blood_unit_number=f"CRYO-{visit_no}",
        rbc_units=0,
        ffp_units=0,
        plt_units=0,
        cryo_units=1,
        whole_units=0,
        rbc_vol=0,
        ffp_vol=0,
        plt_vol=0,
        cryo_vol=0,
        whole_vol=0,
        cell_saver_ml=0,
    )

    Lab.objects.create(
        visit_no=visit,
        mrn=patient,
        lab_id=visit_no * 10 + 1,
        lab_draw_dtm=utc_dt(2024, 1, 2, 9, 30),
        lab_panel_code="CBC",
        lab_panel_desc="CBC",
        result_dtm=utc_dt(2024, 1, 2, 9, 35),
        result_code="HGB",
        result_loinc="718-7",
        result_desc="HGB",
        result_value=hgb_result,
        uom_code="g/dL",
    )
    Lab.objects.create(
        visit_no=visit,
        mrn=patient,
        lab_id=visit_no * 10 + 2,
        lab_draw_dtm=utc_dt(2024, 1, 2, 10, 40),
        lab_panel_code="COAG",
        lab_panel_desc="COAG",
        result_dtm=utc_dt(2024, 1, 2, 10, 45),
        result_code="INR",
        result_loinc="6301-6",
        result_desc="INR",
        result_value=inr_result,
        uom_code="ratio",
    )
    Lab.objects.create(
        visit_no=visit,
        mrn=patient,
        lab_id=visit_no * 10 + 3,
        lab_draw_dtm=utc_dt(2024, 1, 2, 11, 10),
        lab_panel_code="CBC",
        lab_panel_desc="CBC",
        result_dtm=utc_dt(2024, 1, 2, 11, 15),
        result_code="PLT",
        result_loinc="777-3",
        result_desc="PLT",
        result_value=plt_result,
        uom_code="K/uL",
    )
    Lab.objects.create(
        visit_no=visit,
        mrn=patient,
        lab_id=visit_no * 10 + 4,
        lab_draw_dtm=utc_dt(2024, 1, 2, 11, 45),
        lab_panel_code="COAG",
        lab_panel_desc="COAG",
        result_dtm=utc_dt(2024, 1, 2, 11, 50),
        result_code="FIB",
        result_loinc="3255-7",
        result_desc="FIBRINOGEN",
        result_value=fibrinogen_result,
        uom_code="mg/dL",
    )

    Medication.objects.create(
        visit_no=visit,
        order_med_id=Decimal(visit_no * 100 + 1),
        order_dtm=utc_dt(2024, 1, 2, 9, 0),
        medication_id=Decimal(111),
        medication_name="Vitamin B12 Injection",
        med_admin_line=Decimal(1),
        admin_dtm=utc_dt(2024, 1, 2, 9, 15),
        admin_dose="1000",
        med_form="Injection",
        admin_route_desc="IV",
        dose_unit_desc="mcg",
        med_start_dtm=utc_dt(2024, 1, 2, 9, 0),
        med_end_dtm=utc_dt(2024, 1, 2, 9, 20),
    )
    Medication.objects.create(
        visit_no=visit,
        order_med_id=Decimal(visit_no * 100 + 2),
        order_dtm=utc_dt(2024, 1, 2, 9, 0),
        medication_id=Decimal(222),
        medication_name="Ferrous Sulfate",
        med_admin_line=Decimal(1),
        admin_dtm=utc_dt(2024, 1, 2, 9, 25),
        admin_dose="325",
        med_form="Tablet",
        admin_route_desc="PO",
        dose_unit_desc="mg",
        med_start_dtm=utc_dt(2024, 1, 2, 9, 20),
        med_end_dtm=utc_dt(2024, 1, 2, 9, 30),
    )
    Medication.objects.create(
        visit_no=visit,
        order_med_id=Decimal(visit_no * 100 + 3),
        order_dtm=utc_dt(2024, 1, 2, 9, 0),
        medication_id=Decimal(333),
        medication_name="Tranexamic Acid",
        med_admin_line=Decimal(1),
        admin_dtm=utc_dt(2024, 1, 2, 9, 35),
        admin_dose="1000",
        med_form="Injection",
        admin_route_desc="IV",
        dose_unit_desc="mg",
        med_start_dtm=utc_dt(2024, 1, 2, 9, 30),
        med_end_dtm=utc_dt(2024, 1, 2, 9, 40),
    )

    BillingCode.objects.create(
        visit_no=visit,
        cpt_code="99291",
        cpt_code_desc="Critical care, first hour",
        proc_dtm=utc_dt(2024, 1, 2, 8, 0),
        prov_id=provider_ids[0],
        prov_name=f"Provider {provider_ids[0]}",
        code_rank=1,
    )
    BillingCode.objects.create(
        visit_no=visit,
        cpt_code="33946",
        cpt_code_desc="ECMO initiation",
        proc_dtm=utc_dt(2024, 1, 2, 8, 5),
        prov_id=provider_ids[0],
        prov_name=f"Provider {provider_ids[0]}",
        code_rank=2,
    )

    return visit


class MaterializedViewTests(TransactionTestCase):
    def setUp(self):
        with connection.cursor() as cursor:
            cursor.execute("SHOW TABLES")
            existing_tables = {row[0].lower() for row in cursor.fetchall()}

            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            try:
                for table_name in TABLES_TO_TRUNCATE:
                    if table_name.lower() in existing_tables:
                        cursor.execute(f"TRUNCATE TABLE `{table_name}`")
            finally:
                cursor.execute("SET FOREIGN_KEY_CHECKS = 1")

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

    def test_materialize_visit_attributes_assigns_data_to_primary_attending(self):
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
        rows = fetch_visit_attributes(visit.visit_no)

        self.assertEqual(len(rows), 2)

        first_attending, second_attending = rows
        self.assertEqual(first_attending["attending_provider_id"], "PROV-A")
        self.assertEqual(first_attending["attending_provider_line"], 1)
        self.assertEqual(first_attending["month"], "2024-Jan")
        self.assertEqual(first_attending["quarter"], "2024-Q1")
        self.assertEqual(first_attending["year"], "2024")
        self.assertEqual(first_attending["rbc_units"], 2)
        self.assertEqual(first_attending["ffp_units"], 1)
        self.assertEqual(first_attending["plt_units"], 1)
        self.assertEqual(first_attending["cryo_units"], 1)
        self.assertEqual(first_attending["whole_units"], 0)
        self.assertEqual(first_attending["overall_units"], 5)
        self.assertEqual(first_attending["rbc_adherent"], 1)
        self.assertEqual(first_attending["ffp_adherent"], 1)
        self.assertEqual(first_attending["plt_adherent"], 1)
        self.assertEqual(first_attending["cryo_adherent"], 1)
        self.assertEqual(first_attending["overall_adherent"], 4)
        self.assertEqual(first_attending["b12"], 1)
        self.assertEqual(first_attending["iron"], 1)
        self.assertEqual(first_attending["antifibrinolytic"], 1)
        self.assertEqual(first_attending["los"], 4)
        self.assertEqual(first_attending["death"], 0)
        self.assertEqual(first_attending["vent"], 1)
        self.assertEqual(first_attending["stroke"], 1)
        self.assertEqual(first_attending["ecmo"], 1)
        self.assertEqual(first_attending["is_admitting_attending"], 1)

        self.assertEqual(second_attending["attending_provider_id"], "PROV-B")
        self.assertEqual(second_attending["attending_provider_line"], 2)
        self.assertEqual(second_attending["rbc_units"], 0)
        self.assertEqual(second_attending["ffp_units"], 0)
        self.assertEqual(second_attending["plt_units"], 0)
        self.assertEqual(second_attending["cryo_units"], 0)
        self.assertEqual(second_attending["overall_units"], 0)
        self.assertEqual(second_attending["rbc_adherent"], 0)
        self.assertEqual(second_attending["ffp_adherent"], 0)
        self.assertEqual(second_attending["plt_adherent"], 0)
        self.assertEqual(second_attending["cryo_adherent"], 0)
        self.assertEqual(second_attending["overall_adherent"], 0)
        self.assertEqual(second_attending["b12"], 0)
        self.assertEqual(second_attending["iron"], 0)
        self.assertEqual(second_attending["antifibrinolytic"], 0)
        self.assertIsNone(second_attending["los"])
        self.assertIsNone(second_attending["death"])
        self.assertIsNone(second_attending["vent"])
        self.assertIsNone(second_attending["stroke"])
        self.assertIsNone(second_attending["ecmo"])
        self.assertEqual(second_attending["is_admitting_attending"], 0)

    def test_materialize_visit_attributes_enforces_adherence_thresholds(self):
        visit = create_visit_fixture(
            visit_no=1002,
            mrn="MRN-1002",
            provider_ids=("PROV-C",),
            hgb_result=Decimal("8.5"),
            inr_result=Decimal("1.4"),
            plt_result=Decimal("12000"),
            fibrinogen_result=Decimal("150"),
        )

        materialize_visit_attributes()
        rows = fetch_visit_attributes(visit.visit_no)

        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row["rbc_units"], 2)
        self.assertEqual(row["ffp_units"], 1)
        self.assertEqual(row["plt_units"], 1)
        self.assertEqual(row["cryo_units"], 1)

        # This fails if threshold logic is incorrect (e.g., wrong comparison operators).
        self.assertEqual(row["rbc_adherent"], 0)
        self.assertEqual(row["ffp_adherent"], 0)
        self.assertEqual(row["plt_adherent"], 0)
        self.assertEqual(row["cryo_adherent"], 0)
        self.assertEqual(row["overall_adherent"], 0)
