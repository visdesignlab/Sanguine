import json
import cx_Oracle
import csv

from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest, HttpResponseNotAllowed
from api.utils import make_connection, data_dictionary, cpt, execute_sql, get_all_by_agg, get_filters


DE_IDENT_FIELDS = {
    "patient_id": "DI_PAT_ID",
    "visit_no": "DI_VISIT_NO",
    "case_date": "DI_CASE_DATE",
    "procedure_dtm": "DI_PROC_DTM",
    "surgeon_id": "SURGEON_PROV_DWID",
    "anest_id": "ANESTH_PROV_DWID",
}

IDENT_FIELDS = {

}

DE_IDENT_TABLES = {
    "billing_codes": "CLIN_DM.BPU_CTS_DI_BILLING_CODES",
    "surgery_case": "CLIN_DM.BPU_CTS_DI_SURGERY_CASE",
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


def get_attributes(request):
    if request.method == "GET":
        filters, bind_names, filters_safe_sql = get_filters([""])

        # Make the connection and execute the command
        command = (
            "SELECT CODE_DESC, COUNT(*) FROM ("
                "SELECT "
                    "BLNG.*, SURG.*" # ,CASE WHEN PRIM_PROC_DESC LIKE '%REDO%' THEN 1 ELSE 0 END AS REDO "
                f"FROM {TABLES_IN_USE.get('billing_codes')} BLNG "
                f"INNER JOIN {TABLES_IN_USE.get('surgery_case')} SURG "
                    f"ON (BLNG.{FIELDS_IN_USE.get('patient_id')} = SURG.{FIELDS_IN_USE.get('patient_id')}) "
                    f"AND (BLNG.{FIELDS_IN_USE.get('visit_no')} = SURG.{FIELDS_IN_USE.get('visit_no')}) "
                    f"AND (BLNG.{FIELDS_IN_USE.get('procedure_dtm')} = SURG.{FIELDS_IN_USE.get('case_date')}) "
                f"{filters_safe_sql}"
            ") "
            "GROUP BY CODE_DESC"
        )

        result = execute_sql(
            command, 
            dict(zip(bind_names, filters))
        )

        # Return the result, the multi-selector component in React requires the below format
        items = [{"value": f"{row[0]}","count":row[1]} for row in result]
        return JsonResponse({"result": items})
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


def fetch_professional_set(request):
    if request.method == "GET":
        profesional_type = request.GET.get('professional_type')
        professional_id = request.GET.get('professional_id')
        
        if not profesional_type or not professional_id:
            return HttpResponseBadRequest("professional type and id must be supplied.")

        if profesional_type == "ANESTHESIOLOGIST_ID":
            command = (
                "SELECT SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PRBC_UNITS) PRBC_UNITS, SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.FFP_UNITS) FFP_UNITS, "
                "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PLT_UNITS) PLT_UNITS, SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PLT_UNITS) PLT_UNITS, "
                "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.CRYO_UNITS) CRYO_UNITS, SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.CELL_SAVER_ML) CELL_SAVER_ML, "
                "CLIN_DM.BPU_CTS_DI_SURGERY_CASE.SURGEON_PROV_DWID SURGEON_ID, CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID, CLIN_DM.BPU_CTS_DI_SURGERY_CASE.PRIM_PROC_DESC "
                "FROM CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD "
                "INNER JOIN CLIN_DM.BPU_CTS_DI_SURGERY_CASE "
                "ON (CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID = CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.DI_CASE_ID) "
                "WHERE CLIN_DM.BPU_CTS_DI_SURGERY_CASE.ANESTH_PROV_DWID = :id"
                "GROUP BY CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID, CLIN_DM.BPU_CTS_DI_SURGERY_CASE.SURGEON_PROV_DWID,CLIN_DM.BPU_CTS_DI_SURGERY_CASE.PRIM_PROC_DESC"
            )
            partner = "SURGEON_ID"
        else:
            command = (
                "SELECT SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PRBC_UNITS) PRBC_UNITS, SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.FFP_UNITS) FFP_UNITS, "
                "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PLT_UNITS) PLT_UNITS, "
                "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.CRYO_UNITS) CRYO_UNITS, SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.CELL_SAVER_ML) CELL_SAVER_ML, "
                "CLIN_DM.BPU_CTS_DI_SURGERY_CASE.ANESTH_PROV_DWID ANESTHESIOLOGIST_ID, CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID, CLIN_DM.BPU_CTS_DI_SURGERY_CASE.PRIM_PROC_DESC "
                "FROM CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD "
                "INNER JOIN CLIN_DM.BPU_CTS_DI_SURGERY_CASE "
                "ON (CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID = CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.DI_CASE_ID) "
                "WHERE CLIN_DM.BPU_CTS_DI_SURGERY_CASE.SURGEON_PROV_DWID = :id"
                "GROUP BY CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID, CLIN_DM.BPU_CTS_DI_SURGERY_CASE.ANESTH_PROV_DWID,CLIN_DM.BPU_CTS_DI_SURGERY_CASE.PRIM_PROC_DESC"
            )
            partner = "ANESTHESIOLOGIST_ID"

        result = execute_sql(command, id = profesional_id)
        items = [{"PRBC_UNITS": row[0] if row[0] else 0, "FFP_UNITS": row[1] if row[1] else 0, "PLT_UNITS": row[2] if row[2] else 0, "CRYO_UNITS":row[3] if row[3] else 0, "CELL_SAVER_ML":row[4] if row[4] else 0, partner: row[5], "DI_CASE_ID":row[6], "DESC":row[7]}
                 for row in result]
        return JsonResponse({"result": items})
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


def fetch_surgery(request):
    if request.method == "GET":
        # Get the values from the request
        case_id = request.GET.get('case_id')

        if not case_id:
            return HttpResponseBadRequest("case_id must be supplied.")
        
        command = (
                "SELECT surgery.DI_CASE_DATE, surgery.DI_SURGERY_START_DTM, "
                "surgery.DI_SURGERY_END_DTM, surgery.SURGERY_ELAP, surgery.SURGERY_TYPE_DESC, "
                "surgery.SURGEON_PROV_DWID, surgery.ANESTH_PROV_DWID, surgery.PRIM_PROC_DESC, "
                "surgery.POSTOP_ICU_LOS "
                "FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE surgery "
                "WHERE surgery.DI_CASE_ID = :id"
        )

        result = execute_sql(command, id = case_id)
        data_dict = data_dictionary()
        data = [
            dict(zip([data_dict[key[0]] for key in result.description], row))
            for row in result
        ]
        
        return JsonResponse({"result": data})
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


def fetch_patient(request):
    if request.method == "GET":
        # Get the values from the request
        patient_id = request.GET.get('patient_id')

        if not patient_id:
            return HttpResponseBadRequest("patient_id must be supplied.")
        
        command = (
                "SELECT info.DI_BIRTHDATE, info.GENDER_CODE, info.GENDER_DESC, "
                "info.RACE_CODE, info.RACE_DESC, info.ETHNICITY_CODE, info.ETHNICITY_DESC, "
                "info.DI_DEATH_DATE "
                "FROM CLIN_DM.BPU_CTS_DI_PATIENT info "
                "WHERE info.DI_PAT_ID = :id"
        )

        result = execute_sql(command, id = patient_id)
        data_dict = data_dictionary()
        data = [
            dict(zip([data_dict[key[0]] for key in result.description], row))
            for row in result
        ]
        
        return JsonResponse({"result": data})
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


def request_transfused_units(request):
    if request.method == "GET":
        # Get the parameters from the query string
        aggregated_by = request.GET.get("aggregated_by")
        transfusion_type = request.GET.get("transfusion_type")
        patient_ids = request.GET.get("patient_id") or ""
        year_range = request.GET.get("year_range") or ""
        filter_selection = request.GET.get("filter_selection") or ""

        # Parse the year_range and the filter selection
        patient_ids = patient_ids.split(",") if patient_ids else []
        year_range = [s for s in year_range.split(",") if s.isdigit()]
        filter_selection = filter_selection.split(",")

        # Check the required parameters are there
        if not (transfusion_type and len(year_range) == 2):
            return HttpResponseBadRequest("transfusion_type and year_range must be supplied.")

        # Coerce that params into a useable format
        min_time = f'01-JAN-{year_range[0]}'
        max_time = f'31-DEC-{year_range[1]}'

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
        transfusion_type = f"SUM({transfusion_type}), {aggregates[aggregated_by]}" if aggregated_by else transfusion_type
        group_by = f"GROUP BY TRNSFSD.DI_PAT_ID, TRNSFSD.DI_CASE_ID, {aggregates[aggregated_by]}" if aggregated_by else ""

        # Generate the CPT filter sql
        filters, bind_names, filters_safe_sql = get_filters(filter_selection)

        # Generate the patient filters
        pat_bind_names = [f":pat_id{str(i)}" for i in range(len(patient_ids))]
        pat_filters_safe_sql = f"AND TRNSFSD.DI_PAT_ID IN ({','.join(pat_bind_names)}) " if patient_ids != [] else ""

        # Build the sql query
        # Safe to use format strings since there are limited options for aggregated_by and transfusion_type
        command = (
            f"SELECT TRNSFSD.DI_PAT_ID, TRNSFSD.DI_CASE_ID, {transfusion_type} "
            "FROM CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD TRNSFSD "
            "INNER JOIN ( "
                "SELECT * "
                "FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE "
                "WHERE DI_CASE_ID IN ("
                    "SELECT DI_CASE_ID "
                    "FROM CLIN_DM.BPU_CTS_DI_BILLING_CODES BLNG "
                    "INNER JOIN CLIN_DM.BPU_CTS_DI_SURGERY_CASE SURG "
                        "ON (BLNG.DI_PAT_ID = SURG.DI_PAT_ID) AND (BLNG.DI_VISIT_NO = SURG.DI_VISIT_NO) AND (BLNG.DI_PROC_DTM = SURG.DI_CASE_DATE) "
                    f"{filters_safe_sql}"
                ")"
            ") LIMITED_SURG ON LIMITED_SURG.DI_CASE_ID = TRNSFSD.DI_CASE_ID "
            f"WHERE TRNSFSD.DI_CASE_DATE BETWEEN :min_time AND :max_time "
            f"{pat_filters_safe_sql} "
            f"{group_by}"
        )

        # Execute the query
        result = execute_sql(
            command, 
            dict(zip(bind_names + pat_bind_names, filters + patient_ids), min_time = min_time, max_time = max_time)
        )

        # Get the raw data from the server
        result_dict = []
        for row in result:
            result_dict.append({
                "pat_id": row[0],
                "case_id": row[1],
                "transfused_units": row[2] if transfusion_type in blood_products else (row[2:7]),
                "aggregated_by": None if not aggregated_by else row[3] #aggregated_by and ALL_UNITS never happen together
            })

        # Manipulate the data into the right format
        if aggregated_by:
            aggregated_bys = list(set(map(lambda x: x["aggregated_by"], result_dict)))
            cleaned = [
                {
                    "aggregated_by": agg, 
                    "transfused_units": get_all_by_agg(result_dict, agg, "transfused_units"),
                    "case_id": list(set(get_all_by_agg(result_dict, agg, "case_id")))
                } for agg in aggregated_bys]
        else:
            cleaned = result_dict
        
        return JsonResponse(cleaned, safe = False)
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


def request_individual_specific(request):
    if request.method == "GET":
        # Get request parameters
        case_id = request.GET.get("case_id")
        attribute_to_retrieve = request.GET.get("attribute")
        
        # Check we have the require attributes
        if not case_id or attribute_to_retrieve:
            return HttpResponseBadRequest("case_id and attribute must be supplied")
        
        # Define the command dict
        command_dict = {
            "YEAR": "EXTRACT (YEAR FROM DI_CASE_DATE)",
            "SURGEON_ID": "SURGEON_PROV_DWID",
            "ANESTHESIOLOGIST_ID": "ANESTH_PROV_DWID"
        }

        # Verify that the attribute_to_retrieve is in the command dict keys
        if not attribute_to_retrieve in command_dict.keys():
            return HttpResponseBadRequest("case_id and attribute must be supplied")

        # Define the command, safe to use format string since the command dict has safe values
        command = (
            f"SELECT {command_dict[attribute_to_retrieve]} "
            "FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE "
            "WHERE DI_CASE_ID = :id"
        )

        # Execute the command and return the results
        result = execute_sql(command, id = case_id)
        items = [{"result":row[0]} for row in result]
        return JsonResponse({"result": items})
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


def to_be_removed(request):
        # Define the full SQL statement
        command = (
            f"SELECT {outer_select}, di_case_id, YEAR, SURGEON_ID, ANESTHESIOLOGIST_ID FROM ( "
            f"SELECT {command_dict[transfusion_type]}, CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID di_case_id, "
            f"EXTRACT (YEAR FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_DATE) YEAR, CLIN_DM.BPU_CTS_DI_SURGERY_CASE.SURGEON_PROV_DWID SURGEON_ID, "
            f"CLIN_DM.BPU_CTS_DI_SURGERY_CASE.ANESTH_PROV_DWID ANESTHESIOLOGIST_ID "
            f"FROM CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD "
            f"INNER JOIN CLIN_DM.BPU_CTS_DI_SURGERY_CASE "
            f"ON (CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID = CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.DI_CASE_ID "
            f"{extra_command}) "
            f"WHERE CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.DI_CASE_DATE BETWEEN :min_time AND :max_time "
            f"{pat_id_filter} "
            f"GROUP BY CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID, EXTRACT (YEAR FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_DATE), CLIN_DM.BPU_CTS_DI_SURGERY_CASE.SURGEON_PROV_DWID, "
            f"CLIN_DM.BPU_CTS_DI_SURGERY_CASE.ANESTH_PROV_DWID "
            f") {limit}"
        )

        # Manipulate the data into the right format
        # aggregated_bys = list(set(map(lambda x: x["aggregated_by"], result_dict)))
        # cleaned = [
        #     {
        #         "aggregated_by": agg, 
        #         "valueToVisualize": get_all_by_agg(result_dict, agg, "valueToVisualize"),
        #         "caseID": list(set(get_all_by_agg(result_dict, agg, "caseID")))
        #     } for agg in aggregated_bys]
        
        # return JsonResponse(cleaned, safe = False)

        if transfusion_type == "ALL_UNITS":
            items = [{"case_id": row[5], "PRBC_UNITS": row[0], "FFP_UNITS": row[1], "PLT_UNITS": row[2], "CRYO_UNITS": row[3], "CELL_SAVER_ML": row[4]}
                 for row in result]
        else:
            items = [{"case_id": row[1], "transfused": row[0]}
                 for row in result]
        return JsonResponse({"result": items})


def test_results(request):
    if request.method == "GET":
        case_ids = request.GET.get("case_ids") or ""
        test_types = request.GET.get("test_types") or ""

        if not case_ids:
            HttpResponseBadRequest("You must supply case_ids")

        case_ids = case_ids.split(",")
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


def hemoglobin(request):
    if request.method == "GET":
        command = (
            "WITH "
            "LAB_HB AS "
            "( "
            "SELECT "
            "V.DI_PAT_ID "
            ",V.DI_VISIT_NO "
            ",V.DI_DRAW_DTM "
            ",V.DI_RESULT_DTM "
            ",V.RESULT_CODE "
            ",V.RESULT_VALUE "
            "FROM CLIN_DM.BPU_CTS_DI_VST_LABS V "
            "WHERE UPPER(V.RESULT_DESC) = 'HEMOGLOBIN' "
            "), "
            "PREOP_HB AS "
            "( "
            "SELECT "
            "X.DI_PAT_ID "
            ",X.DI_VISIT_NO "
            ",X.DI_CASE_ID "
            ",X.DI_SURGERY_START_DTM "
            ",X.DI_SURGERY_END_DTM "
            ",X.DI_PREOP_DRAW_DTM "
            ",LH2.RESULT_VALUE "
            "FROM "
            "( "
            "SELECT "
            "SC.DI_PAT_ID "
            ",SC.DI_VISIT_NO "
            ",SC.DI_CASE_ID "
            ",SC.DI_SURGERY_START_DTM "
            ",SC.DI_SURGERY_END_DTM "
            ",MAX(LH.DI_DRAW_DTM) AS DI_PREOP_DRAW_DTM "
            "FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE SC "
            "INNER JOIN LAB_HB LH "
            "ON SC.DI_VISIT_NO = LH.DI_VISIT_NO "
            "WHERE LH.DI_RESULT_DTM < SC.DI_SURGERY_START_DTM "
            "GROUP BY SC.DI_PAT_ID "
            ",SC.DI_VISIT_NO "
            ",SC.DI_CASE_ID "
            ",SC.DI_SURGERY_START_DTM "
            ",SC.DI_SURGERY_END_DTM "
            ") X "
            "INNER JOIN LAB_HB LH2 "
            "ON X.DI_VISIT_NO = LH2.DI_VISIT_NO "
            "AND X.DI_PREOP_DRAW_DTM = LH2.DI_DRAW_DTM "
            "), "
            "POSTOP_HB AS "
            "( "
            " SELECT "
            "Z.DI_PAT_ID "
            ",Z.DI_VISIT_NO "
            ",Z.DI_CASE_ID "
            ",Z.DI_SURGERY_START_DTM "
            ",Z.DI_SURGERY_END_DTM "
            ",Z.DI_POSTOP_DRAW_DTM "
            ",LH4.RESULT_VALUE "
            "FROM "
            "( "
            "SELECT "
            "SC2.DI_PAT_ID "
            ",SC2.DI_VISIT_NO "
            ",SC2.DI_CASE_ID "
            ",SC2.DI_SURGERY_START_DTM "
            ",SC2.DI_SURGERY_END_DTM "
            ",MIN(LH3.DI_DRAW_DTM) AS DI_POSTOP_DRAW_DTM "
            "FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE SC2 "
            "INNER JOIN LAB_HB LH3 "
            "ON SC2.DI_VISIT_NO = LH3.DI_VISIT_NO "
            "WHERE LH3.DI_DRAW_DTM > SC2.DI_SURGERY_END_DTM "
            "GROUP BY SC2.DI_PAT_ID "
            ",SC2.DI_VISIT_NO "
            ",SC2.DI_CASE_ID "
            ",SC2.DI_SURGERY_START_DTM "
            ",SC2.DI_SURGERY_END_DTM "
            ") Z "
            "INNER JOIN LAB_HB LH4 "
            "ON Z.DI_VISIT_NO = LH4.DI_VISIT_NO "
            "AND Z.DI_POSTOP_DRAW_DTM = LH4.DI_DRAW_DTM "
            ") "
            "SELECT "
            "SC3.DI_PAT_ID "
            ",SC3.DI_CASE_ID "
            ",SC3.DI_VISIT_NO "
            ",SC3.DI_CASE_DATE "
            ",EXTRACT (YEAR from SC3.DI_CASE_DATE) YEAR "
            ",SC3.DI_SURGERY_START_DTM "
            ",SC3.DI_SURGERY_END_DTM "
            ",SC3.SURGERY_ELAP "
            ",SC3.SURGERY_TYPE_DESC "
            ",SC3.SURGEON_PROV_DWID "
            ",SC3.ANESTH_PROV_DWID "
            ",SC3.PRIM_PROC_DESC "
            ",SC3.POSTOP_ICU_LOS "
            ",SC3.SCHED_SITE_DESC "
            ",PRE.DI_PREOP_DRAW_DTM "
            ",PRE.RESULT_VALUE AS PREOP_HEMO "
            ",POST.DI_POSTOP_DRAW_DTM "
            ",POST.RESULT_VALUE AS POSTOP_HEMO "
            "FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE SC3 "
            "LEFT OUTER JOIN PREOP_HB PRE "
            "ON SC3.DI_CASE_ID = PRE.DI_CASE_ID "
            "LEFT OUTER JOIN POSTOP_HB POST "
            "ON SC3.DI_CASE_ID = POST.DI_CASE_ID "      
        )

        result = execute_sql(command)
        items = [{"CASE_ID":row[1],
                "VISIT_ID": row[2],
                "YEAR":row[4],
                "HEMO": [row[-3], row[-1]],
                "SURGEON_ID": row[9],
                "ANESTHESIOLOGIST_ID":row[10],
                "PATIENT_ID":row[0]} for row in result]

        return JsonResponse({"result": items})
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")
