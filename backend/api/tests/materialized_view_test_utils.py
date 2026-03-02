from datetime import date, datetime, timezone
from decimal import Decimal

from django.db import connection

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


def truncate_intelvia_tables() -> None:
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


def materialize_visit_attributes() -> None:
    with connection.cursor() as cursor:
        cursor.execute("CALL materializeVisitAttributes()")


def fetch_visit_attributes_rows(visit_no: int) -> list[dict]:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT *
            FROM VisitAttributes
            WHERE visit_no = %s
            ORDER BY attending_provider_line
            """,
            [visit_no],
        )
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]


def count_visit_attributes_rows(visit_no: int) -> int:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM VisitAttributes
            WHERE visit_no = %s
            """,
            [visit_no],
        )
        return cursor.fetchone()[0]


def create_empty_visit_fixture(
    *,
    visit_no: int,
    mrn: str,
    provider_ids: tuple[str, ...],
    clinical_los: Decimal = Decimal("4.00"),
    pat_expired_f: str | None = "N",
    total_vent_mins: float = 1501,
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
        clinical_los=clinical_los,
        age_at_adm=64,
        pat_class_desc="Inpatient",
        pat_expired_f=pat_expired_f,
        total_vent_mins=total_vent_mins,
        total_vent_days=1.1,
        apr_drg_code="100",
        apr_drg_desc="Fixture DRG",
        apr_drg_weight=1.4,
        ms_drg_weight=2.1,
    )

    for provider_line, provider_id in enumerate(provider_ids, start=1):
        add_attending_provider(
            visit=visit,
            provider_id=provider_id,
            provider_line=provider_line,
            start=utc_dt(2024, 1, 1, 0, 0),
            end=utc_dt(2024, 1, 6, 0, 0),
        )

    return visit


def add_attending_provider(
    *,
    visit: Visit,
    provider_id: str,
    provider_line: int,
    start: datetime,
    end: datetime,
    provider_name: str | None = None,
) -> AttendingProvider:
    return AttendingProvider.objects.create(
        visit_no=visit,
        prov_id=provider_id,
        prov_name=provider_name or f"Provider {provider_id}",
        attend_start_dtm=start,
        attend_end_dtm=end,
        attend_prov_line=provider_line,
    )


def add_transfusion(
    *,
    visit: Visit,
    transfusion_rank: int,
    when: datetime,
    blood_unit_number: str,
    rbc_units: float | None = 0,
    ffp_units: float | None = 0,
    plt_units: float | None = 0,
    cryo_units: float | None = 0,
    whole_units: float | None = 0,
    rbc_vol: float | None = 0,
    ffp_vol: float | None = 0,
    plt_vol: float | None = 0,
    cryo_vol: float | None = 0,
    whole_vol: float | None = 0,
    cell_saver_ml: float | None = 0,
) -> Transfusion:
    return Transfusion.objects.create(
        visit_no=visit,
        trnsfsn_dtm=when,
        transfusion_rank=transfusion_rank,
        blood_unit_number=blood_unit_number,
        rbc_units=rbc_units,
        ffp_units=ffp_units,
        plt_units=plt_units,
        cryo_units=cryo_units,
        whole_units=whole_units,
        rbc_vol=rbc_vol,
        ffp_vol=ffp_vol,
        plt_vol=plt_vol,
        cryo_vol=cryo_vol,
        whole_vol=whole_vol,
        cell_saver_ml=cell_saver_ml,
    )


def add_lab(
    *,
    visit: Visit,
    lab_id: int,
    draw_dtm: datetime,
    result_desc: str,
    result_value: Decimal | None,
    result_code: str,
    result_loinc: str,
    uom_code: str,
    panel_code: str = "LAB",
    panel_desc: str = "LAB",
) -> Lab:
    return Lab.objects.create(
        visit_no=visit,
        mrn=visit.mrn,
        lab_id=lab_id,
        lab_draw_dtm=draw_dtm,
        lab_panel_code=panel_code,
        lab_panel_desc=panel_desc,
        result_dtm=draw_dtm,
        result_code=result_code,
        result_loinc=result_loinc,
        result_desc=result_desc,
        result_value=result_value,
        uom_code=uom_code,
    )


def add_medication(
    *,
    visit: Visit,
    order_med_id: Decimal,
    medication_name: str,
    admin_dtm: datetime,
) -> Medication:
    return Medication.objects.create(
        visit_no=visit,
        order_med_id=order_med_id,
        order_dtm=admin_dtm,
        medication_id=Decimal(order_med_id),
        medication_name=medication_name,
        med_admin_line=Decimal(1),
        admin_dtm=admin_dtm,
        admin_dose="1",
        med_form="Tablet",
        admin_route_desc="PO",
        dose_unit_desc="mg",
        med_start_dtm=admin_dtm,
        med_end_dtm=admin_dtm,
    )


