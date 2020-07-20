import ast
import cx_Oracle
import csv
import json
import os

from collections import Counter
from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest, HttpResponseNotAllowed, QueryDict
from django.forms.models import model_to_dict
from django.contrib.auth.decorators import login_required

from api.decorators import conditional_login_required
from api.models import State
from api.utils import (
    make_connection, 
    data_dictionary, 
    cpt, 
    execute_sql, 
    get_all_by_agg, 
    get_filters, 
    output_quarter, 
    validate_dates
)


DE_IDENT_FIELDS = {
    "anest_id": "ANESTH_PROV_DWID",
    "birth_date": "DI_BIRTHDATE",
    "case_date": "DI_CASE_DATE",
    "case_id": "DI_CASE_ID",
    "death_date": "DI_DEATH_DATE",
    "patient_id": "DI_PAT_ID",
    "procedure_dtm": "DI_PROC_DTM",
    "surgeon_id": "SURGEON_PROV_DWID",
    "surgery_end_time": "DI_SURGERY_END_DTM",
    "surgery_start_time": "DI_SURGERY_START_DTM",
    "visit_no": "DI_VISIT_NO",
}

IDENT_FIELDS = {

}

DE_IDENT_TABLES = {
    "billing_codes": "CLIN_DM.BPU_CTS_DI_BILLING_CODES",
    "intra_op_trnsfsd": "CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD",
    "patient": "CLIN_DM.BPU_CTS_DI_PATIENT",
    "surgery_case": "CLIN_DM.BPU_CTS_DI_SURGERY_CASE",
    "visit": "CLIN_DM.BPU_CTS_DI_VISIT",
}

IDENT_TABLES = {

}

FIELDS_IN_USE = DE_IDENT_FIELDS
TABLES_IN_USE = DE_IDENT_TABLES


def index(request):
    if request.method == "GET":
        return HttpResponse(
            "Bloodvis API endpoint. Please use the client application to access the data here."
        )
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
def get_attributes(request):
    if request.method == "GET":
        # Get the list of allowed filter_selection names from the cpt function 
        allowed_names = list(set([a[2] for a in cpt()]))

        filters, bind_names, filters_safe_sql = get_filters(allowed_names)

        # Make the connection and execute the command
        # ,CASE WHEN PRIM_PROC_DESC LIKE '%REDO%' THEN 1 ELSE 0 END AS REDO
        command = f"""
            SELECT
                CODE,
                DI_CASE_ID
            FROM (
                SELECT
                    BLNG.*, SURG.*
                FROM {TABLES_IN_USE.get('billing_codes')} BLNG
                INNER JOIN {TABLES_IN_USE.get('surgery_case')} SURG
                    ON (BLNG.{FIELDS_IN_USE.get('patient_id')} = SURG.{FIELDS_IN_USE.get('patient_id')})
                    AND (BLNG.{FIELDS_IN_USE.get('visit_no')} = SURG.{FIELDS_IN_USE.get('visit_no')})
                    AND (BLNG.{FIELDS_IN_USE.get('procedure_dtm')} = SURG.{FIELDS_IN_USE.get('case_date')})
                {filters_safe_sql}
            )
        """

        result = execute_sql(
            command, 
            dict(zip(bind_names, filters))
        )

        # Return the result, the multi-selector component in React requires the below format
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
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")

