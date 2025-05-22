from api.models import (
    Patient,
    Visit,
    SurgeryCase,
    BillingCode,
    Lab,
    Medication,
    Transfusion,
)
from ..utils.utils import get_all_cpt_code_filters

FIELDS = {
    "admin_dose": "ADMIN_DOSE",
    "anest_id": "ANESTH_PROV_ID",
    "apr_drg_weight": "APR_DRG_WEIGHT",
    "apr_drg_code": "APR_DRG_CODE",
    "apr_drg_desc": "APR_DRG_DESC",
    "apr_drg_rom": "APR_DRG_ROM",
    "apr_drg_soi": "APR_DRG_SOI",
    "birth_date": "PAT_BIRTHDATE",
    "cpt_code": "cpt_code",
    "case_date": "CASE_DATE",
    "case_id": "case_id",
    "code_desc": "CODE_DESC",
    "death_date": "DEATH_DATE",
    "dose_unit_desc": "DOSE_UNIT_DESC",
    "draw_dtm": "LAB_DRAW_DTM",
    "ethnicity_code": "ETHNICITY_CODE",
    "ethnicity_desc": "ETHNICITY_DESC",
    "gender_code": "GENDER_CODE",
    # "gender_desc": "GENDER_DESC",
    "medication_id": "MEDICATION_ID",
    "patient_id": "MRN",
    "post_op_icu_los": "POSTOP_ICU_LOS",
    "present_on_adm": "PRESENT_ON_ADM_F",
    "prim_proc_desc": "PRIM_PROC_DESC",
    "procedure_dtm": "PROC_DTM",
    "race_code": "RACE_CODE",
    "race_desc": "RACE_DESC",
    "result_code": "RESULT_CODE",
    "result_desc": "RESULT_DESC",
    "result_dtm": "RESULT_DTM",
    "result_value": "RESULT_VALUE",
    "sched_site_desc": "SCHED_SITE_DESC",
    "surgeon_id": "SURGEON_PROV_ID",
    "surgery_elapsed": "SURGERY_ELAP",
    "surgery_end_time": "SURGERY_END_DTM",
    "surgery_start_time": "SURGERY_START_DTM",
    "surgery_type": "SURGERY_TYPE_DESC",
    "visit_no": "visit_no",
}

TABLES = {
    "billing_codes": BillingCode._meta.db_table,
    "intra_op_trnsfsd": Transfusion._meta.db_table,
    "patient": Patient._meta.db_table,
    "surgery_case": SurgeryCase._meta.db_table,
    "visit": Visit._meta.db_table,
    "visit_labs": Lab._meta.db_table,
    "medication": Medication._meta.db_table,
}

_, _, filters_safe_sql = get_all_cpt_code_filters()

procedure_count_query = f"""
        SELECT
            GROUP_CONCAT({FIELDS.get('cpt_code')}) as codes,
            SURG.{FIELDS.get('case_id')}
        FROM {TABLES.get('billing_codes')} BLNG
        INNER JOIN {TABLES.get('surgery_case')} SURG
            ON BLNG.{FIELDS.get('visit_no')} = SURG.{FIELDS.get('visit_no')}
            AND CAST(BLNG.{FIELDS.get('procedure_dtm')} AS DATE) = SURG.{FIELDS.get('case_date')}
        {filters_safe_sql}
        GROUP BY SURG.{FIELDS.get('case_id')}
    """
