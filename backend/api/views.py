import ast
import os
import logging
import csv

from collections import Counter, defaultdict
from django.db import connections
from django.http import (
    HttpResponse,
    JsonResponse,
    HttpResponseBadRequest,
    HttpResponseNotAllowed,
    HttpResponseNotFound,
    HttpResponseForbidden,
)
from django.forms.models import model_to_dict
from django.contrib.auth.models import User
from django_cas_ng.decorators import login_required

from api.decorators import conditional_login_required
from api.models import State, StateAccess, AccessLevel
from api.utils import (
    cpt,
    get_all_cpt_code_filters,
    output_quarter,
)


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

logging.basicConfig(
    handlers=[
        logging.handlers.RotatingFileHandler(
            "sanguine.log", maxBytes=1000000000, backupCount=10, encoding="utf-8"
        )
    ],
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s",
)


def execute_sql(command, *args, **kwargs):
    with connections["hospital"].cursor() as cursor:
        cursor.execute(command, kwargs)
        return cursor.fetchall(), cursor.description


def execute_sql_dict(command, *args, **kwargs):
    with connections["hospital"].cursor() as cursor:
        cursor.execute(command, kwargs)

        rows = cursor.fetchall()
        cols = [col[0] for col in cursor.description]

        dict_rows = [dict(zip(cols, row)) for row in rows]
        return dict_rows


def index(request):
    if request.method == "GET":
        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} GET: index User: {request.user}"
        )
        return HttpResponse(
            "Bloodvis API endpoint. Please use the client application to access the data here."
        )
    else:
        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} Method Not Allowed: {request.method} index User: {request.user}"
        )
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


def whoami(request):
    if request.user.is_authenticated:
        return HttpResponse(request.user.username)
    else:
        return HttpResponse("Unauthorized", status=401)


