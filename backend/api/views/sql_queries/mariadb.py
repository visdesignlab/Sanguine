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
            ON (BLNG.{FIELDS.get('visit_no')} = SURG.{FIELDS.get('visit_no')})
            AND (BLNG.{FIELDS.get('procedure_dtm')} = SURG.{FIELDS.get('case_date')})
        {filters_safe_sql}
        GROUP BY SURG.{FIELDS.get('case_id')}
    """

patient_query = f"""
    SELECT
        Patient.{FIELDS.get('birth_date')},
        Patient.{FIELDS.get('gender_code')},
        -- Patient.{FIELDS.get('gender_desc')},
        Patient.{FIELDS.get('race_code')},
        Patient.{FIELDS.get('race_desc')},
        Patient.{FIELDS.get('ethnicity_code')},
        Patient.{FIELDS.get('ethnicity_desc')},
        Patient.{FIELDS.get('death_date')}
    FROM
        {TABLES.get('patient')} Patient
    WHERE Patient.{FIELDS.get('patient_id')} = %(id)s
    """

surgery_query = f"""
    WITH
        codes AS (
            SELECT
                CONCAT(BLNG.{FIELDS.get('visit_no')}, ', ', CAST(BLNG.{FIELDS.get('procedure_dtm')} AS DATE)) AS comb,
                GROUP_CONCAT(BLNG.{FIELDS.get('code_desc')} SEPARATOR ', ') AS CODES
            FROM {TABLES.get('billing_codes')} BLNG
            GROUP BY CONCAT(BLNG.{FIELDS.get('visit_no')}, ', ', CAST(BLNG.{FIELDS.get('procedure_dtm')} AS DATE))
        ),
        surg_cases AS (
            SELECT
                CONCAT(SURG.{FIELDS.get('visit_no')}, ', ', CAST(SURG.{FIELDS.get('case_date')} AS DATE)) AS comb,
                SURG.{FIELDS.get('case_id')},
                SURG.{FIELDS.get('visit_no')},
                SURG.{FIELDS.get('case_date')},
                SURG.{FIELDS.get('surgery_start_time')},
                SURG.{FIELDS.get('surgery_end_time')},
                SURG.{FIELDS.get('surgery_elapsed')},
                SURG.{FIELDS.get('surgery_type')},
                SURG.{FIELDS.get('prim_proc_desc')},
                SURG.{FIELDS.get('post_op_icu_los')}
            FROM SurgeryCase SURG
            WHERE SURG.{FIELDS.get('case_id')} = %(id)s
        )
    SELECT surg_cases.*, codes.CODES AS CODES
    FROM surg_cases
    INNER JOIN codes ON surg_cases.comb = codes.comb
    """

surgery_case_query = rf"""
    WITH TRANSFUSED_UNITS AS (
        SELECT
            SUM(CASE WHEN RBC_UNITS > 150 THEN CEIL(RBC_UNITS / 250) ELSE RBC_UNITS END)
                + CEIL(COALESCE(SUM(RBC_VOL) / 250, 0)) AS RBC_UNITS,
            SUM(CASE WHEN FFP_UNITS > 150 THEN CEIL(FFP_UNITS / 220) ELSE FFP_UNITS END)
                + CEIL(COALESCE(SUM(FFP_VOL) / 220, 0)) AS FFP_UNITS,
            SUM(CASE WHEN PLT_UNITS > 150 THEN CEIL(PLT_UNITS / 300) ELSE PLT_UNITS END)
                + CEIL(COALESCE(SUM(PLT_VOL) / 300, 0)) AS PLT_UNITS,
            SUM(CASE WHEN CRYO_UNITS > 35 THEN CEIL(CRYO_UNITS / 75) ELSE CRYO_UNITS END)
                + CEIL(COALESCE(SUM(CRYO_VOL) / 75, 0)) AS CRYO_UNITS,
            SUM(CELL_SAVER_ML) AS CELL_SAVER_ML,
            visit_no
        FROM {TABLES.get('intra_op_trnsfsd')}
        GROUP BY visit_no
    ),
    BillingCode AS (
        SELECT
            visit_no,
            /* Use MAX on the computed binary flag to avoid nesting SUM(IF(...)) */
            MAX(cpt_code IN ('I97.820', '997.02')) AS STROKE,
            MAX(cpt_code IN (
                    '33952', '33954', '33956', '33958', '33962', '33964',
                    '33966', '33973', '33974', '33975', '33976', '33977',
                    '33978', '33979', '33980', '33981', '33982', '33983',
                    '33984', '33986', '33987', '33988', '33989'
                )) AS ECMO,
            GROUP_CONCAT(cpt_code) AS ALL_CODES
        FROM {TABLES.get('billing_codes')}
        {filters_safe_sql}
        GROUP BY visit_no
    ),
    MEDS AS (
        SELECT
            visit_no,
            MAX(TXA) AS TXA,
            MAX(AMICAR) AS AMICAR,
            MAX(B12) AS B12,
            MAX(IRON) AS IRON
        FROM (
            SELECT
                visit_no,
                SUM(CASE WHEN LOWER(MEDICATION_NAME) REGEXP 'tranexamic|txa' THEN 1 ELSE 0 END) AS TXA,
                SUM(CASE WHEN LOWER(MEDICATION_NAME) REGEXP 'amicar|aminocaproic|eaca' THEN 1 ELSE 0 END) AS AMICAR,
                SUM(CASE WHEN LOWER(MEDICATION_NAME) REGEXP 'b12|cobalamin' THEN 1 ELSE 0 END) AS B12,
                SUM(CASE WHEN LOWER(MEDICATION_NAME) REGEXP 'iron|ferric|ferrous' THEN 1 ELSE 0 END) AS IRON
            FROM {TABLES.get('medication')}
            GROUP BY visit_no
            UNION ALL
            SELECT
                visit_no,
                SUM(CASE WHEN LOWER(MEDICATION_NAME) REGEXP 'tranexamic|txa' THEN 1 ELSE 0 END) AS TXA,
                SUM(CASE WHEN LOWER(MEDICATION_NAME) REGEXP 'amicar|aminocaproic|eaca' THEN 1 ELSE 0 END) AS AMICAR,
                SUM(CASE WHEN LOWER(MEDICATION_NAME) REGEXP 'b12|cobalamin' THEN 1 ELSE 0 END) AS B12,
                SUM(CASE WHEN LOWER(MEDICATION_NAME) REGEXP 'iron|ferric|ferrous' THEN 1 ELSE 0 END) AS IRON
            FROM {TABLES.get('medication')}
            GROUP BY visit_no
        ) meds_union
        GROUP BY visit_no
    ),
    LAB_HB AS (
        SELECT
            visit_no,
            LAB_DRAW_DTM,
            RESULT_DTM,
            RESULT_CODE,
            RESULT_VALUE
        FROM Lab
        WHERE (UPPER(RESULT_DESC) REGEXP 'HEMOGLOBIN|HGB')
          AND RESULT_VALUE REGEXP '^[+-]?\\d+(\\.\\d+)?$'
    ),
    PREOP_HB AS (
        SELECT
            X.visit_no,
            X.case_id,
            X.DI_PREOP_DRAW_DTM,
            LH2.RESULT_VALUE AS PREOP_HEMO
        FROM (
            SELECT
                SC.visit_no,
                SC.case_id,
                MAX(LH.LAB_DRAW_DTM) AS DI_PREOP_DRAW_DTM
            FROM SurgeryCase SC
            INNER JOIN LAB_HB LH ON SC.visit_no = LH.visit_no and LH.LAB_DRAW_DTM < SC.SURGERY_START_DTM
            GROUP BY SC.visit_no, SC.case_id
        ) X
        INNER JOIN LAB_HB LH2
            ON X.visit_no = LH2.visit_no
           AND X.DI_PREOP_DRAW_DTM = LH2.LAB_DRAW_DTM
    ),
    POSTOP_HB AS (
        SELECT
            X.visit_no,
            X.case_id,
            X.DI_POSTOP_DRAW_DTM,
            LH2.RESULT_VALUE AS POSTOP_HEMO
        FROM (
            SELECT
                SC.visit_no,
                SC.case_id,
                MIN(LH.LAB_DRAW_DTM) AS DI_POSTOP_DRAW_DTM
            FROM SurgeryCase SC
            INNER JOIN LAB_HB LH ON SC.visit_no = LH.visit_no and LH.LAB_DRAW_DTM > SC.SURGERY_END_DTM
            GROUP BY SC.visit_no, SC.case_id
        ) X
        INNER JOIN LAB_HB LH2
            ON X.visit_no = LH2.visit_no
            AND X.DI_POSTOP_DRAW_DTM = LH2.LAB_DRAW_DTM
    )
    SELECT
        SURG.case_id,
        SURG.visit_no,
        SURG.MRN,
        SURG.SURGEON_PROV_ID,
        SURG.SURGEON_PROV_NAME,
        SURG.ANESTH_PROV_ID,
        SURG.ANESTH_PROV_NAME,
        T.RBC_UNITS,
        T.FFP_UNITS,
        T.PLT_UNITS,
        T.CRYO_UNITS,
        T.CELL_SAVER_ML,
        PRE.PREOP_HEMO,
        POST.POSTOP_HEMO,
        YEAR(SURG.CASE_DATE) AS YEAR,
        QUARTER(SURG.CASE_DATE) AS QUARTER,
        MONTH(SURG.CASE_DATE) AS MONTH,
        SURG.CASE_DATE,
        VST.total_vent_mins > 1440 AS VENT,
        VST.APR_DRG_WEIGHT AS DRG_WEIGHT,
        BLNG.ECMO,
        BLNG.STROKE,
        BLNG.ALL_CODES,
        MEDS.TXA,
        MEDS.B12,
        MEDS.AMICAR,
        MEDS.IRON,
        SURG.SURGERY_TYPE_DESC
    FROM SurgeryCase SURG
    INNER JOIN BillingCode BLNG ON SURG.visit_no = BLNG.visit_no
    LEFT JOIN TRANSFUSED_UNITS T ON SURG.visit_no = T.visit_no
    LEFT JOIN Visit VST ON SURG.visit_no = VST.visit_no
    LEFT JOIN MEDS ON SURG.visit_no = MEDS.visit_no
    LEFT JOIN PREOP_HB PRE ON SURG.case_id = PRE.case_id
    LEFT JOIN POSTOP_HB POST ON SURG.case_id = POST.case_id
"""
