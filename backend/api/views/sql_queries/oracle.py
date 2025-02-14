from api.models import (
    PATIENT,
    VISIT,
    SURGERY_CASE,
    BILLING_CODES,
    VISIT_LABS,
    EXTRAOP_MEDS,
    INTRAOP_MEDS,
    INTRAOP_TRANSFUSION,
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
    "billing_code": "CODE",
    "case_date": "CASE_DATE",
    "case_id": "CASE_ID",
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
    "visit_no": "VISIT_NO",
}

TABLES = {
    "billing_codes": BILLING_CODES._meta.db_table,
    "intra_op_trnsfsd": INTRAOP_TRANSFUSION._meta.db_table,
    "patient": PATIENT._meta.db_table,
    "surgery_case": SURGERY_CASE._meta.db_table,
    "visit": VISIT._meta.db_table,
    "visit_labs": VISIT_LABS._meta.db_table,
    "extraop_meds": EXTRAOP_MEDS._meta.db_table,
    "intraop_meds": INTRAOP_MEDS._meta.db_table,
}

_, _, filters_safe_sql = get_all_cpt_code_filters()

procedure_count_query = f"""
        SELECT
            LISTAGG({FIELDS.get('billing_code')}, ',') as codes,
            SURG.{FIELDS.get('case_id')}
        FROM {TABLES.get('billing_codes')} BLNG
        INNER JOIN {TABLES.get('surgery_case')} SURG
            ON (BLNG.{FIELDS.get('visit_no')} = SURG.{FIELDS.get('visit_no')})
            AND (BLNG.{FIELDS.get('procedure_dtm')} = SURG.{FIELDS.get('case_date')})
        {filters_safe_sql}
        GROUP BY {FIELDS.get('case_id')}
    """

patient_query = f"""
    SELECT
        PATIENT.{FIELDS.get('birth_date')},
        PATIENT.{FIELDS.get('gender_code')},
        -- PATIENT.{FIELDS.get('gender_desc')},
        PATIENT.{FIELDS.get('race_code')},
        PATIENT.{FIELDS.get('race_desc')},
        PATIENT.{FIELDS.get('ethnicity_code')},
        PATIENT.{FIELDS.get('ethnicity_desc')},
        PATIENT.{FIELDS.get('death_date')}
    FROM
        {TABLES.get('patient')} PATIENT
    WHERE PATIENT.{FIELDS.get('patient_id')} = :id
    """

surgery_query = f"""
    with
        codes as (
            SELECT
                BLNG.{FIELDS.get('visit_no')} || ', ' || BLNG.{FIELDS.get('procedure_dtm')} as comb,
                LISTAGG(BLNG.{FIELDS.get('code_desc')}, ', ') as codes
            FROM {TABLES.get('billing_codes')} BLNG
            group by {FIELDS.get('visit_no')} || ', ' || {FIELDS.get('procedure_dtm')}
        ),
        surg_cases as (
            SELECT
                TO_CHAR(SURG.{FIELDS.get('visit_no')}) || ', ' || TO_CHAR(SURG.{FIELDS.get('case_date')}) as comb,
                SURG.{FIELDS.get('case_id')},
                SURG.{FIELDS.get('visit_no')},
                SURG.{FIELDS.get('case_date')},
                SURG.{FIELDS.get('surgery_start_time')},
                SURG.{FIELDS.get('surgery_end_time')},
                SURG.{FIELDS.get('surgery_elapsed')},
                SURG.{FIELDS.get('surgery_type')},
                SURG.{FIELDS.get('prim_proc_desc')},
                SURG.{FIELDS.get('post_op_icu_los')}
            FROM {TABLES.get('surgery_case')} SURG
            WHERE SURG.{FIELDS.get('case_id')} = :id
        )
    SELECT surg_cases.*, codes.codes as codes
    FROM surg_cases
    INNER JOIN codes ON surg_cases.comb = codes.comb
    """