def add_billing_code(
    *,
    visit: Visit,
    cpt_code: str,
    proc_dtm: datetime,
    provider_id: str,
    code_rank: float,
    cpt_code_desc: str = "Fixture CPT",
    provider_name: str | None = None,
) -> BillingCode:
    return BillingCode.objects.create(
        visit_no=visit,
        cpt_code=cpt_code,
        cpt_code_desc=cpt_code_desc,
        proc_dtm=proc_dtm,
        prov_id=provider_id,
        prov_name=provider_name or f"Provider {provider_id}",
        code_rank=code_rank,
    )


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
    visit = create_empty_visit_fixture(
        visit_no=visit_no,
        mrn=mrn,
        provider_ids=provider_ids,
    )

    add_transfusion(
        visit=visit,
        transfusion_rank=1,
        when=utc_dt(2024, 1, 2, 10, 0),
        blood_unit_number=f"RBC-{visit_no}",
        rbc_units=2,
    )
    add_transfusion(
        visit=visit,
        transfusion_rank=2,
        when=utc_dt(2024, 1, 2, 11, 0),
        blood_unit_number=f"FFP-{visit_no}",
        ffp_units=1,
    )
    add_transfusion(
        visit=visit,
        transfusion_rank=3,
        when=utc_dt(2024, 1, 2, 11, 30),
        blood_unit_number=f"PLT-{visit_no}",
        plt_units=1,
    )
    add_transfusion(
        visit=visit,
        transfusion_rank=4,
        when=utc_dt(2024, 1, 2, 12, 0),
        blood_unit_number=f"CRYO-{visit_no}",
        cryo_units=1,
    )

    add_lab(
        visit=visit,
        lab_id=visit_no * 10 + 1,
        draw_dtm=utc_dt(2024, 1, 2, 9, 30),
        result_desc="HGB",
        result_value=hgb_result,
        result_code="HGB",
        result_loinc="718-7",
        uom_code="g/dL",
        panel_code="CBC",
        panel_desc="CBC",
    )
    add_lab(
        visit=visit,
        lab_id=visit_no * 10 + 2,
        draw_dtm=utc_dt(2024, 1, 2, 10, 45),
        result_desc="INR",
        result_value=inr_result,
        result_code="INR",
        result_loinc="6301-6",
        uom_code="ratio",
        panel_code="COAG",
        panel_desc="COAG",
    )
    add_lab(
        visit=visit,
        lab_id=visit_no * 10 + 3,
        draw_dtm=utc_dt(2024, 1, 2, 11, 15),
        result_desc="PLT",
        result_value=plt_result,
        result_code="PLT",
        result_loinc="777-3",
        uom_code="K/uL",
        panel_code="CBC",
        panel_desc="CBC",
    )
    add_lab(
        visit=visit,
        lab_id=visit_no * 10 + 4,
        draw_dtm=utc_dt(2024, 1, 2, 11, 50),
        result_desc="FIBRINOGEN",
        result_value=fibrinogen_result,
        result_code="FIB",
        result_loinc="3255-7",
        uom_code="mg/dL",
        panel_code="COAG",
        panel_desc="COAG",
    )

    add_medication(
        visit=visit,
        order_med_id=Decimal(visit_no * 100 + 1),
        medication_name="Vitamin B12 Injection",
        admin_dtm=utc_dt(2024, 1, 2, 9, 15),
    )
    add_medication(
        visit=visit,
        order_med_id=Decimal(visit_no * 100 + 2),
        medication_name="Ferrous Sulfate",
        admin_dtm=utc_dt(2024, 1, 2, 9, 25),
    )
    add_medication(
        visit=visit,
        order_med_id=Decimal(visit_no * 100 + 3),
        medication_name="Tranexamic Acid",
        admin_dtm=utc_dt(2024, 1, 2, 9, 35),
    )

    add_billing_code(
        visit=visit,
        cpt_code="99291",
        cpt_code_desc="Critical care, first hour",
        proc_dtm=utc_dt(2024, 1, 2, 8, 0),
        provider_id=provider_ids[0],
        code_rank=1,
    )
    add_billing_code(
        visit=visit,
        cpt_code="33946",
        cpt_code_desc="ECMO initiation",
        proc_dtm=utc_dt(2024, 1, 2, 8, 5),
        provider_id=provider_ids[0],
        code_rank=2,
    )

    return visit