@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
def fetch_surgery(request):
    if request.method == "GET":
        # Get the values from the request
        case_id = request.GET.get('case_id')

        if not case_id:
            return HttpResponseBadRequest("case_id must be supplied.")
        
        command = f"""
        SELECT 
            SURG.{FIELDS_IN_USE.get('case_date')},
            SURG.{FIELDS_IN_USE.get('surgery_start_time')},
            SURG.{FIELDS_IN_USE.get('surgery_end_time')},
            SURG.SURGERY_ELAP,
            SURG.SURGERY_TYPE_DESC,
            SURG.{FIELDS_IN_USE.get('surgeon_id')},
            SURG.{FIELDS_IN_USE.get('anest_id')},
            SURG.PRIM_PROC_DESC,
            SURG.POSTOP_ICU_LOS
        FROM 
            {TABLES_IN_USE.get('surgery_case')} SURG
        WHERE SURG.{FIELDS_IN_USE.get('case_id')} = :id
        """

        result = execute_sql(command, id = case_id)
        data_dict = data_dictionary()
        data = [
            dict(zip([data_dict[key[0]] for key in result.description], row))
            for row in result
        ]
        
        return JsonResponse({"result": data})
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
def fetch_patient(request):
    if request.method == "GET":
        # Get the values from the request
        patient_id = request.GET.get('patient_id')

        if not patient_id:
            return HttpResponseBadRequest("patient_id must be supplied.")
        
        command = f"""
        SELECT 
            PATIENT.{FIELDS_IN_USE.get('birth_date')},
            PATIENT.GENDER_CODE,
            PATIENT.GENDER_DESC,
            PATIENT.RACE_CODE,
            PATIENT.RACE_DESC,
            PATIENT.ETHNICITY_CODE,
            PATIENT.ETHNICITY_DESC,
            PATIENT.{FIELDS_IN_USE.get('death_date')}
        FROM 
            {TABLES_IN_USE.get('patient')} PATIENT
        WHERE PATIENT.{FIELDS_IN_USE.get('patient_id')} = :id
        """

        result = execute_sql(command, id = patient_id)
        data_dict = data_dictionary()
        data = [
            dict(zip([data_dict[key[0]] for key in result.description], row))
            for row in result
        ]
        
        return JsonResponse({"result": data})
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
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
            "YEAR": f"EXTRACT (YEAR FROM LIMITED_SURG.{FIELDS_IN_USE.get('case_date')})",
            "SURGEON_ID": f"LIMITED_SURG.{FIELDS_IN_USE.get('surgeon_id')}",
            "ANESTHESIOLOGIST_ID": f"LIMITED_SURG.{FIELDS_IN_USE.get('anest_id')}",
        }

        # Check that the params are valid
        if transfusion_type not in blood_products:
            return HttpResponseBadRequest(f"transfusion_type must be one of the following: {blood_products}")

        if aggregated_by and (aggregated_by not in aggregates.keys()):
            return HttpResponseBadRequest(f"If you use aggregated_by, it must be one of the following: {list(aggregates.keys())}")

        if aggregated_by and transfusion_type == "ALL_UNITS":
            return HttpResponseBadRequest("Requesting ALL_UNITS with an aggregation is unsupported, please query each unit type individually.")

        # Update the transfusion type to something more sql friendly if "ALL_UNITS"
        transfusion_type = "PRBC_UNITS,FFP_UNITS,PLT_UNITS,CRYO_UNITS,CELL_SAVER_ML" if transfusion_type == "ALL_UNITS" else transfusion_type

        # Update the transfusion type to SUM(var) and add make a group by if we are aggregating
        if transfusion_type != "PRBC_UNITS,FFP_UNITS,PLT_UNITS,CRYO_UNITS,CELL_SAVER_ML":
            transfusion_type = f"SUM({transfusion_type}), {aggregates[aggregated_by]}" if aggregated_by else f"SUM({transfusion_type})"
        else:
            transfusion_type = (f"SUM(PRBC_UNITS),SUM(FFP_UNITS),SUM(PLT_UNITS),SUM(CRYO_UNITS),SUM(CELL_SAVER_ML),{aggregates[aggregated_by]}" 
                if aggregated_by 
                else "SUM(PRBC_UNITS),SUM(FFP_UNITS),SUM(PLT_UNITS),SUM(CRYO_UNITS),SUM(CELL_SAVER_ML)")
            
        group_by = (f"GROUP BY LIMITED_SURG.SURGEON_PROV_DWID, LIMITED_SURG.ANESTH_PROV_DWID, LIMITED_SURG.DI_PAT_ID, LIMITED_SURG.DI_CASE_ID, {aggregates[aggregated_by]}" 
            if aggregated_by 
            else "GROUP BY LIMITED_SURG.SURGEON_PROV_DWID, LIMITED_SURG.ANESTH_PROV_DWID, LIMITED_SURG.DI_PAT_ID, LIMITED_SURG.DI_CASE_ID")

        # Generate the CPT filter sql
        filters, bind_names, filters_safe_sql = get_filters(filter_selection)

        # Generate the patient filters
        pat_bind_names = [f":pat_id{str(i)}" for i in range(len(patient_ids))]
        pat_filters_safe_sql = f"AND TRNSFSD.DI_PAT_ID IN ({','.join(pat_bind_names)}) " if patient_ids != [] else ""

        # Generate case id filters
        case_bind_names = [f":case_id{str(i)}" for i in range(len(case_ids))]
        case_filters_safe_sql = f"AND TRNSFSD.DI_CASE_ID IN ({','.join(case_bind_names)}) " if case_ids != [] else ""

        # Build the sql query
        # Safe to use format strings since there are limited options for aggregated_by and transfusion_type
        command = f"""
        SELECT 
            LIMITED_SURG.SURGEON_PROV_DWID, 
            LIMITED_SURG.ANESTH_PROV_DWID, 
            LIMITED_SURG.DI_PAT_ID, 
            LIMITED_SURG.DI_CASE_ID, 
            {transfusion_type}
        FROM CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD TRNSFSD
        RIGHT JOIN ( 
            SELECT * 
            FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE 
            WHERE DI_CASE_ID IN (
                SELECT DI_CASE_ID 
                FROM CLIN_DM.BPU_CTS_DI_BILLING_CODES BLNG 
                INNER JOIN CLIN_DM.BPU_CTS_DI_SURGERY_CASE SURG 
                    ON (BLNG.DI_PAT_ID = SURG.DI_PAT_ID) AND (BLNG.DI_VISIT_NO = SURG.DI_VISIT_NO) AND (BLNG.DI_PROC_DTM = SURG.DI_CASE_DATE) 
                {filters_safe_sql}
            )
        ) LIMITED_SURG 
            ON LIMITED_SURG.DI_CASE_ID = TRNSFSD.DI_CASE_ID
        WHERE LIMITED_SURG.DI_CASE_DATE BETWEEN :min_time AND :max_time 
        {pat_filters_safe_sql} {case_filters_safe_sql}
        {group_by}
        """

        # Execute the query
        result = execute_sql(
            command, 
            dict(
                zip(bind_names + pat_bind_names + case_bind_names, filters + patient_ids + case_ids), 
                min_time = min_time, 
                max_time = max_time
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
                "aggregated_by": None if not aggregated_by else row[5] #aggregated_by and ALL_UNITS never happen together
            })

        # Manipulate the data into the right format
        if aggregated_by:
            aggregated_bys = list(set(map(lambda x: x["aggregated_by"], result_dict)))
            cleaned = [
                {
                    "aggregated_by": agg, 
                    "transfused_units": get_all_by_agg(result_dict, agg, "transfused_units"),
                    "case_id": list(set(get_all_by_agg(result_dict, agg, "case_id"))),
                    "pat_id": list(set(get_all_by_agg(result_dict, agg, "pat_id"))),
                } for agg in aggregated_bys]
        else:
            cleaned = result_dict
        
        return JsonResponse(cleaned, safe = False)
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
def test_results(request):
    if request.method == "GET":
        case_ids = request.GET.get("case_ids") or ""
        test_types = request.GET.get("test_types") or ""

        if not case_ids:
            HttpResponseBadRequest("You must supply case_ids")

        case_ids = case_ids.split(",")
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
def risk_score(request):
    if request.method == "GET":
        patient_ids = request.GET.get("patient_ids") or ""

        # Parse the ids
        patient_ids = patient_ids.split(",") if patient_ids else []

        if patient_ids:
            # Generate the patient filters
            pat_bind_names = [f":pat_id{str(i)}" for i in range(len(patient_ids))]
            pat_filters_safe_sql = f"AND DI_PAT_ID IN ({','.join(pat_bind_names)}) " if patient_ids != [] else ""
        else:
            pat_bind_names = []
            pat_filters_safe_sql = ""

        # Defined the sql command
        command = f"""
        SELECT
            DI_PAT_ID,
            DI_VISIT_NO,
            APR_DRG_WEIGHT,
            APR_DRG_CODE,
            APR_DRG_DESC,
            APR_DRG_ROM,
            APR_DRG_SOI
        FROM
            CLIN_DM.BPU_CTS_DI_VISIT
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

        return JsonResponse(result_list, safe = False)
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
def patient_outcomes(request):
    if request.method == "GET":
        patient_ids = request.GET.get("patient_ids") or ""

        # Parse the ids
        patient_ids = patient_ids.split(",") if patient_ids else []

        if patient_ids:
            # Generate the patient filters
            pat_bind_names = [f":pat_id{str(i)}" for i in range(len(patient_ids))]
            pat_filters_safe_sql = f"AND VST.DI_PAT_ID IN ({','.join(pat_bind_names)}) " if patient_ids != [] else ""
        else:
            pat_bind_names = []
            pat_filters_safe_sql = ""
        
        # Define the sql command
        command = f"""
        SELECT
            VST.DI_PAT_ID,
            VST.DI_VISIT_NO,
            CASE WHEN TOTAL_VENT_MINS > 1440 THEN 1 ELSE 0 END AS VENT_1440,
            CASE WHEN PAT_EXPIRED = 'Y' THEN 1 ELSE 0 END AS PAT_DEATH,
            BLNG_OUTCOMES.STROKE,
            BLNG_OUTCOMES.ECMO
        FROM
            {TABLES_IN_USE['visit']} VST
        LEFT JOIN (
            SELECT 
                DI_PAT_ID,
                CASE WHEN SUM(CASE WHEN CODE IN ('I97.820', '997.02') THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS STROKE,
                CASE WHEN SUM(CASE WHEN CODE IN ('33952', '33954', '33956', '33958', '33962', '33964', '33966', '33973', '33974', '33975', '33976', '33977', '33978', '33979', '33980', '33981', '33982', '33983', '33984', '33986', '33987', '33988', '33989') THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS ECMO
            FROM {TABLES_IN_USE['billing_codes']}
            WHERE PRESENT_ON_ADM_F IS NULL
            GROUP BY DI_PAT_ID
        ) BLNG_OUTCOMES
            ON VST.DI_PAT_ID = BLNG_OUTCOMES.DI_PAT_ID
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
            })

        return JsonResponse(result_list, safe = False)
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
def hemoglobin(request):
    if request.method == "GET":
        command = """
        WITH
        LAB_HB AS (
            SELECT
                V.DI_PAT_ID,
                V.DI_VISIT_NO,
                V.DI_DRAW_DTM,
                V.DI_RESULT_DTM,
                V.RESULT_CODE,
                V.RESULT_VALUE
            FROM 
                CLIN_DM.BPU_CTS_DI_VST_LABS V
            WHERE UPPER(V.RESULT_DESC) = 'HEMOGLOBIN'
        ),
        PREOP_HB AS (
            SELECT
                X.DI_PAT_ID,
                X.DI_VISIT_NO,
                X.DI_CASE_ID,
                X.DI_SURGERY_START_DTM,
                X.DI_SURGERY_END_DTM,
                X.DI_PREOP_DRAW_DTM,
                LH2.RESULT_VALUE
            FROM (
                SELECT
                    SC.DI_PAT_ID,
                    SC.DI_VISIT_NO,
                    SC.DI_CASE_ID,
                    SC.DI_SURGERY_START_DTM,
                    SC.DI_SURGERY_END_DTM,
                    MAX(LH.DI_DRAW_DTM) AS DI_PREOP_DRAW_DTM
                FROM 
                    CLIN_DM.BPU_CTS_DI_SURGERY_CASE SC
                INNER JOIN LAB_HB LH
                    ON SC.DI_VISIT_NO = LH.DI_VISIT_NO
                WHERE LH.DI_RESULT_DTM < SC.DI_SURGERY_START_DTM
                GROUP BY 
                    SC.DI_PAT_ID,
                    SC.DI_VISIT_NO,
                    SC.DI_CASE_ID,
                    SC.DI_SURGERY_START_DTM,
                    SC.DI_SURGERY_END_DTM
            ) X
            INNER JOIN LAB_HB LH2
                ON X.DI_VISIT_NO = LH2.DI_VISIT_NO
                AND X.DI_PREOP_DRAW_DTM = LH2.DI_DRAW_DTM
        ),
        POSTOP_HB AS (
            SELECT
                Z.DI_PAT_ID,
                Z.DI_VISIT_NO,
                Z.DI_CASE_ID,
                Z.DI_SURGERY_START_DTM,
                Z.DI_SURGERY_END_DTM,
                Z.DI_POSTOP_DRAW_DTM,
                LH4.RESULT_VALUE
            FROM (
                SELECT
                    SC2.DI_PAT_ID,
                    SC2.DI_VISIT_NO,
                    SC2.DI_CASE_ID,
                    SC2.DI_SURGERY_START_DTM,
                    SC2.DI_SURGERY_END_DTM,
                    MIN(LH3.DI_DRAW_DTM) AS DI_POSTOP_DRAW_DTM
                FROM 
                    CLIN_DM.BPU_CTS_DI_SURGERY_CASE SC2
                INNER JOIN LAB_HB LH3
                    ON SC2.DI_VISIT_NO = LH3.DI_VISIT_NO
                WHERE LH3.DI_DRAW_DTM > SC2.DI_SURGERY_END_DTM
                GROUP BY 
                    SC2.DI_PAT_ID,
                    SC2.DI_VISIT_NO,
                    SC2.DI_CASE_ID,
                    SC2.DI_SURGERY_START_DTM,
                    SC2.DI_SURGERY_END_DTM
            ) Z
            INNER JOIN LAB_HB LH4
                ON Z.DI_VISIT_NO = LH4.DI_VISIT_NO
                AND Z.DI_POSTOP_DRAW_DTM = LH4.DI_DRAW_DTM
        )
        SELECT
            SC3.DI_PAT_ID,
            SC3.DI_CASE_ID,
            SC3.DI_VISIT_NO,
            SC3.DI_CASE_DATE,
            EXTRACT (YEAR from SC3.DI_CASE_DATE) YEAR,
            EXTRACT (MONTH from SC3.DI_CASE_DATE) AS MONTH,
            SC3.DI_SURGERY_START_DTM,
            SC3.DI_SURGERY_END_DTM,
            SC3.SURGERY_ELAP,
            SC3.SURGERY_TYPE_DESC,
            SC3.SURGEON_PROV_DWID,
            SC3.ANESTH_PROV_DWID,
            SC3.PRIM_PROC_DESC,
            SC3.POSTOP_ICU_LOS,
            SC3.SCHED_SITE_DESC,
            PRE.DI_PREOP_DRAW_DTM,
            PRE.RESULT_VALUE AS PREOP_HEMO,
            POST.DI_POSTOP_DRAW_DTM,
            POST.RESULT_VALUE AS POSTOP_HEMO
        FROM 
            CLIN_DM.BPU_CTS_DI_SURGERY_CASE SC3
        LEFT OUTER JOIN PREOP_HB PRE
            ON SC3.DI_CASE_ID = PRE.DI_CASE_ID
        LEFT OUTER JOIN POSTOP_HB POST
            ON SC3.DI_CASE_ID = POST.DI_CASE_ID       
        """

        result = execute_sql(command)
        items = [{"CASE_ID":row[1],
                "VISIT_ID": row[2],
                "YEAR":row[4],
                "QUARTER": str(row[4])[2:]+"/"+str(output_quarter(row[5])),
                "MONTH":str(row[4])[2:]+"/"+str(row[5]),
                "DATE":row[3],
                "HEMO": [row[-3], row[-1]],
                "SURGEON_ID": row[10],
                "ANESTHOLOGIST_ID":row[11],
                "PATIENT_ID":row[0]} for row in result]

        return JsonResponse({"result": items})
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(login_required, os.getenv("REQUIRE_LOGINS") == "True")
def state(request):
    if request.method == "GET":
        # Get the name from the querystring
        name = request.GET.get("name")

        if name:
            # Get the object from the database
            result = State.objects.get(name = name)

            # Return the json for the state
            return JsonResponse(model_to_dict(result))

        else:
            # Get the names of all the state objects
            states = State.objects.all().values_list()

            # Return the names as a list
            return JsonResponse(list(states), safe = False)
    
    elif request.method == "POST":
        # Get the name and definition from the request
        name = request.POST.get("name")
        definition = request.POST.get("definition")

        # Create and save the new State object
        new_state = State(name = name, definition = definition)
        new_state.save()

        return HttpResponse("state object created", 200)

    elif request.method == "PUT":
        # Get the required information from the request body
        put = ast.literal_eval(request.body.decode())
        old_name = put.get("old_name")
        new_name = put.get("new_name")
        new_definition = put.get("new_definition")

        # Update the State object and save
        result = State.objects.get(name = old_name)
        result.name = new_name
        result.definition = new_definition
        result.save()

        return HttpResponse("state object updated", 200)

    elif request.method == "DELETE":
        # Get the required information from the request body
        delete = ast.literal_eval(request.body.decode())
        name = delete.get("name")

        # Delete the matching State obejct
        result = State.objects.get(name = name)
        result.delete()

        return HttpResponse("state object deleted", 200)

    else: 
        return HttpResponseNotAllowed(["GET", "POST", "PUT", "DELETE"], "Method Not Allowed")
