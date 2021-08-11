import ast
import os
import logging

from collections import Counter
from django.http import (
    HttpResponse,
    JsonResponse,
    HttpResponseBadRequest,
    HttpResponseNotAllowed
)
from django.forms.models import model_to_dict
from django.contrib.auth.models import User
from django_cas_ng.decorators import login_required

from api.decorators import conditional_login_required
from api.models import State, StateAccess, AccessLevel
from api.utils import (
    data_dictionary,
    cpt,
    execute_sql,
    get_all_by_agg,
    get_filters,
    output_quarter,
    validate_dates
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

}

FIELDS_IN_USE = DE_IDENT_FIELDS
TABLES_IN_USE = DE_IDENT_TABLES

logging.basicConfig(
    handlers=[logging.handlers.RotatingFileHandler("sanguine.log", maxBytes=1000000000, backupCount=10, encoding="utf-8")],
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s"
)


def index(request):
    if request.method == "GET":
        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} GET: index User: {request.user}")
        return HttpResponse(
            "Bloodvis API endpoint. Please use the client application to access the data here."
        )
    else:
        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} Method Not Allowed: {request.method} index User: {request.user}")
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def get_attributes(request):
    if request.method == "GET":
        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} GET: get_attributes User: {request.user}")
        # Get the list of allowed filter_selection names from the cpt function
        allowed_names = list(set([a[2] for a in cpt()]))

        filters, bind_names, filters_safe_sql = get_filters(allowed_names)

        # Make the connection and execute the command
        # ,CASE WHEN PRIM_PROC_DESC LIKE "%REDO%" THEN 1 ELSE 0 END AS REDO
        command = f"""
            SELECT
                {FIELDS_IN_USE.get("billing_code")},
                {FIELDS_IN_USE.get("case_id")}
            FROM (
                SELECT
                    BLNG.*, SURG.*
                FROM {TABLES_IN_USE.get("billing_codes")} BLNG
                INNER JOIN {TABLES_IN_USE.get("surgery_case")} SURG
                    ON (BLNG.{FIELDS_IN_USE.get("patient_id")} = SURG.{FIELDS_IN_USE.get("patient_id")})
                    AND (BLNG.{FIELDS_IN_USE.get("visit_no")} = SURG.{FIELDS_IN_USE.get("visit_no")})
                    AND (BLNG.{FIELDS_IN_USE.get("procedure_dtm")} = SURG.{FIELDS_IN_USE.get("case_date")})
                {filters_safe_sql}
            )
        """

        result = execute_sql(
            command,
            dict(zip(bind_names, filters))
        )

        # Return the result, the multi-selector component
        # in React requires the below format
        items = [
            {
                "procedure": [x[2] for x in cpt() if x[0] == str(row[0])][0],
                "id": row[1]
            } for row in result
        ]
        # Remove duplicated dicts (stops the double counting)
        items = [dict(t) for t in {tuple(d.items()) for d in items}]

        # Count the number of occurrences of each type of procedure
        items = dict(Counter(i["procedure"] for i in items))
        items = [{"value": k, "count": v} for k, v in items.items()]
        return JsonResponse({"result": items})
    else:
        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} Method Not Allowed: {request.method} get_attributes User: {request.user}")
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def fetch_surgery(request):
    if request.method == "GET":
        # Get the values from the request
        case_id = request.GET.get("case_id")

        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} GET: fetch_surgery Params: case_id = {case_id} User: {request.user}")

        if not case_id:
            return HttpResponseBadRequest("case_id must be supplied.")

        command = f"""
        SELECT
            SURG.{FIELDS_IN_USE.get("case_date")},
            SURG.{FIELDS_IN_USE.get("surgery_start_time")},
            SURG.{FIELDS_IN_USE.get("surgery_end_time")},
            SURG.{FIELDS_IN_USE.get("surgery_elapsed")},
            SURG.{FIELDS_IN_USE.get("surgery_type")},
            SURG.{FIELDS_IN_USE.get("prim_proc_desc")},
            SURG.{FIELDS_IN_USE.get("post_op_icu_los")}
        FROM
            {TABLES_IN_USE.get("surgery_case")} SURG
        WHERE SURG.{FIELDS_IN_USE.get("case_id")} = :id
        """

        result = execute_sql(command, id=case_id)
        data_dict = data_dictionary()
        data = [
            dict(zip([data_dict[key[0]] for key in result.description], row))
            for row in result
        ]

        return JsonResponse({"result": data})
    else:
        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} Method Not Allowed: {request.method} fetch_surgery User: {request.user}")
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def fetch_patient(request):
    if request.method == "GET":
        # Get the values from the request
        patient_id = request.GET.get("patient_id")

        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} GET: fetch_patient Params: patient_id = {patient_id} User: {request.user}")

        if not patient_id:
            return HttpResponseBadRequest("patient_id must be supplied.")

        command = f"""
        SELECT
            PATIENT.{FIELDS_IN_USE.get("birth_date")},
            PATIENT.{FIELDS_IN_USE.get("gender_code")},
            PATIENT.{FIELDS_IN_USE.get("gender_desc")},
            PATIENT.{FIELDS_IN_USE.get("race_code")},
            PATIENT.{FIELDS_IN_USE.get("race_desc")},
            PATIENT.{FIELDS_IN_USE.get("ethnicity_code")},
            PATIENT.{FIELDS_IN_USE.get("ethnicity_desc")},
            PATIENT.{FIELDS_IN_USE.get("death_date")}
        FROM
            {TABLES_IN_USE.get("patient")} PATIENT
        WHERE PATIENT.{FIELDS_IN_USE.get("patient_id")} = :id
        """

        result = execute_sql(command, id=patient_id)
        data_dict = data_dictionary()
        data = [
            dict(zip([data_dict[key[0]] for key in result.description], row))
            for row in result
        ]

        return JsonResponse({"result": data})
    else:
        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} Method Not Allowed: {request.method} fetch_patient User: {request.user}")
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def request_transfused_units(request):
    if request.method == "GET":
        # Get the required parameters from the query string
        transfusion_type = request.GET.get("transfusion_type")
        date_range = request.GET.get("date_range") or ""

        # Get the optional parameters from the query string
        aggregated_by = request.GET.get("aggregated_by")
        patient_ids = request.GET.get("patient_ids") or ""
        case_ids = request.GET.get("case_ids") or ""
        filter_selection = request.GET.get("filter_selection") or ""

        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} GET: request_transfused_units Params: transfusion_type = {transfusion_type}, date_range = {date_range}, aggregated_by = {aggregated_by}, patient_ids = {patient_ids}, case_ids = {case_ids}, filter_selection = {filter_selection} User: {request.user}")

        # Parse the date_range and the filter selection
        patient_ids = patient_ids.split(",") if patient_ids else []
        case_ids = case_ids.split(",") if case_ids else []
        date_range = [s for s in date_range.split(",")]
        filter_selection = filter_selection.split(",")

        # Check the required parameters are there
        if not (transfusion_type):
            return HttpResponseBadRequest("transfusion_type must be supplied.")

        # Validate the dates
        if not (validate_dates(date_range) and len(date_range) == 2):
            return HttpResponseBadRequest("date_range is improperly formatted. It must look like: 09-JAN-2019,31-DEC-2020")

        # Coerce that params into a useable format
        min_time = date_range[0]
        max_time = date_range[1]

        # Check that the values supplied are valid possibilities
        blood_products = [
            "PRBC_UNITS",
            "FFP_UNITS",
            "PLT_UNITS",
            "CRYO_UNITS",
            "CELL_SAVER_ML",
            "ALL_UNITS",
        ]
        aggregates = {
            "YEAR": f"EXTRACT (YEAR FROM LIMITED_SURG.{FIELDS_IN_USE.get("case_date")})",
            "SURGEON_ID": f"LIMITED_SURG.{FIELDS_IN_USE.get("surgeon_id")}",
            "ANESTHESIOLOGIST_ID": f"LIMITED_SURG.{FIELDS_IN_USE.get("anest_id")}",
        }
        having_options = {
            "PRBC_UNITS": "HAVING SUM(PRBC_UNITS) < 200 OR SUM(PRBC_UNITS) IS NULL",
            "FFP_UNITS": "HAVING SUM(FFP_UNITS) < 200 OR SUM(FFP_UNITS) IS NULL",
            "PLT_UNITS": "HAVING SUM(PLT_UNITS) < 30 OR SUM(PLT_UNITS) IS NULL",
            "CRYO_UNITS": "HAVING SUM(CRYO_UNITS) < 100 OR SUM(CRYO_UNITS) IS NULL",
            "CELL_SAVER_ML": "HAVING SUM(CELL_SAVER_ML) < 15000 OR SUM(CELL_SAVER_ML) IS NULL",
            "ALL_UNITS": (
                """
                HAVING
                    (SUM(PRBC_UNITS) < 200 OR SUM(PRBC_UNITS) IS NULL) AND
                    (SUM(FFP_UNITS) < 200 OR SUM(FFP_UNITS) IS NULL) AND
                    (SUM(PLT_UNITS) < 30 OR SUM(PLT_UNITS) IS NULL) AND
                    (SUM(CRYO_UNITS) < 100 OR SUM(CRYO_UNITS) IS NULL) AND
                    (SUM(CELL_SAVER_ML) < 15000 OR SUM(CELL_SAVER_ML) IS NULL)
                """
            ),
        }

        # Check that the params are valid
        if transfusion_type not in blood_products:
            return HttpResponseBadRequest(f"transfusion_type must be one of the following: {blood_products}")

        if aggregated_by and (aggregated_by not in aggregates.keys()):
            return HttpResponseBadRequest(f"If you use aggregated_by, it must be one of the following: {list(aggregates.keys())}")

        if aggregated_by and transfusion_type == "ALL_UNITS":
            return HttpResponseBadRequest("Requesting ALL_UNITS with an aggregation is unsupported, please query each unit type individually.")

        # Update the transfusion type to something more sql
        # friendly if "ALL_UNITS"
        having_sql = having_options.get(transfusion_type)
        transfusion_type = "PRBC_UNITS,FFP_UNITS,PLT_UNITS,CRYO_UNITS,CELL_SAVER_ML" if transfusion_type == "ALL_UNITS" else transfusion_type

        # Update the transfusion type to SUM(var) and add make a group by
        # if we are aggregating
        if transfusion_type != "PRBC_UNITS,FFP_UNITS,PLT_UNITS,CRYO_UNITS,CELL_SAVER_ML":
            transfusion_type = f"SUM({transfusion_type}), {aggregates[aggregated_by]}" if aggregated_by else f"SUM({transfusion_type})"
        else:
            transfusion_type = (
                f"SUM(PRBC_UNITS),SUM(FFP_UNITS),SUM(PLT_UNITS),SUM(CRYO_UNITS),SUM(CELL_SAVER_ML),{aggregates[aggregated_by]}"
                if aggregated_by
                else "SUM(PRBC_UNITS),SUM(FFP_UNITS),SUM(PLT_UNITS),SUM(CRYO_UNITS),SUM(CELL_SAVER_ML)"
            )

        group_by = (
            f"GROUP BY LIMITED_SURG.{FIELDS_IN_USE.get("surgeon_id")}, LIMITED_SURG.{FIELDS_IN_USE.get("anest_id")}, LIMITED_SURG.{FIELDS_IN_USE.get("patient_id")}, LIMITED_SURG.{FIELDS_IN_USE.get("case_id")}, {aggregates[aggregated_by]}"
            if aggregated_by
            else f"GROUP BY LIMITED_SURG.{FIELDS_IN_USE.get("surgeon_id")}, LIMITED_SURG.{FIELDS_IN_USE.get("anest_id")}, LIMITED_SURG.{FIELDS_IN_USE.get("patient_id")}, LIMITED_SURG.{FIELDS_IN_USE.get("case_id")}"
        )

        # Generate the CPT filter sql
        filters, bind_names, filters_safe_sql = get_filters(filter_selection)

        # Generate the patient filters
        pat_bind_names = [f":pat_id{str(i)}" for i in range(len(patient_ids))]
        pat_filters_safe_sql = (
            f"AND TRNSFSD.{FIELDS_IN_USE.get("patient_id")} IN ({",".join(pat_bind_names)}) "
            if patient_ids != []
            else ""
        )

        # Generate case id filters
        case_bind_names = [f":case_id{str(i)}" for i in range(len(case_ids))]
        case_filters_safe_sql = (
            f"AND TRNSFSD.{FIELDS_IN_USE.get("case_id")} IN ({",".join(case_bind_names)}) "
            if case_ids != []
            else ""
        )

        # Build the sql query
        # Safe to use format strings since there are limited options for
        # aggregated_by and transfusion_type
        command = f"""
        SELECT
            LIMITED_SURG.{FIELDS_IN_USE.get("surgeon_id")},
            LIMITED_SURG.{FIELDS_IN_USE.get("anest_id")},
            LIMITED_SURG.{FIELDS_IN_USE.get("patient_id")},
            LIMITED_SURG.{FIELDS_IN_USE.get("case_id")},
            {transfusion_type}
        FROM {TABLES_IN_USE.get("intra_op_trnsfsd")} TRNSFSD
        RIGHT JOIN (
            SELECT *
            FROM {TABLES_IN_USE.get("surgery_case")}
            WHERE {FIELDS_IN_USE.get("case_id")} IN (
                SELECT {FIELDS_IN_USE.get("case_id")}
                FROM {TABLES_IN_USE.get("billing_codes")} BLNG
                INNER JOIN {TABLES_IN_USE.get("surgery_case")} SURG
                    ON (BLNG.{FIELDS_IN_USE.get("patient_id")} = SURG.{FIELDS_IN_USE.get("patient_id")}) AND (BLNG.{FIELDS_IN_USE.get("visit_no")} = SURG.{FIELDS_IN_USE.get("visit_no")}) AND (BLNG.{FIELDS_IN_USE.get("procedure_dtm")} = SURG.{FIELDS_IN_USE.get("case_date")})
                {filters_safe_sql}
            )
        ) LIMITED_SURG
            ON LIMITED_SURG.{FIELDS_IN_USE.get("case_id")} = TRNSFSD.{FIELDS_IN_USE.get("case_id")}
        WHERE LIMITED_SURG.{FIELDS_IN_USE.get("case_date")} BETWEEN :min_time AND :max_time
        {pat_filters_safe_sql} {case_filters_safe_sql}
        {group_by}
        {having_sql}
        """

        # Execute the query
        result = execute_sql(
            command,
            dict(
                zip(bind_names + pat_bind_names + case_bind_names,
                    filters + patient_ids + case_ids),
                min_time=min_time,
                max_time=max_time
            )
        )

        # Get the raw data from the server
        result_dict = []
        for row in result:
            result_dict.append({
                "surgeon_id": row[0],
                "anest_id": row[1],
                "pat_id": row[2],
                "case_id": row[3],
                "transfused_units": (row[4:9]) if ("PRBC_UNITS" in transfusion_type and "FFP_UNITS" in transfusion_type) else (row[4] or 0),
                # aggregated_by and ALL_UNITS never happen together
                "aggregated_by": None if not aggregated_by else row[5]
            })

        # Manipulate the data into the right format
        if aggregated_by:
            aggregated_bys = list(
                set(map(lambda x: x["aggregated_by"], result_dict)))
            cleaned = [
                {
                    "aggregated_by": agg,
                    "transfused_units": get_all_by_agg(result_dict, agg, "transfused_units"),
                    "case_id": list(set(get_all_by_agg(result_dict, agg, "case_id"))),
                    "pat_id": list(set(get_all_by_agg(result_dict, agg, "pat_id"))),
                } for agg in aggregated_bys]
        else:
            cleaned = result_dict

        return JsonResponse(cleaned, safe=False)
    else:
        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} Method Not Allowed: {request.method} request_transfused_units User: {request.user}")
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def test_results(request):
    if request.method == "GET":
        case_ids = request.GET.get("case_ids") or ""
        test_types = request.GET.get("test_types") or ""

        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} GET: test_results Params: case_ids = {case_ids}, test_types = {test_types} User: {request.user}")

        if not case_ids:
            HttpResponseBadRequest("You must supply case_ids")

        case_ids = case_ids.split(",")
    else:
        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} Method Not Allowed: {request.method} test_results User: {request.user}")
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def risk_score(request):
    if request.method == "GET":
        patient_ids = request.GET.get("patient_ids") or ""

        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} GET: risk_score Params: patient_ids = {patient_ids} User: {request.user}")

        # Parse the ids
        patient_ids = patient_ids.split(",") if patient_ids else []

        if patient_ids:
            # Generate the patient filters
            pat_bind_names = [
                f":pat_id{str(i)}" for i in range(len(patient_ids))]
            pat_filters_safe_sql = f"AND DI_PAT_ID IN ({",".join(pat_bind_names)}) " if patient_ids != [
            ] else ""
        else:
            pat_bind_names = []
            pat_filters_safe_sql = ""

        # Defined the sql command
        command = f"""
        SELECT
            {FIELDS_IN_USE.get("patient_id")},
            {FIELDS_IN_USE.get("visit_no")},
            {FIELDS_IN_USE.get("apr_drg_weight")},
            {FIELDS_IN_USE.get("apr_drg_code")},
            {FIELDS_IN_USE.get("apr_drg_desc")},
            {FIELDS_IN_USE.get("apr_drg_rom")},
            {FIELDS_IN_USE.get("apr_drg_soi")}
        FROM
            {TABLES_IN_USE.get("visit")}
        WHERE 1=1
            {pat_filters_safe_sql}
        """

        result = execute_sql(
            command,
            dict(zip(pat_bind_names, patient_ids))
        )

        result_list = []
        for row in result:
            result_list.append({
                "pat_id": row[0],
                "visit_no": row[1],
                "apr_drg_weight": row[2],
                "apr_drg_code": row[3],
                "apr_drg_desc": row[4],
                "apr_drg_rom": row[5],
                "apr_drg_soi": row[6],
            })

        return JsonResponse(result_list, safe=False)
    else:
        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} Method Not Allowed: {request.method} risk_score User: {request.user}")
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def patient_outcomes(request):
    if request.method == "GET":
        patient_ids = request.GET.get("patient_ids") or ""

        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} GET: patient_outcomes Params: patient_ids = {patient_ids} User: {request.user}")

        # Parse the ids
        patient_ids = patient_ids.split(",") if patient_ids else []

        if patient_ids:
            # Generate the patient filters
            pat_bind_names = [
                f":pat_id{str(i)}" for i in range(len(patient_ids))
            ]
            pat_filters_safe_sql = (
                f"AND VST.{FIELDS_IN_USE.get("patient_id")} IN ({",".join(pat_bind_names)}) "
                if patient_ids != [] 
                else ""
            )
        else:
            pat_bind_names = []
            pat_filters_safe_sql = ""

        # Define the sql command
        command = f"""
        SELECT
            VST.{FIELDS_IN_USE.get("patient_id")},
            VST.{FIELDS_IN_USE.get("visit_no")},
            CASE WHEN TOTAL_VENT_MINS > 1440 THEN 1 ELSE 0 END AS VENT_1440,
            CASE WHEN PAT_EXPIRED = "Y" THEN 1 ELSE 0 END AS PAT_DEATH,
            BLNG_OUTCOMES.STROKE,
            BLNG_OUTCOMES.ECMO,
            MEDS.TRANEXAMIC_ACID,
            MEDS.AMICAR,
            MEDS.B12,
            MEDS.WARFARIN,
            MEDS.DABIGATRAN,
            MEDS.RIVAROXABAN,
            MEDS.APIXABAN,
            MEDS.HEPARIN,
            MEDS.FONDAPARINUX,
            MEDS.BIVALIRUDIN,
            MEDS.CLOPIDOGREL,
            MEDS.TICAGRELOR,
            MEDS.IRON_ORAL,
            MEDS.IRON_IV,
            CASE
                WHEN MEDS.WARFARIN = 1
                OR MEDS.DABIGATRAN = 1
                OR MEDS.RIVAROXABAN = 1
                OR MEDS.APIXABAN = 1
                OR MEDS.HEPARIN = 1
                OR MEDS.FONDAPARINUX = 1
                OR MEDS.BIVALIRUDIN = 1
            THEN 1 ELSE 0 END AS ANTICOAGULENT,
            CASE
                WHEN MEDS.CLOPIDOGREL = 1
                OR MEDS.TICAGRELOR = 1
            THEN 1 ELSE 0 END AS ANTI_PLATELET
        FROM
            {TABLES_IN_USE["visit"]} VST
        LEFT JOIN (
            SELECT
                {FIELDS_IN_USE.get("patient_id")},
                {FIELDS_IN_USE.get("visit_no")},
                CASE WHEN SUM(CASE WHEN CODE IN ("I97.820", "997.02") THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS STROKE,
                CASE WHEN SUM(CASE WHEN CODE IN ("33952", "33954", "33956", "33958", "33962", "33964", "33966", "33973", "33974", "33975", "33976", "33977", "33978", "33979", "33980", "33981", "33982", "33983", "33984", "33986", "33987", "33988", "33989") THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS ECMO
            FROM {TABLES_IN_USE["billing_codes"]}
            WHERE {FIELDS_IN_USE.get("present_on_adm")} IS NULL
            GROUP BY {FIELDS_IN_USE.get("patient_id")}, {FIELDS_IN_USE.get("visit_no")}
        ) BLNG_OUTCOMES
            ON VST.{FIELDS_IN_USE.get("patient_id")} = BLNG_OUTCOMES.{FIELDS_IN_USE.get("patient_id")} AND VST.{FIELDS_IN_USE.get("visit_no")} = BLNG_OUTCOMES.{FIELDS_IN_USE.get("visit_no")}
        LEFT JOIN (
            SELECT
                {FIELDS_IN_USE.get("patient_id")},
                {FIELDS_IN_USE.get("visit_no")},
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (31383, 310071, 301530) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS TRANEXAMIC_ACID,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (300167, 300168, 300725, 310033) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS AMICAR,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (800001, 59535, 400030, 5553, 23584, 73156, 23579, 23582) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS B12,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (246886, 23837, 800001, 23834, 23836, 23833, 400114, 246887, 23835, 400113, 400116, 249243, 400115, 31692) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS WARFARIN,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (69663, 69662) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS DABIGATRAN,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (73759, 73760) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS RIVAROXABAN,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (115234, 114370) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS APIXABAN,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (27762, 303033, 303037, 242578, 300268, 27770, 300540, 27763, 244432, 301561, 303038, 301135, 303043, 303036, 388042, 310021, 310088, 303035, 310150, 303042, 310067, 303039, 310090, 303040, 300482, 310089, 303045, 310066, 9375, 300276, 303136, 310070, 252811, 69442, 300580, 302570, 303099, 310076, 301558, 303086) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS HEPARIN,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (70251, 24761, 70252) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS FONDAPARINUX,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (300232, 300233, 300276, 310030, 310113) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS BIVALIRUDIN,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (250238, 59580) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS CLOPIDOGREL,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (72530, 161785) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS TICAGRELOR,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (30070, 18344, 352120, 8333, 8341, 8345, 8349) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS IRON_ORAL,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (300544, 300545, 300599, 12899, 65529) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS IRON_IV
            FROM (
                (
                    SELECT
                        {FIELDS_IN_USE.get("patient_id")},
                        {FIELDS_IN_USE.get("visit_no")},
                        {FIELDS_IN_USE.get("medication_id")},
                        {FIELDS_IN_USE.get("admin_dose")},
                        {FIELDS_IN_USE.get("dose_unit_desc")}
                    FROM {TABLES_IN_USE["intraop_meds"]}
                )
                UNION ALL
                (
                    SELECT
                        {FIELDS_IN_USE.get("patient_id")},
                        {FIELDS_IN_USE.get("visit_no")},
                        {FIELDS_IN_USE.get("medication_id")},
                        {FIELDS_IN_USE.get("admin_dose")},
                        {FIELDS_IN_USE.get("dose_unit_desc")}
                    FROM {TABLES_IN_USE["extraop_meds"]}
                ))
            GROUP BY {FIELDS_IN_USE.get("patient_id")}, {FIELDS_IN_USE.get("visit_no")}
        ) MEDS
            ON VST.{FIELDS_IN_USE.get("patient_id")} = MEDS.{FIELDS_IN_USE.get("patient_id")} AND VST.{FIELDS_IN_USE.get("visit_no")} = MEDS.{FIELDS_IN_USE.get("visit_no")}
        WHERE 1=1
            {pat_filters_safe_sql}
        """

        result = execute_sql(
            command,
            dict(zip(pat_bind_names, patient_ids))
        )

        result_list = []
        for row in result:
            result_list.append({
                "pat_id": row[0],
                "visit_no": row[1],
                "gr_than_1440_vent": row[2],
                "patient_death": row[3],
                "patient_stroke": row[4],
                "patient_ECMO": row[5],
                "tranexamic_acid": row[6],
                "AMICAR": row[7],
                "B12": row[8],
            })

        return JsonResponse(result_list, safe=False)
    else:
        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} Method Not Allowed: {request.method} patient_outcomes User: {request.user}")
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def hemoglobin(request):
    if request.method == "GET":
        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} GET: hemoglobin User: {request.user}")
        command = f"""
        WITH
        LAB_HB AS (
            SELECT
                V.{FIELDS_IN_USE.get("patient_id")},
                V.{FIELDS_IN_USE.get("visit_no")},
                V.{FIELDS_IN_USE.get("draw_dtm")},
                V.{FIELDS_IN_USE.get("result_dtm")},
                V.{FIELDS_IN_USE.get("result_code")},
                V.{FIELDS_IN_USE.get("result_value")}
            FROM
                {TABLES_IN_USE.get("visit_labs")} V
            WHERE UPPER(V.{FIELDS_IN_USE.get("result_desc")}) = "HEMOGLOBIN"
        ),
        PREOP_HB AS (
            SELECT
                X.{FIELDS_IN_USE.get("patient_id")},
                X.{FIELDS_IN_USE.get("visit_no")},
                X.{FIELDS_IN_USE.get("case_id")},
                X.{FIELDS_IN_USE.get("surgery_start_time")},
                X.{FIELDS_IN_USE.get("surgery_end_time")},
                X.DI_PREOP_DRAW_DTM,
                LH2.{FIELDS_IN_USE.get("result_value")}
            FROM (
                SELECT
                    SC.{FIELDS_IN_USE.get("patient_id")},
                    SC.{FIELDS_IN_USE.get("visit_no")},
                    SC.{FIELDS_IN_USE.get("case_id")},
                    SC.{FIELDS_IN_USE.get("surgery_start_time")},
                    SC.{FIELDS_IN_USE.get("surgery_end_time")},
                    MAX(LH.{FIELDS_IN_USE.get("draw_dtm")}) AS DI_PREOP_DRAW_DTM
                FROM
                    {TABLES_IN_USE.get("surgery_case")} SC
                INNER JOIN LAB_HB LH
                    ON SC.{FIELDS_IN_USE.get("visit_no")} = LH.{FIELDS_IN_USE.get("visit_no")}
                WHERE LH.{FIELDS_IN_USE.get("result_dtm")} < SC.{FIELDS_IN_USE.get("surgery_start_time")}
                GROUP BY
                    SC.{FIELDS_IN_USE.get("patient_id")},
                    SC.{FIELDS_IN_USE.get("visit_no")},
                    SC.{FIELDS_IN_USE.get("case_id")},
                    SC.{FIELDS_IN_USE.get("surgery_start_time")},
                    SC.{FIELDS_IN_USE.get("surgery_end_time")}
            ) X
            INNER JOIN LAB_HB LH2
                ON X.{FIELDS_IN_USE.get("visit_no")} = LH2.{FIELDS_IN_USE.get("visit_no")}
                AND X.DI_PREOP_DRAW_DTM = LH2.{FIELDS_IN_USE.get("draw_dtm")}
        ),
        POSTOP_HB AS (
            SELECT
                Z.{FIELDS_IN_USE.get("patient_id")},
                Z.{FIELDS_IN_USE.get("visit_no")},
                Z.{FIELDS_IN_USE.get("case_id")},
                Z.{FIELDS_IN_USE.get("surgery_start_time")},
                Z.{FIELDS_IN_USE.get("surgery_end_time")},
                Z.DI_POSTOP_DRAW_DTM,
                LH4.{FIELDS_IN_USE.get("result_value")}
            FROM (
                SELECT
                    SC2.{FIELDS_IN_USE.get("patient_id")},
                    SC2.{FIELDS_IN_USE.get("visit_no")},
                    SC2.{FIELDS_IN_USE.get("case_id")},
                    SC2.{FIELDS_IN_USE.get("surgery_start_time")},
                    SC2.{FIELDS_IN_USE.get("surgery_end_time")},
                    MIN(LH3.{FIELDS_IN_USE.get("draw_dtm")}) AS DI_POSTOP_DRAW_DTM
                FROM
                    {TABLES_IN_USE.get("surgery_case")} SC2
                INNER JOIN LAB_HB LH3
                    ON SC2.{FIELDS_IN_USE.get("visit_no")} = LH3.{FIELDS_IN_USE.get("visit_no")}
                WHERE LH3.{FIELDS_IN_USE.get("draw_dtm")} > SC2.{FIELDS_IN_USE.get("surgery_end_time")}
                GROUP BY
                    SC2.{FIELDS_IN_USE.get("patient_id")},
                    SC2.{FIELDS_IN_USE.get("visit_no")},
                    SC2.{FIELDS_IN_USE.get("case_id")},
                    SC2.{FIELDS_IN_USE.get("surgery_start_time")},
                    SC2.{FIELDS_IN_USE.get("surgery_end_time")}
            ) Z
            INNER JOIN LAB_HB LH4
                ON Z.{FIELDS_IN_USE.get("visit_no")} = LH4.{FIELDS_IN_USE.get("visit_no")}
                AND Z.DI_POSTOP_DRAW_DTM = LH4.{FIELDS_IN_USE.get("draw_dtm")}
        )
        SELECT
            SC3.{FIELDS_IN_USE.get("patient_id")},
            SC3.{FIELDS_IN_USE.get("case_id")},
            SC3.{FIELDS_IN_USE.get("visit_no")},
            SC3.{FIELDS_IN_USE.get("case_date")},
            EXTRACT (YEAR from SC3.{FIELDS_IN_USE.get("case_date")}) YEAR,
            EXTRACT (MONTH from SC3.{FIELDS_IN_USE.get("case_date")}) AS MONTH,
            SC3.{FIELDS_IN_USE.get("surgery_start_time")},
            SC3.{FIELDS_IN_USE.get("surgery_end_time")},
            SC3.{FIELDS_IN_USE.get("surgery_elapsed")},
            SC3.{FIELDS_IN_USE.get("surgery_type")},
            SC3.{FIELDS_IN_USE.get("surgeon_id")},
            SC3.{FIELDS_IN_USE.get("anest_id")},
            SC3.{FIELDS_IN_USE.get("prim_proc_desc")},
            SC3.{FIELDS_IN_USE.get("post_op_icu_los")},
            SC3.{FIELDS_IN_USE.get("sched_site_desc")},
            MAX(CASE
                WHEN PRE.DI_PREOP_DRAW_DTM IS NOT NULL
                THEN PRE.DI_PREOP_DRAW_DTM
            END)
            AS DI_PREOP_DRAW_DTM,
            MAX(CASE
                WHEN PRE.{FIELDS_IN_USE.get("result_value")} IS NOT NULL
                THEN PRE.{FIELDS_IN_USE.get("result_value")}
            END)
            AS PREOP_HEMO,
            MAX(CASE
                WHEN POST.DI_POSTOP_DRAW_DTM IS NOT NULL
                THEN POST.DI_POSTOP_DRAW_DTM
            END)
            AS DI_POSTOP_DRAW_DTM,
            MAX(CASE
                WHEN POST.{FIELDS_IN_USE.get("result_value")} IS NOT NULL
                THEN POST.{FIELDS_IN_USE.get("result_value")}
            END)
            AS POSTOP_HEMO
        FROM
            {TABLES_IN_USE.get("surgery_case")} SC3
        LEFT OUTER JOIN PREOP_HB PRE
            ON SC3.{FIELDS_IN_USE.get("case_id")} = PRE.{FIELDS_IN_USE.get("case_id")}
        LEFT OUTER JOIN POSTOP_HB POST
            ON SC3.{FIELDS_IN_USE.get("case_id")} = POST.{FIELDS_IN_USE.get("case_id")}
        GROUP BY SC3.{FIELDS_IN_USE.get("patient_id")},
            SC3.{FIELDS_IN_USE.get("case_id")},
            SC3.{FIELDS_IN_USE.get("visit_no")},
            SC3.{FIELDS_IN_USE.get("case_date")},
            EXTRACT (YEAR from SC3.{FIELDS_IN_USE.get("case_date")}),
            EXTRACT (MONTH from SC3.{FIELDS_IN_USE.get("case_date")}),
            SC3.{FIELDS_IN_USE.get("surgery_start_time")},
            SC3.{FIELDS_IN_USE.get("surgery_end_time")},
            SC3.{FIELDS_IN_USE.get("surgery_elapsed")},
            SC3.{FIELDS_IN_USE.get("surgery_type")},
            SC3.{FIELDS_IN_USE.get("surgeon_id")},
            SC3.{FIELDS_IN_USE.get("anest_id")},
            SC3.{FIELDS_IN_USE.get("prim_proc_desc")},
            SC3.{FIELDS_IN_USE.get("post_op_icu_los")},
            SC3.{FIELDS_IN_USE.get("sched_site_desc")}
        """

        result = execute_sql(command)

        items = [{
            "CASE_ID": row[1],
            "VISIT_ID": row[2],
            "YEAR":row[4],
            "QUARTER": str(row[4])[2:]+"/"+str(output_quarter(row[5])),
            "MONTH":str(row[4])[2:]+"/"+str(row[5]),
            "DATE":row[3],
            "HEMO": [row[-3], row[-1]],
            "SURGEON_ID": row[10],
            "ANESTHESIOLOGIST_ID":row[11],
            "SURGERY_TYPE":row[9],
            "PATIENT_ID":row[0]
            }
            for row in result
        ]

        return JsonResponse({"result": items})
    else:
        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} Method Not Allowed: {request.method} hemoglobin User: {request.user}")
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def state(request):
    if request.method == "GET":
        # Get the name from the querystring
        name = request.GET.get("name")
        user = request.user.id

        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} GET: state Params: name = {name} User: {request.user}")

        if name:
            # Get the object from the database and all related StateAccess objects
            try:
                state = State.objects.get(name=name)  # username = uid
            except State.DoesNotExist:
                return HttpResponseBadRequest("State not found", 404)
            state_access = StateAccess.objects.filter(state=state).filter(user=user)

            # Make sure that user is owner or at least reader
            if not(str(state.owner) == str(user) or state_access):
                return HttpResponseBadRequest("Not authorized", 401)

            # Return the json for the state
            return JsonResponse(model_to_dict(state))

        else:
            # Get the names of all the state objects that a user can access
            states = [o.name for o in State.objects.all().filter(owner=user)]
            state_access = [o.state.name for o in StateAccess.objects.filter(user=user)]

            response = set(states + state_access)

            # Return the names as a list
            return JsonResponse(list(response), safe=False)

    elif request.method == "POST":
        # Get the name and definition from the request
        name = request.POST.get("name")
        definition = request.POST.get("definition")
        owner = request.user.id

        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} POST: state Params: name = {name} User: {request.user}")

        if State.objects.filter(name=name).exists():
            return HttpResponseBadRequest("a state with that name already exists, try another", 400)

        if name and definition:  # owner is guaranteed by login
            # Create and save the new State object
            new_state = State(name=name, definition=definition, owner=owner)
            new_state.save()

            return HttpResponse("state object created", 200)
        else:
            return HttpResponseBadRequest("missing params: [name, definition, owner]", 400)

    elif request.method == "PUT":
        # Get the required information from the request body
        put = ast.literal_eval(request.body.decode())
        old_name = put.get("old_name")
        new_name = put.get("new_name")
        new_definition = put.get("new_definition")

        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} PUT: state Params: old_name = {old_name}, new_name = {new_name} User: {request.user}")

        states = [o.name for o in State.objects.all().filter(owner=request.user.id)]
        state_access = [o.state.name for o in StateAccess.objects.filter(user=request.user.id).filter(role="WR")]
        state_read_access = [o.state.name for o in StateAccess.objects.filter(user=request.user.id).filter(role="RE")]
        allowed_states = response = set(states + state_access)

        if old_name in state_read_access:
            return HttpResponseBadRequest("Not authorized", 401)
        elif old_name not in allowed_states:
            return HttpResponseBadRequest("State not found", 404)

        # Update the State object and save
        result = State.objects.get(name=old_name)
        result.name = new_name
        result.definition = new_definition
        result.save()

        return HttpResponse("state object updated", 200)

    elif request.method == "DELETE":
        # Get the required information from the request body
        delete = ast.literal_eval(request.body.decode())
        name = delete.get("name")

        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} DELETE: state Params: name = {name} User: {request.user}")

        # Delete the matching State object
        try:
            result = State.objects.get(name=name)  # username = uid
        except State.DoesNotExist:
            return HttpResponseBadRequest("State not found", 404)

        if str(result.owner) != str(request.user.id):
            return HttpResponseBadRequest("Requester is not owner", 401)

        StateAccess.objects.all().filter(state_id=result.id).delete()

        result.delete()

        return HttpResponse("state object deleted", 200)

    else:
        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} Method Not Allowed: {request.method} state User: {request.user}")
        return HttpResponseNotAllowed(
            ["GET", "POST", "PUT", "DELETE"],
            "Method Not Allowed"
        )


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def share_state(request):
    if request.method == "POST":
        name = request.POST.get("name")
        user = request.POST.get("user")
        role = request.POST.get("role")

        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} POST: share_state Params: name = {name}, user = {user}, role = {role} User: {request.user}")

        requesting_user = request.user.id

        try:
            state_object = State.objects.get(name=name)
        except State.DoesNotExist:
            return HttpResponseBadRequest("State not found", 404)

        try:
            user_object = User.objects.get(username=user)  # username = uid
        except User.DoesNotExist:
            return HttpResponseBadRequest("User does not exist", 400)

        # Make sure state exists, requesting users is owner, and new user is not owner, user exists
        if str(state_object.owner) != str(requesting_user):
            return HttpResponseBadRequest("Requesting user is not the owner", 400)
        if str(state_object.owner) == str(user_object.id):
            return HttpResponseBadRequest("User is already the owner of the state", 400)

        # Check that new user is not already reader/writer, role in allowed choices
        state_access_objects = StateAccess.objects.filter(state=state_object).filter(user=user)
        roles = [a.role for a in state_access_objects]
        if role in roles:
            return HttpResponseBadRequest("User already has that role on this state", 400)
        if role not in [a[1] for a in AccessLevel.choices()]:
            return HttpResponseBadRequest(f"role must be in: {[a[1] for a in AccessLevel.choices()]}", 400)

        # If all above passed, make the StateAccess object
        StateAccess.objects.create(
            state=state_object,
            user=user_object.id,
            role=role,
        )
        return HttpResponse("Added new user to role", 201)

    else:
        logging.info(f"{request.META.get("HTTP_X_FORWARDED_FOR")} Method Not Allowed: {request.method} share_state User: {request.user}")
        return HttpResponseNotAllowed(["POST"], "Method Not Allowed")