@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
def get_procedure_counts(request):
    if request.method == "GET":
        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} GET: get_procedure_counts User: {request.user}"
        )

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
    else:
        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} Method Not Allowed: {request.method} get_procedure_counts User: {request.user}"
        )
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
def fetch_surgery(request):
    if request.method == "GET":
        # Get the values from the request
        case_id = request.GET.get("case_id")

        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} GET: fetch_surgery Params: case_id = {case_id} User: {request.user}"
        )

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
    else:
        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} Method Not Allowed: {request.method} fetch_surgery User: {request.user}"
        )
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
def fetch_patient(request):
    if request.method == "GET":
        # Get the values from the request
        patient_id = request.GET.get("patient_id")

        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} GET: fetch_patient Params: patient_id = {patient_id} User: {request.user}"
        )

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
    else:
        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} Method Not Allowed: {request.method} fetch_patient User: {request.user}"
        )
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
def hemoglobin(request):
    if request.method == "GET":
        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} GET: hemoglobin User: {request.user}"
        )
        command = f"""
        WITH
        LAB_HB AS (
            SELECT
                V.{FIELDS_IN_USE.get('visit_no')},
                V.{FIELDS_IN_USE.get('draw_dtm')},
                V.{FIELDS_IN_USE.get('result_dtm')},
                V.{FIELDS_IN_USE.get('result_code')},
                V.{FIELDS_IN_USE.get('result_value')}
            FROM
                {TABLES_IN_USE.get('visit_labs')} V
            WHERE UPPER(V.{FIELDS_IN_USE.get('result_desc')}) = \'HEMOGLOBIN\'
        ),
        PREOP_HB AS (
            SELECT
                X.{FIELDS_IN_USE.get('patient_id')},
                X.{FIELDS_IN_USE.get('visit_no')},
                X.{FIELDS_IN_USE.get('case_id')},
                X.{FIELDS_IN_USE.get('surgery_start_time')},
                X.{FIELDS_IN_USE.get('surgery_end_time')},
                X.DI_PREOP_DRAW_DTM,
                LH2.{FIELDS_IN_USE.get('result_value')}
            FROM (
                SELECT
                    SC.{FIELDS_IN_USE.get('patient_id')},
                    SC.{FIELDS_IN_USE.get('visit_no')},
                    SC.{FIELDS_IN_USE.get('case_id')},
                    SC.{FIELDS_IN_USE.get('surgery_start_time')},
                    SC.{FIELDS_IN_USE.get('surgery_end_time')},
                    MAX(LH.{FIELDS_IN_USE.get('draw_dtm')}) AS DI_PREOP_DRAW_DTM
                FROM
                    {TABLES_IN_USE.get('surgery_case')} SC
                INNER JOIN LAB_HB LH
                    ON SC.{FIELDS_IN_USE.get('visit_no')} = LH.{FIELDS_IN_USE.get('visit_no')}
                WHERE LH.{FIELDS_IN_USE.get('result_dtm')} < SC.{FIELDS_IN_USE.get('surgery_start_time')}
                GROUP BY
                    SC.{FIELDS_IN_USE.get('patient_id')},
                    SC.{FIELDS_IN_USE.get('visit_no')},
                    SC.{FIELDS_IN_USE.get('case_id')},
                    SC.{FIELDS_IN_USE.get('surgery_start_time')},
                    SC.{FIELDS_IN_USE.get('surgery_end_time')}
            ) X
            INNER JOIN LAB_HB LH2
                ON X.{FIELDS_IN_USE.get('visit_no')} = LH2.{FIELDS_IN_USE.get('visit_no')}
                AND X.DI_PREOP_DRAW_DTM = LH2.{FIELDS_IN_USE.get('draw_dtm')}
        ),
        POSTOP_HB AS (
            SELECT
                Z.{FIELDS_IN_USE.get('patient_id')},
                Z.{FIELDS_IN_USE.get('visit_no')},
                Z.{FIELDS_IN_USE.get('case_id')},
                Z.{FIELDS_IN_USE.get('surgery_start_time')},
                Z.{FIELDS_IN_USE.get('surgery_end_time')},
                Z.DI_POSTOP_DRAW_DTM,
                LH4.{FIELDS_IN_USE.get('result_value')}
            FROM (
                SELECT
                    SC2.{FIELDS_IN_USE.get('patient_id')},
                    SC2.{FIELDS_IN_USE.get('visit_no')},
                    SC2.{FIELDS_IN_USE.get('case_id')},
                    SC2.{FIELDS_IN_USE.get('surgery_start_time')},
                    SC2.{FIELDS_IN_USE.get('surgery_end_time')},
                    MIN(LH3.{FIELDS_IN_USE.get('draw_dtm')}) AS DI_POSTOP_DRAW_DTM
                FROM
                    {TABLES_IN_USE.get('surgery_case')} SC2
                INNER JOIN LAB_HB LH3
                    ON SC2.{FIELDS_IN_USE.get('visit_no')} = LH3.{FIELDS_IN_USE.get('visit_no')}
                WHERE LH3.{FIELDS_IN_USE.get('draw_dtm')} > SC2.{FIELDS_IN_USE.get('surgery_end_time')}
                GROUP BY
                    SC2.{FIELDS_IN_USE.get('patient_id')},
                    SC2.{FIELDS_IN_USE.get('visit_no')},
                    SC2.{FIELDS_IN_USE.get('case_id')},
                    SC2.{FIELDS_IN_USE.get('surgery_start_time')},
                    SC2.{FIELDS_IN_USE.get('surgery_end_time')}
            ) Z
            INNER JOIN LAB_HB LH4
                ON Z.{FIELDS_IN_USE.get('visit_no')} = LH4.{FIELDS_IN_USE.get('visit_no')}
                AND Z.DI_POSTOP_DRAW_DTM = LH4.{FIELDS_IN_USE.get('draw_dtm')}
        )
        SELECT
            SC3.{FIELDS_IN_USE.get('patient_id')},
            SC3.{FIELDS_IN_USE.get('case_id')},
            SC3.{FIELDS_IN_USE.get('visit_no')},
            SC3.{FIELDS_IN_USE.get('case_date')},
            EXTRACT (YEAR from SC3.{FIELDS_IN_USE.get('case_date')}) YEAR,
            EXTRACT (MONTH from SC3.{FIELDS_IN_USE.get('case_date')}) AS MONTH,
            SC3.{FIELDS_IN_USE.get('surgery_start_time')},
            SC3.{FIELDS_IN_USE.get('surgery_end_time')},
            SC3.{FIELDS_IN_USE.get('surgery_elapsed')},
            SC3.{FIELDS_IN_USE.get('surgery_type')},
            SC3.{FIELDS_IN_USE.get('surgeon_id')},
            SC3.{FIELDS_IN_USE.get('anest_id')},
            SC3.{FIELDS_IN_USE.get('prim_proc_desc')},
            SC3.{FIELDS_IN_USE.get('post_op_icu_los')},
            SC3.{FIELDS_IN_USE.get('sched_site_desc')},
            MAX(CASE
                WHEN PRE.DI_PREOP_DRAW_DTM IS NOT NULL
                THEN PRE.DI_PREOP_DRAW_DTM
            END)
            AS DI_PREOP_DRAW_DTM,
            MAX(CASE
                WHEN PRE.{FIELDS_IN_USE.get('result_value')} IS NOT NULL
                THEN PRE.{FIELDS_IN_USE.get('result_value')}
            END)
            AS PREOP_HEMO,
            MAX(CASE
                WHEN POST.DI_POSTOP_DRAW_DTM IS NOT NULL
                THEN POST.DI_POSTOP_DRAW_DTM
            END)
            AS DI_POSTOP_DRAW_DTM,
            MAX(CASE
                WHEN POST.{FIELDS_IN_USE.get('result_value')} IS NOT NULL
                THEN POST.{FIELDS_IN_USE.get('result_value')}
            END)
            AS POSTOP_HEMO
        FROM
            {TABLES_IN_USE.get('surgery_case')} SC3
        LEFT OUTER JOIN PREOP_HB PRE
            ON SC3.{FIELDS_IN_USE.get('case_id')} = PRE.{FIELDS_IN_USE.get('case_id')}
        LEFT OUTER JOIN POSTOP_HB POST
            ON SC3.{FIELDS_IN_USE.get('case_id')} = POST.{FIELDS_IN_USE.get('case_id')}
        GROUP BY SC3.{FIELDS_IN_USE.get('patient_id')},
            SC3.{FIELDS_IN_USE.get('case_id')},
            SC3.{FIELDS_IN_USE.get('visit_no')},
            SC3.{FIELDS_IN_USE.get('case_date')},
            EXTRACT (YEAR from SC3.{FIELDS_IN_USE.get('case_date')}),
            EXTRACT (MONTH from SC3.{FIELDS_IN_USE.get('case_date')}),
            SC3.{FIELDS_IN_USE.get('surgery_start_time')},
            SC3.{FIELDS_IN_USE.get('surgery_end_time')},
            SC3.{FIELDS_IN_USE.get('surgery_elapsed')},
            SC3.{FIELDS_IN_USE.get('surgery_type')},
            SC3.{FIELDS_IN_USE.get('surgeon_id')},
            SC3.{FIELDS_IN_USE.get('anest_id')},
            SC3.{FIELDS_IN_USE.get('prim_proc_desc')},
            SC3.{FIELDS_IN_USE.get('post_op_icu_los')},
            SC3.{FIELDS_IN_USE.get('sched_site_desc')}
        """

        result, description = execute_sql(command)

        items = [
            {
                "CASE_ID": row[1],
                "VISIT_ID": row[2],
                "YEAR": row[4],
                "QUARTER": str(row[4])[2:] + "/" + str(output_quarter(row[5])),
                "MONTH": str(row[4])[2:] + "/" + str(row[5]),
                "DATE": row[3],
                "HEMO": [row[-3], row[-1]],
                "SURGEON_ID": row[10],
                "ANESTHESIOLOGIST_ID": row[11],
                "SURGERY_TYPE": row[9],
                "PATIENT_ID": row[0],
            }
            for row in result
        ]

        return JsonResponse({"result": items})
    else:
        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} Method Not Allowed: {request.method} hemoglobin User: {request.user}"
        )
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
def state(request):
    if request.method == "GET":
        # Get the name from the querystring
        name = request.GET.get("name")
        user = request.user

        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} GET: state Params: name = {name} User: {request.user}"
        )

        if name:
            # Get the object from the database and all related StateAccess objects
            try:
                state = State.objects.get(name=name)  # username = uid
            except State.DoesNotExist:
                return HttpResponseNotFound("State not found")
            state_access = StateAccess.objects.filter(state=state).filter(user=user)

            # Make sure that user is owner or at least reader
            if not (str(state.owner) == str(user) or state_access or state.public):
                return HttpResponseForbidden("Not authorized")

            # Return the json for the state
            return JsonResponse(model_to_dict(state))

        else:
            # Get the names of all the state objects that a user can access
            states = [o.name for o in State.objects.all().filter(owner=user)]
            state_access = [o.state.name for o in StateAccess.objects.filter(user=user)]
            public_states = [o.name for o in State.objects.all().filter(public=True)]

            response = set(states + state_access + public_states)

            # Return the names as a list
            return JsonResponse(list(response), safe=False)

    elif request.method == "POST":
        # Get the name and definition from the request
        name = request.POST.get("name")
        definition = request.POST.get("definition")
        owner = request.user
        public_request = request.POST.get("public")

        public = True if public_request == "true" else False

        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} POST: state Params: name = {name}, public = {public} User: {request.user}"
        )

        if State.objects.filter(name=name).exists():
            return HttpResponseBadRequest(
                "a state with that name already exists, try another"
            )

        if name and definition:  # owner is guaranteed by login
            # Create and save the new State object
            new_state = State(
                name=name, definition=definition, owner=owner, public=public
            )
            new_state.save()

            return HttpResponse("state object created", 200)
        else:
            return HttpResponseBadRequest("missing params: [name, definition, owner]")

    elif request.method == "PUT":
        # Get the required information from the request body
        put = ast.literal_eval(request.body.decode())
        old_name = put.get("old_name")
        new_name = put.get("new_name")
        new_definition = put.get("new_definition")
        new_public_request = put.get("new_public")

        new_public = True if new_public_request == "true" else False

        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} PUT: state Params: old_name = {old_name}, new_name = {new_name} User: {request.user}"
        )

        owned_states = [o.name for o in State.objects.all().filter(owner=request.user)]
        public_states = [o.name for o in State.objects.all().filter(public=True)]
        writable_states = [
            o.state.name
            for o in StateAccess.objects.filter(user=request.user).filter(role="WR")
        ]
        readable_states = [
            o.state.name
            for o in StateAccess.objects.filter(user=request.user).filter(role="RE")
        ]
        all_accessible_states = set(
            owned_states + public_states + writable_states + readable_states
        )
        all_modifiable_states = set(owned_states + writable_states)

        if old_name not in all_accessible_states:
            return HttpResponseNotFound("State not found")
        if old_name not in all_modifiable_states:
            return HttpResponseForbidden("Not authorized")

        # Update the State object and save
        result = State.objects.get(name=old_name)
        result.name = new_name
        result.definition = new_definition
        result.public = new_public
        result.save()

        return HttpResponse("state object updated", 200)

    elif request.method == "DELETE":
        # Get the required information from the request body
        delete = ast.literal_eval(request.body.decode())
        name = delete.get("name")

        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} DELETE: state Params: name = {name} User: {request.user}"
        )

        # Delete the matching State object
        try:
            result = State.objects.get(name=name)  # username = uid
        except State.DoesNotExist:
            return HttpResponseNotFound("State not found")

        if str(result.owner) != str(request.user):
            return HttpResponseForbidden("Requester is not owner")

        StateAccess.objects.all().filter(state_id=result.id).delete()

        result.delete()

        return HttpResponse("state object deleted", 200)

    else:
        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} Method Not Allowed: {request.method} state User: {request.user}"
        )
        return HttpResponseNotAllowed(
            ["GET", "POST", "PUT", "DELETE"], "Method Not Allowed"
        )


