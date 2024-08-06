from collections import Counter, defaultdict
from django.http import (
    HttpResponse,
    JsonResponse,
    HttpResponseBadRequest,
)
from django.views.decorators.http import require_http_methods
from django_cas_ng.decorators import login_required

from backend.api.views.utils.utils import cpt, get_all_cpt_code_filters, log_request, execute_sql, execute_sql_dict

DE_IDENT_FIELDS = {
    "admin_dose": "ADMIN_DOSE",
    "anest_id": "ANESTH_PROV_DWID",
    "apr_drg_weight": "APR_DRG_WEIGHT",
    "apr_drg_code": "APR_DRG_CODE",
    "apr_drg_desc": "APR_DRG_DESC",
    "apr_drg_rom": "APR_DRG_ROM",
    "apr_drg_soi": "APR_DRG_SOI",
    "birth_date": "DI_BIRTHDATE",
    "billing_code": "CODE",
    "case_date": "DI_CASE_DATE",
    "case_id": "DI_CASE_ID",
    "code_desc": "CODE_DESC",
    "death_date": "DI_DEATH_DATE",
    "dose_unit_desc": "DOSE_UNIT_DESC",
    "draw_dtm": "DI_DRAW_DTM",
    "ethnicity_code": "ETHNICITY_CODE",
    "ethnicity_desc": "ETHNICITY_DESC",
    "gender_code": "GENDER_CODE",
    "gender_desc": "GENDER_DESC",
    "medication_id": "MEDICATION_ID",
    "patient_id": "DI_PAT_ID",
    "post_op_icu_los": "POSTOP_ICU_LOS",
    "present_on_adm": "PRESENT_ON_ADM_F",
    "prim_proc_desc": "PRIM_PROC_DESC",
    "procedure_dtm": "DI_PROC_DTM",
    "race_code": "RACE_CODE",
    "race_desc": "RACE_DESC",
    "result_code": "RESULT_CODE",
    "result_desc": "RESULT_DESC",
    "result_dtm": "DI_RESULT_DTM",
    "result_value": "RESULT_VALUE",
    "sched_site_desc": "SCHED_SITE_DESC",
    "surgeon_id": "SURGEON_PROV_DWID",
    "surgery_elapsed": "SURGERY_ELAP",
    "surgery_end_time": "DI_SURGERY_END_DTM",
    "surgery_start_time": "DI_SURGERY_START_DTM",
    "surgery_type": "SURGERY_TYPE_DESC",
    "visit_no": "DI_VISIT_NO",
}