surgery_case_query = rf"""
    WITH TRANSFUSED_UNITS AS (
        SELECT
            SUM(NVL(
                CASE WHEN PRBC_UNITS > 150 THEN CEIL(PRBC_UNITS / 250) ELSE PRBC_UNITS END,
                0
            )) + CEIL(NVL(SUM(RBC_VOL)/250, 0)) AS PRBC_UNITS,
            SUM(NVL(
                CASE WHEN FFP_UNITS > 150 THEN CEIL(FFP_UNITS / 220) ELSE FFP_UNITS END,
                0
            )) + CEIL(NVL(SUM(FFP_VOL)/220, 0)) AS FFP_UNITS,
            SUM(NVL(
                CASE WHEN PLT_UNITS > 150 THEN CEIL(PLT_UNITS / 300) ELSE PLT_UNITS END,
                0
            )) + CEIL(NVL(SUM(PLT_VOL)/300, 0)) AS PLT_UNITS,
            SUM(NVL(
                CASE WHEN CRYO_UNITS > 35 THEN CEIL(CRYO_UNITS / 75) ELSE CRYO_UNITS END,
                0
            )) + CEIL(NVL(SUM(CRYO_VOL)/75, 0)) AS CRYO_UNITS,
            SUM(CELL_SAVER_ML) AS CELL_SAVER_ML,
            CASE_ID
        FROM
            {TABLES.get('intra_op_trnsfsd')}
        GROUP BY
            CASE_ID
    ),
    BILLING_CODES AS (
        SELECT
            VISIT_NO,
            CASE WHEN SUM(CASE WHEN CODE IN ('I97.820', '997.02') THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS STROKE,
            CASE WHEN SUM(CASE WHEN CODE IN ('33952', '33954', '33956', '33958', '33962', '33964', '33966', '33973', '33974', '33975', '33976', '33977', '33978', '33979', '33980', '33981', '33982', '33983', '33984', '33986', '33987', '33988', '33989') THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS ECMO,
            LISTAGG(CODE, ',') AS ALL_CODES
        FROM
            {TABLES.get('billing_codes')}
        {filters_safe_sql}
        GROUP BY
            VISIT_NO
    ),
    MEDS AS (
        SELECT
            VISIT_NO,
            CASE WHEN SUM(TXA) > 0 THEN 1 ELSE 0 END AS TXA,
            CASE WHEN SUM(AMICAR) > 0 THEN 1 ELSE 0 END AS AMICAR,
            CASE WHEN SUM(B12) > 0 THEN 1 ELSE 0 END AS B12,
            CASE WHEN SUM(IRON) > 0 THEN 1 ELSE 0 END AS IRON
        FROM (
            (SELECT
                VISIT_NO,
                SUM(CASE WHEN lower(MEDICATION_NAME) like '%%tranexamic%%' or lower(MEDICATION_NAME) like '%%txa%%' THEN 1 ELSE 0 END) AS TXA,
                SUM(CASE WHEN lower(MEDICATION_NAME) like '%%amicar%%' or lower(MEDICATION_NAME) like '%%aminocaproic%%' or lower(MEDICATION_NAME) like '%%eaca%%' THEN 1 ELSE 0 END) AS AMICAR,
                SUM(CASE WHEN lower(MEDICATION_NAME) like '%%b12%%' or lower(MEDICATION_NAME) like '%%cobalamin%%' THEN 1 ELSE 0 END) AS B12,
                SUM(CASE WHEN lower(MEDICATION_NAME) like '%%iron%%' or lower(MEDICATION_NAME) like '%%ferric%%' or lower(MEDICATION_NAME) like '%%ferrous%%' THEN 1 ELSE 0 END) AS IRON
            FROM
                {TABLES.get('intraop_meds')}
            group by VISIT_NO
            )
            UNION ALL
            (SELECT
                VISIT_NO,
                SUM(CASE WHEN lower(MEDICATION_NAME) like '%%tranexamic%%' or lower(MEDICATION_NAME) like '%%txa%%' THEN 1 ELSE 0 END) AS TXA,
                SUM(CASE WHEN lower(MEDICATION_NAME) like '%%amicar%%' or lower(MEDICATION_NAME) like '%%aminocaproic%%' or lower(MEDICATION_NAME) like '%%eaca%%' THEN 1 ELSE 0 END) AS AMICAR,
                SUM(CASE WHEN lower(MEDICATION_NAME) like '%%b12%%' or lower(MEDICATION_NAME) like '%%cobalamin%%' THEN 1 ELSE 0 END) AS B12,
                SUM(CASE WHEN lower(MEDICATION_NAME) like '%%iron%%' or lower(MEDICATION_NAME) like '%%ferric%%' or lower(MEDICATION_NAME) like '%%ferrous%%' THEN 1 ELSE 0 END) AS IRON
            FROM
                {TABLES.get('extraop_meds')}
            group by VISIT_NO
            )
            ) INNER_MEDS
        GROUP BY VISIT_NO
    ),
    LAB_HB AS (
        SELECT
            VISIT_NO,
            LAB_DRAW_DTM,
            RESULT_DTM,
            RESULT_CODE,
            RESULT_VALUE
        FROM
            {TABLES.get('visit_labs')}
        WHERE (INSTR(UPPER(RESULT_DESC), 'HEMOGLOBIN') > 0 OR INSTR(UPPER(RESULT_DESC), 'HGB') > 0)
        AND REGEXP_LIKE(RESULT_VALUE, '^[+-]?\d+(\.\d+)?$')
    ),
    PREOP_HB AS (
        SELECT
            X.MRN,
            X.VISIT_NO,
            X.CASE_ID,
            X.SURGERY_START_DTM,
            X.SURGERY_END_DTM,
            X.DI_PREOP_DRAW_DTM,
            LH2.RESULT_VALUE
        FROM (
            SELECT
                SC.MRN,
                SC.VISIT_NO,
                SC.CASE_ID,
                SC.SURGERY_START_DTM,
                SC.SURGERY_END_DTM,
                MAX(LH.LAB_DRAW_DTM) AS DI_PREOP_DRAW_DTM
            FROM
                {TABLES.get('surgery_case')} SC
            INNER JOIN LAB_HB LH
                ON SC.VISIT_NO = LH.VISIT_NO
            GROUP BY
                SC.MRN,
                SC.VISIT_NO,
                SC.CASE_ID,
                SC.SURGERY_START_DTM,
                SC.SURGERY_END_DTM
        ) X
        INNER JOIN LAB_HB LH2
            ON X.VISIT_NO = LH2.VISIT_NO
            AND X.DI_PREOP_DRAW_DTM = LH2.LAB_DRAW_DTM
    ),
    POSTOP_HB AS (
        SELECT
            Z.MRN,
            Z.VISIT_NO,
            Z.CASE_ID,
            Z.SURGERY_START_DTM,
            Z.SURGERY_END_DTM,
            Z.DI_POSTOP_DRAW_DTM,
            LH4.RESULT_VALUE
        FROM (
            SELECT
                SC2.MRN,
                SC2.VISIT_NO,
                SC2.CASE_ID,
                SC2.SURGERY_START_DTM,
                SC2.SURGERY_END_DTM,
                MIN(LH3.LAB_DRAW_DTM) AS DI_POSTOP_DRAW_DTM
            FROM
                {TABLES.get('surgery_case')} SC2
            INNER JOIN LAB_HB LH3
                ON SC2.VISIT_NO = LH3.VISIT_NO
            WHERE LH3.LAB_DRAW_DTM > SC2.SURGERY_END_DTM
            GROUP BY
                SC2.MRN,
                SC2.VISIT_NO,
                SC2.CASE_ID,
                SC2.SURGERY_START_DTM,
                SC2.SURGERY_END_DTM
        ) Z
        INNER JOIN LAB_HB LH4
            ON Z.VISIT_NO = LH4.VISIT_NO
            AND Z.DI_POSTOP_DRAW_DTM = LH4.LAB_DRAW_DTM
    ),
    HEMOGLOBIN AS (
        SELECT
            SC3.MRN,
            SC3.CASE_ID,
            SC3.VISIT_NO,
            SC3.CASE_DATE,
            EXTRACT (YEAR from SC3.CASE_DATE) YEAR,
            EXTRACT (MONTH from SC3.CASE_DATE) AS MONTH,
            SC3.SURGERY_START_DTM,
            SC3.SURGERY_END_DTM,
            SC3.SURGERY_ELAP,
            SC3.SURGERY_TYPE_DESC,
            SC3.SURGEON_PROV_ID,
            SC3.ANESTH_PROV_ID,
            SC3.PRIM_PROC_DESC,
            SC3.POSTOP_ICU_LOS,
            SC3.SCHED_SITE_DESC,
            MAX(CASE
                WHEN PRE.DI_PREOP_DRAW_DTM IS NOT NULL
                THEN PRE.DI_PREOP_DRAW_DTM
            END)
            AS DI_PREOP_DRAW_DTM,
            MAX(CASE
                WHEN PRE.RESULT_VALUE IS NOT NULL
                THEN PRE.RESULT_VALUE
            END)
            AS PREOP_HEMO,
            MAX(CASE
                WHEN POST.DI_POSTOP_DRAW_DTM IS NOT NULL
                THEN POST.DI_POSTOP_DRAW_DTM
            END)
            AS DI_POSTOP_DRAW_DTM,
            MAX(CASE
                WHEN POST.RESULT_VALUE IS NOT NULL
                THEN POST.RESULT_VALUE
            END)
            AS POSTOP_HEMO
        FROM
            {TABLES.get('surgery_case')} SC3
        LEFT OUTER JOIN PREOP_HB PRE
            ON SC3.CASE_ID = PRE.CASE_ID
        LEFT OUTER JOIN POSTOP_HB POST
            ON SC3.CASE_ID = POST.CASE_ID
        GROUP BY SC3.MRN,
            SC3.CASE_ID,
            SC3.VISIT_NO,
            SC3.CASE_DATE,
            EXTRACT (YEAR from SC3.CASE_DATE),
            EXTRACT (MONTH from SC3.CASE_DATE),
            SC3.SURGERY_START_DTM,
            SC3.SURGERY_END_DTM,
            SC3.SURGERY_ELAP,
            SC3.SURGERY_TYPE_DESC,
            SC3.SURGEON_PROV_ID,
            SC3.ANESTH_PROV_ID,
            SC3.PRIM_PROC_DESC,
            SC3.POSTOP_ICU_LOS,
            SC3.SCHED_SITE_DESC
    )


    SELECT
        SURG.CASE_ID,
        SURG.VISIT_NO,
        SURG.MRN,
        SURG.SURGEON_PROV_ID,
        SURG.SURGEON_PROV_NAME,
        SURG.ANESTH_PROV_ID,
        SURG.ANESTH_PROV_NAME,
        PRBC_UNITS,
        FFP_UNITS,
        PLT_UNITS,
        CRYO_UNITS,
        CELL_SAVER_ML,
        HGB.PREOP_HEMO,
        HGB.POSTOP_HEMO,
        EXTRACT(year from SURG.CASE_DATE) AS YEAR,
        TO_NUMBER(TO_CHAR(SURG.CASE_DATE, 'Q')) AS QUARTER,
        EXTRACT(month from SURG.CASE_DATE) AS MONTH,
        SURG.CASE_DATE,
        CASE WHEN VST.TOTAL_VENT_MINS > 1440 THEN 1 ELSE 0 END AS VENT,
        VST.APR_DRG_WEIGHT AS DRG_WEIGHT,
        VST.PAT_EXPIRED AS DEATH,
        BLNG.ECMO,
        BLNG.STROKE,
        BLNG.ALL_CODES,
        MEDS.TXA,
        MEDS.B12,
        MEDS.AMICAR,
        MEDS.IRON,
        SURG.SURGERY_TYPE_DESC
    FROM
        {TABLES.get('surgery_case')} SURG
    INNER JOIN BILLING_CODES BLNG
        ON SURG.VISIT_NO = BLNG.VISIT_NO
    LEFT JOIN TRANSFUSED_UNITS T
        ON SURG.CASE_ID = T.CASE_ID
    LEFT JOIN {TABLES.get('visit')} VST
        ON SURG.VISIT_NO = VST.VISIT_NO
    LEFT JOIN MEDS
        ON SURG.VISIT_NO = MEDS.VISIT_NO
    LEFT JOIN HEMOGLOBIN HGB
        ON SURG.CASE_ID = HGB.CASE_ID
    """