@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
def share_state(request):
    if request.method == "POST":
        name = request.POST.get("name")
        user = request.POST.get("user")
        role = request.POST.get("role")

        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} POST: share_state Params: name = {name}, user = {user}, role = {role} User: {request.user}"
        )

        requesting_user = request.user

        if role not in [a[1] for a in AccessLevel.choices()]:
            return HttpResponseBadRequest(
                f"role must be in: {[a[1] for a in AccessLevel.choices()]}"
            )

        try:
            state_object = State.objects.get(name=name)
        except State.DoesNotExist:
            return HttpResponseNotFound("State not found")

        try:
            user_object = User.objects.get(username=user)  # username = uid
        except User.DoesNotExist:
            return HttpResponseBadRequest("User does not exist")

        # Make sure state exists, requesting users is owner, and new user is not owner, user exists
        if str(state_object.owner) != str(requesting_user):
            return HttpResponseForbidden("Requesting user is not the owner")
        if str(state_object.owner) == str(user):
            return HttpResponseBadRequest("User is already the owner of the state")

        # Check that new user is not already reader/writer, role in allowed choices
        state_access_object = StateAccess.objects.filter(state=state_object).filter(
            user=user
        )
        roles = [a.role for a in state_access_object]
        if state_access_object.count() > 0:
            if state_access_object.count() == 1:
                state_access_object = state_access_object.first()
                state_access_object.role = role
                state_access_object.save()
                return HttpResponse("Updated user role", 200)
            else:
                return HttpResponse(
                    "This user already has multiple access roles", status=500
                )

        # If all above passed, make the StateAccess object
        StateAccess.objects.create(
            state=state_object,
            user=user,
            role=role,
        )
        return HttpResponse("Added new user to role", 201)

    else:
        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} Method Not Allowed: {request.method} share_state User: {request.user}"
        )
        return HttpResponseNotAllowed(["POST"], "Method Not Allowed")