IDENT_FIELDS = {
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

DE_IDENT_TABLES = {
    "billing_codes": "CLIN_DM.BPU_CTS_DI_BILL_CODES_092920",
    "intra_op_trnsfsd": "CLIN_DM.BPU_CTS_DI_INTRP_TRNSF_092920",
    "patient": "CLIN_DM.BPU_CTS_DI_PATIENT_092920",
    "surgery_case": "CLIN_DM.BPU_CTS_DI_SURGERY_CASE_092920",
    "visit": "CLIN_DM.BPU_CTS_DI_VISIT_092920",
    "visit_labs": "CLIN_DM.BPU_CTS_DI_VST_LABS_092920",
    "extraop_meds": "CLIN_DM.BPU_CTS_DI_EXTRAOP_MEDS_092920",
    "intraop_meds": "CLIN_DM.BPU_CTS_DI_INTRAOP_MEDS_092920",
}

IDENT_TABLES = {
    "billing_codes": "BLOOD_PRODUCTS_DM.BLPD_SANGUINE_BILLING_CODES",
    "intra_op_trnsfsd": "BLOOD_PRODUCTS_DM.BLPD_SANGUINE_INTRAOP_TRANSFUSION",
    "patient": "BLOOD_PRODUCTS_DM.BLPD_SANGUINE_PATIENT",
    "surgery_case": "BLOOD_PRODUCTS_DM.BLPD_SANGUINE_SURGERY_CASE",
    "visit": "BLOOD_PRODUCTS_DM.BLPD_SANGUINE_VISIT",
    "visit_labs": "BLOOD_PRODUCTS_DM.BLPD_SANGUINE_VISIT_LABS",
    "extraop_meds": "BLOOD_PRODUCTS_DM.BLPD_SANGUINE_EXTRAOP_MEDS",
    "intraop_meds": "BLOOD_PRODUCTS_DM.BLPD_SANGUINE_INTRAOP_MEDS",
}

FIELDS_IN_USE = IDENT_FIELDS
TABLES_IN_USE = IDENT_TABLES


@require_http_methods(["GET"])
def index(request):
    log_request(request)
    return HttpResponse("Bloodvis API endpoint. Please use the client application to access the data here.")


@require_http_methods(["GET"])
def whoami(request):
    if request.user.is_authenticated:
        return HttpResponse(request.user.username)
    else:
        return HttpResponse("Unauthorized", status=401)


@require_http_methods(["GET"])
@login_required
def get_procedure_counts(request):
    log_request(request)

    filters, bind_names, filters_safe_sql = get_all_cpt_code_filters()

    # Make the connection and execute the command
    # ,CASE WHEN PRIM_PROC_DESC LIKE "%REDO%" THEN 1 ELSE 0 END AS REDO
    command = f"""
        SELECT
            LISTAGG({FIELDS_IN_USE.get('billing_code')}, ',') as codes,
            {FIELDS_IN_USE.get('case_id')}
        FROM {TABLES_IN_USE.get('billing_codes')} BLNG
        INNER JOIN {TABLES_IN_USE.get('surgery_case')} SURG
            ON (BLNG.{FIELDS_IN_USE.get('visit_no')} = SURG.{FIELDS_IN_USE.get('visit_no')})
            AND (BLNG.{FIELDS_IN_USE.get('procedure_dtm')} = SURG.{FIELDS_IN_USE.get('case_date')})
        {filters_safe_sql}
        GROUP BY {FIELDS_IN_USE.get('case_id')}
    """

    result = list(execute_sql(command, **dict(zip(bind_names, filters)))[0])

    # Make co-occurrences list
    cpt_codes_csv = cpt()
    mapping = {x[0]: x[2] for x in cpt_codes_csv}
    procedures_in_case = [
        sorted(list(set([mapping[y] for y in x[0].split(",")]))) for x in result
    ]

    # Count the number of times each procedure co-occurred
    co_occur_counts = defaultdict(Counter)
    for case_procedures in procedures_in_case:
        for procedure in case_procedures:
            co_occur_counts[procedure].update(
                el for el in case_procedures if el is not procedure
            )

    # Count the raw number of procedures done
    total_counts = Counter(
        [item for sublist in procedures_in_case for item in sublist]
    )

    # Get the CPTs that happened alone (didn't have any other co-occurrences)
    all_single_cpt_cases = [
        y for y in [set(x) for x in procedures_in_case] if len(y) == 1
    ]
    exclusive_counts = Counter(
        [item for sublist in all_single_cpt_cases for item in sublist]
    )

    # Combine the raw count with co-occurrences
    combined_counts = [
        {
            "procedureName": proc_name,
            "procedureCodes": [
                key for key, val in mapping.items() if val == proc_name
            ],
            "count": total_counts[proc_name],
            "overlapList": {
                **co_occur_counts[proc_name],
                **{f"Only {proc_name}": exclusive_counts[proc_name]},
            },
        }
        for proc_name in total_counts
    ]

    return JsonResponse({"result": combined_counts})


@require_http_methods(["GET"])
@login_required
def fetch_surgery(request):
    log_request(request)

    # Get the values from the request
    case_id = request.GET.get("case_id")

    if not case_id:
        return HttpResponseBadRequest("case_id must be supplied.")

    command = f"""
    with
        codes as (
            SELECT
                BLNG.{FIELDS_IN_USE.get('visit_no')} || ', ' || BLNG.{FIELDS_IN_USE.get('procedure_dtm')} as comb,
                LISTAGG(BLNG.{FIELDS_IN_USE.get('code_desc')}, ', ') as codes
            FROM {TABLES_IN_USE.get('billing_codes')} BLNG
            group by {FIELDS_IN_USE.get('visit_no')} || ', ' || {FIELDS_IN_USE.get('procedure_dtm')}
        ),
        surg_cases as (
            SELECT
                TO_CHAR(SURG.{FIELDS_IN_USE.get('visit_no')}) || ', ' || TO_CHAR(SURG.{FIELDS_IN_USE.get('case_date')}) as comb,
                SURG.{FIELDS_IN_USE.get('case_id')},
                SURG.{FIELDS_IN_USE.get('visit_no')},
                SURG.{FIELDS_IN_USE.get('case_date')},
                SURG.{FIELDS_IN_USE.get('surgery_start_time')},
                SURG.{FIELDS_IN_USE.get('surgery_end_time')},
                SURG.{FIELDS_IN_USE.get('surgery_elapsed')},
                SURG.{FIELDS_IN_USE.get('surgery_type')},
                SURG.{FIELDS_IN_USE.get('prim_proc_desc')},
                SURG.{FIELDS_IN_USE.get('post_op_icu_los')}
            FROM {TABLES_IN_USE.get('surgery_case')} SURG
            WHERE SURG.{FIELDS_IN_USE.get('case_id')} = :id
        )
    SELECT surg_cases.*, codes.codes as codes
    FROM surg_cases
    INNER JOIN codes ON surg_cases.comb = codes.comb
    """

    cpts = cpt()
    data = execute_sql_dict(command=command, id=case_id)
    for row in data:
        row["cpt"] = list(set([cpt[2] for cpt in cpts if cpt[1] in row["CODES"]]))
        del row["CODES"]

    return JsonResponse({"result": data})


@require_http_methods(["GET"])
@login_required
def fetch_patient(request):
    log_request(request)

    # Get the values from the request
    patient_id = request.GET.get("patient_id")

    if not patient_id:
        return HttpResponseBadRequest("patient_id must be supplied.")

    command = f"""
    SELECT
        PATIENT.{FIELDS_IN_USE.get('birth_date')},
        PATIENT.{FIELDS_IN_USE.get('gender_code')},
        -- PATIENT.{FIELDS_IN_USE.get('gender_desc')},
        PATIENT.{FIELDS_IN_USE.get('race_code')},
        PATIENT.{FIELDS_IN_USE.get('race_desc')},
        PATIENT.{FIELDS_IN_USE.get('ethnicity_code')},
        PATIENT.{FIELDS_IN_USE.get('ethnicity_desc')},
        PATIENT.{FIELDS_IN_USE.get('death_date')}
    FROM
        {TABLES_IN_USE.get('patient')} PATIENT
    WHERE PATIENT.{FIELDS_IN_USE.get('patient_id')} = :id
    """

    data = execute_sql_dict(command=command, id=patient_id)

    return JsonResponse({"result": data})


@require_http_methods(["GET"])
@login_required
def get_sanguine_surgery_cases(request):
    log_request(request)

    filters, bind_names, filters_safe_sql = get_all_cpt_code_filters()

    # Get the data from the database
    command = rf"""
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
            BLOOD_PRODUCTS_DM.BLPD_SANGUINE_INTRAOP_TRANSFUSION
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
            BLOOD_PRODUCTS_DM.BLPD_SANGUINE_BILLING_CODES
        {filters_safe_sql}
        GROUP BY
            VISIT_NO
    ),
    MEDS AS (
        SELECT
            VISIT_NO,
            CASE WHEN SUM(TXA) > 0 THEN 1 ELSE 0 END AS TXA,
            CASE WHEN SUM(AMICAR) > 0 THEN 1 ELSE 0 END AS AMICAR,
            CASE WHEN SUM(B12) > 0 THEN 1 ELSE 0 END AS B12
        FROM (
            (SELECT
                VISIT_NO,
                SUM(CASE WHEN MEDICATION_ID IN (31383, 310071, 301530) THEN 1 ELSE 0 END) AS TXA,
                SUM(CASE WHEN MEDICATION_ID IN (300167, 300168, 300725, 310033) THEN 1 ELSE 0 END) AS AMICAR,
                SUM(CASE WHEN MEDICATION_ID IN (800001, 59535, 400030, 5553, 23584, 73156, 23579, 23582) THEN 1 ELSE 0 END) AS B12
            FROM
                BLOOD_PRODUCTS_DM.BLPD_SANGUINE_INTRAOP_MEDS
            group by VISIT_NO
            )
            UNION ALL
            (SELECT
                VISIT_NO,
                SUM(CASE WHEN MEDICATION_ID IN (31383, 310071, 301530) THEN 1 ELSE 0 END) AS TXA,
                SUM(CASE WHEN MEDICATION_ID IN (300167, 300168, 300725, 310033) THEN 1 ELSE 0 END) AS AMICAR,
                SUM(CASE WHEN MEDICATION_ID IN (800001, 59535, 400030, 5553, 23584, 73156, 23579, 23582) THEN 1 ELSE 0 END) AS B12
            FROM
                BLOOD_PRODUCTS_DM.BLPD_SANGUINE_EXTRAOP_MEDS
            group by VISIT_NO
            )
            ) INNER_MEDS
        GROUP BY VISIT_NO
    ),
    LAB_HB AS (
        SELECT
            V.VISIT_NO,
            V.LAB_DRAW_DTM,
            V.RESULT_DTM,
            V.RESULT_CODE,
            V.RESULT_VALUE
        FROM
            BLOOD_PRODUCTS_DM.BLPD_SANGUINE_VISIT_LABS V
        WHERE (INSTR(UPPER(RESULT_DESC), 'HEMOGLOBIN') > 0 OR INSTR(UPPER(V.RESULT_DESC), 'HGB') > 0)
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
                BLOOD_PRODUCTS_DM.BLPD_SANGUINE_SURGERY_CASE SC
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
                BLOOD_PRODUCTS_DM.BLPD_SANGUINE_SURGERY_CASE SC2
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
            BLOOD_PRODUCTS_DM.BLPD_SANGUINE_SURGERY_CASE SC3
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
        SURG.ANESTH_PROV_ID,
        SURG.SURGEON_PROV_ID,
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
        SURG.SURGERY_TYPE_DESC
    FROM
        BLOOD_PRODUCTS_DM.BLPD_SANGUINE_SURGERY_CASE SURG
    INNER JOIN BILLING_CODES BLNG
        ON SURG.VISIT_NO = BLNG.VISIT_NO
    LEFT JOIN TRANSFUSED_UNITS T
        ON SURG.CASE_ID = T.CASE_ID
    LEFT JOIN BLOOD_PRODUCTS_DM.BLPD_SANGUINE_VISIT VST
        ON SURG.VISIT_NO = VST.VISIT_NO
    LEFT JOIN MEDS
        ON SURG.VISIT_NO = MEDS.VISIT_NO
    LEFT JOIN HEMOGLOBIN HGB
        ON SURG.CASE_ID = HGB.CASE_ID
    """

    result = execute_sql_dict(command, **dict(zip(bind_names, filters)))

    return JsonResponse({"result": result})