@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
def state_unids(request):
    if request.method == "GET":
        state_name = request.GET.get("state_name")

        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} POST: state_unids Params: state_name = {state_name} User: {request.user}"
        )

        try:
            state = State.objects.get(name=state_name)  # username = uid
        except State.DoesNotExist:
            return HttpResponseNotFound("State not found")
        state_access = StateAccess.objects.filter(state=state)

        users_and_roles = [(access.user, access.role) for access in state_access]

        response = {
            "owner": state.owner,
            "users_and_roles": users_and_roles,
        }

        return JsonResponse(response)
    else:
        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} Method Not Allowed: {request.method} state_unids User: {request.user}"
        )
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
def surgeon_anest_names(request):
    if request.method == "GET":
        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} POST: surgeon_names Params: none User: {request.user}"
        )

        # Import the mappings between surgeon ID and name
        surgeon_mapping = {}

        with open("SURGEON_LOOKUP_040422.csv", "r") as file:
            read_csv = csv.reader(file, delimiter=",")
            for row in read_csv:
                surgeon_mapping[row[0]] = row[1]

        # Import the mappings between anesthesiologist ID and name
        anest_mapping = {}

        with open("ANESTH_LOOKUP_040422.csv", "r") as file:
            read_csv = csv.reader(file, delimiter=",")
            for row in read_csv:
                anest_mapping[row[0]] = row[1]

        response = {"SURGEON_ID": surgeon_mapping, "ANESTHESIOLOGIST_ID": anest_mapping}
        return JsonResponse(response)
    else:
        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} Method Not Allowed: {request.method} surgeon_names User: {request.user}"
        )
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
def get_sanguine_surgery_cases(request):
    if request.method == "GET":
        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} GET: get_sanguine_surgery_cases User: {request.user}"
        )

        filters, bind_names, filters_safe_sql = get_all_cpt_code_filters()

        # Get the data from the database
        command = f"""
        WITH TRANSFUSED_UNITS AS (
            SELECT
                SUM(NVL(PRBC_UNITS, 0)) + CEIL(NVL(SUM(RBC_VOL)/250, 0)) AS PRBC_UNITS,
                SUM(NVL(FFP_UNITS, 0)) + CEIL(NVL(SUM(FFP_VOL)/220, 0)) AS FFP_UNITS,
                SUM(NVL(PLT_UNITS, 0)) + CEIL(NVL(SUM(PLT_VOL)/300, 0)) AS PLT_UNITS,
                SUM(NVL(CRYO_UNITS, 0)) + CEIL(NVL(SUM(CRYO_VOL)/75, 0)) AS CRYO_UNITS,
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
            WHERE UPPER(V.RESULT_DESC) = 'HEMOGLOBIN' OR INSTR(UPPER(V.RESULT_DESC), 'HGB') > 0
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

    else:
        logging.info(
            f"{request.META.get('HTTP_X_FORWARDED_FOR')} Method Not Allowed: {request.method} get_sanguine_surgery_cases User: {request.user}"
        )
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")
