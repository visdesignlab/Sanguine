import json
import cx_Oracle
import csv

from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest


# Makes and returns the database connection object
def make_connection():
    # Load credentials
    with open("credential.json") as credential:
        credential_data = json.load(credential)
        usr_name = credential_data["usr_name"]
        password = credential_data["password"]

    # Generate the connection
    dsn_tns = cx_Oracle.makedsn(
        "prodrac-scan.med.utah.edu",
        "1521",
        service_name="dwrac_som_analysts.med.utah.edu",
    )
    return cx_Oracle.connect(user=usr_name, password=password, dsn=dsn_tns)


# Read in the data dictionary
def data_dictionary():
    # Instantiate mapping array
    data_dict = {}

    with open("data_dictionary.csv", "r") as file:
        read_csv = csv.reader(file, delimiter=",")
        for row in read_csv:
            data_dict[row[0]] = row[1]

    return data_dict


def index(request):
    if request.method == "GET":
        return HttpResponse(
            "Bloodvis API endpoint. Please use the client application to access the data here."
        )


def get_attributes(request):
    if request.method == "GET":
        # Make the connection and execute the command
        connection = make_connection()
        command = "SELECT DISTINCT PRIM_PROC_DESC FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE"
        cur = connection.cursor()
        result = cur.execute(command)

        # Return the result, the multi-selector component in React requires the below format
        items = [{"key": row[0], "value": row[0],"text":row[0]} for row in result]
        return JsonResponse({"result": items})

def fetch_professional_set(request):
    if request.method == "GET":
        profesional_type = request.GET.get('professional_type')
        professional_id = request.GET.get('professional_id')
        
        if not profesional_type or not professional_id:
            HttpResponseBadRequest(
                "professional type and id must be supplied.")

        if profesional_type == "ANESTHOLOGIST_ID":
            command = (
                f"SELECT SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PRBC_UNITS) PRBC_UNITS, SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.FFP_UNITS) FFP_UNITS, "
                f"SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PLT_UNITS) PLT_UNITS, SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PLT_UNITS) PLT_UNITS, "
                f"SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.CRYO_UNITS) CRYO_UNITS, SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.CELL_SAVER_ML) CELL_SAVER_ML, "
                f"CLIN_DM.BPU_CTS_DI_SURGERY_CASE.SURGEON_PROV_DWID SURGEON_ID, CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID, CLIN_DM.BPU_CTS_DI_SURGERY_CASE.PRIM_PROC_DESC "
                f"FROM CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD "
                f"INNER JOIN CLIN_DM.BPU_CTS_DI_SURGERY_CASE "
                f"ON (CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID = CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.DI_CASE_ID) "
                f"WHERE CLIN_DM.BPU_CTS_DI_SURGERY_CASE.ANESTH_PROV_DWID = {professional_id}"
                f"GROUP BY CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID, CLIN_DM.BPU_CTS_DI_SURGERY_CASE.SURGEON_PROV_DWID,CLIN_DM.BPU_CTS_DI_SURGERY_CASE.PRIM_PROC_DESC"
            )
            partner = "SURGEON_ID"
        else:
            command = (
                f"SELECT SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PRBC_UNITS) PRBC_UNITS, SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.FFP_UNITS) FFP_UNITS, "
                f"SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PLT_UNITS) PLT_UNITS, "
                f"SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.CRYO_UNITS) CRYO_UNITS, SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.CELL_SAVER_ML) CELL_SAVER_ML, "
                f"CLIN_DM.BPU_CTS_DI_SURGERY_CASE.ANESTH_PROV_DWID ANESTHOLOGIST_ID, CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID, CLIN_DM.BPU_CTS_DI_SURGERY_CASE.PRIM_PROC_DESC "
                f"FROM CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD "
                f"INNER JOIN CLIN_DM.BPU_CTS_DI_SURGERY_CASE "
                f"ON (CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID = CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.DI_CASE_ID) "
                f"WHERE CLIN_DM.BPU_CTS_DI_SURGERY_CASE.SURGEON_PROV_DWID = {professional_id}"
                f"GROUP BY CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID, CLIN_DM.BPU_CTS_DI_SURGERY_CASE.ANESTH_PROV_DWID,CLIN_DM.BPU_CTS_DI_SURGERY_CASE.PRIM_PROC_DESC"
            )
            partner = "ANESTHOLOGIST_ID"

        connection = make_connection()
        cur = connection.cursor()
        result = cur.execute(command)
        items = [{"PRBC_UNITS": row[0] if row[0] else 0, "FFP_UNITS": row[1] if row[1] else 0, "PLT_UNITS": row[2] if row[2] else 0, "CRYO_UNITS":row[3] if row[3] else 0, "CELL_SAVER_ML":row[4] if row[4] else 0, partner: row[5], "DI_CASE_ID":row[6], "DESC":row[7]}
                 for row in result]
        return JsonResponse({"result": items})



def fetch_individual(request):
    if request.method == "GET":
        
        case_id = request.GET.get('case_id')

        if not case_id:
            HttpResponseBadRequest(
                "case_id must be supplied.")
        
        command =(
                f"SELECT info.DI_BIRTHDATE, info.GENDER_CODE, info.GENDER_DESC, "
                f"info.RACE_CODE, info.RACE_DESC, info.ETHNICITY_CODE, info.ETHNICITY_DESC, "
                f"info.DI_DEATH_DATE, surgery.DI_CASE_DATE, surgery.DI_SURGERY_START_DTM, "
                f"surgery.DI_SURGERY_END_DTM, surgery.SURGERY_ELAP, surgery.SURGERY_TYPE_DESC, "
                f"surgery.SURGEON_PROV_DWID, surgery.ANESTH_PROV_DWID, surgery.PRIM_PROC_DESC, "
                f"surgery.POSTOP_ICU_LOS "
                f"FROM CLIN_DM.BPU_CTS_DI_PATIENT info "
                f"JOIN CLIN_DM.BPU_CTS_DI_SURGERY_CASE surgery "
                f"ON info.DI_PAT_ID = surgery.DI_PAT_ID "
                f"WHERE surgery.DI_CASE_ID = {case_id}"
        )
        connection = make_connection()
        cur = connection.cursor()
        result = cur.execute(command)

        data_dict = data_dictionary()

        data = [
            dict(zip([data_dict[key[0]] for key in cur.description], row))
            for row in result
        ]
        return JsonResponse({"result": data})


def summarize_attribute_w_year(request):
    if request.method == "GET":
        x_axis = request.GET.get("x_axis")
        y_axis = request.GET.get("y_axis")
        year_range = request.GET.get("year_range").split(",")
        filter_selection = request.GET.get("filter_selection")
        print(filter_selection)
        if filter_selection is None:
            filter_selection = []
        else:
            filter_selection = (
                [] if filter_selection.split(",") == [""] else filter_selection.split(",")
            )
        print(filter_selection)


        if not x_axis or not y_axis or not year_range:
            HttpResponseBadRequest("x_axis, y_axis, and year_range must be supplied.")

        year_min = year_range[0]
        year_max = year_range[1]

        connection = make_connection()
        command_dict = {
            "YEAR": "EXTRACT (YEAR FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_DATE)",
            "SURGEON_ID": "CLIN_DM.BPU_CTS_DI_SURGERY_CASE.SURGEON_PROV_DWID",
            "ANESTHOLOGIST_ID": "CLIN_DM.BPU_CTS_DI_SURGERY_CASE.ANESTH_PROV_DWID",
            "PRBC_UNITS": "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PRBC_UNITS)",
            "FFP_UNITS": "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.FFP_UNITS)",
            "PLT_UNITS": "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PLT_UNITS)",
            "CRYO_UNITS": "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.CRYO_UNITS)",
            "CELL_SAVER_ML": "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.CELL_SAVER_ML)"
        }
        data_origin = {
            "YEAR": "CLIN_DM.BPU_CTS_DI_SURGERY_CASE",
            "PRBC_UNITS": "CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD",
            "FFP_UNITS": "CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD",
            "PLT_UNITS": "CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD",
            "CRYO_UNITS": "CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD",
            "CELL_SAVER_ML": "CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD",
            "SURGEON_ID": "CLIN_DM.BPU_CTS_DI_SURGERY_CASE",
            "ANESTHOLOGIST_ID": "CLIN_DM.BPU_CTS_DI_SURGERY_CASE",
        }
        dict_for_exchange = {
            "YEAR": "EXTRACT (YEAR FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_DATE)",
            "SURGEON_ID": "SURGEON_PROV_DWID",
            "ANESTHOLOGIST_ID": "ANESTH_PROV_DWID",
            "PRBC_UNITS": "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PRBC_UNITS)",
            "FFP_UNITS": "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.FFP_UNITS)",
            "PLT_UNITS": "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PLT_UNITS)",
            "CRYO_UNITS": "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.CRYO_UNITS)",
            "CELL_SAVER_ML": "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.CELL_SAVER_ML)"
        }

        extra_command = ""
        if len(filter_selection) > 0:
            extra_command = " AND ("
            for filter_string in filter_selection[:-1]:
                extra_command += (
                    f" CLIN_DM.BPU_CTS_DI_SURGERY_CASE.PRIM_PROC_DESC='{filter_string}' OR"
                )
            filter_string = filter_selection[-1]
            extra_command += (
                f" CLIN_DM.BPU_CTS_DI_SURGERY_CASE.PRIM_PROC_DESC='{filter_string}')"
            )

        command = (
            f"SELECT {command_dict[x_axis]}, {command_dict[y_axis]}, "
            f"COUNT(DISTINCT {data_origin[x_axis]}.DI_CASE_ID) AS CASES_COUNT "
            f"FROM {data_origin[x_axis]} "
            f"INNER JOIN {data_origin[y_axis]} "
            f"ON ({data_origin[x_axis]}.DI_CASE_ID = {data_origin[y_axis]}.DI_CASE_ID "
            f"{extra_command}) "
            f"WHERE {data_origin[x_axis]}.DI_CASE_DATE BETWEEN "
            f"'01-JAN-{year_min}' AND '31-DEC-{year_max}' "
            f"GROUP BY {command_dict[x_axis]}"
        )

        cur = connection.cursor()
        result = cur.execute(command)
        data_exchange = {
            dict_for_exchange[x_axis].replace(" ", ""): "x_axis",
            dict_for_exchange[y_axis].replace(" ", ""): "y_axis",
            "CASES_COUNT": "case_count",
        }

        data = [
            dict(zip([data_exchange[key[0]] for key in cur.description], row))
            for row in result
        ]
        return JsonResponse({"result": data})


def request_individual_specific(request):
    if request.method == "GET":
        case_id = request.GET.get("case_id")
        attribute_to_retrieve = request.GET.get("attribute")
        if not case_id or attribute_to_retrieve:
            HttpResponseBadRequest("case_id and attribute must be supplied")
        connection = make_connection()
        command_dict = {
            "YEAR": "EXTRACT (YEAR FROM DI_CASE_DATE)",
            "SURGEON_ID": "SURGEON_PROV_DWID",
            "ANESTHOLOGIST_ID": "ANESTH_PROV_DWID"
        }
        command = (
            f"SELECT {command_dict[attribute_to_retrieve]} "
            f"FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE "
            f"WHERE DI_CASE_ID = {case_id}"
        )
        print(command)
        cur = connection.cursor()
        result = cur.execute(command)
        items = [{"result":row[0]} for row in result]
        return JsonResponse({"result": items})
            


def request_transfused_units(request):
    if request.method == "GET":
        transfusion_type = request.GET.get("transfusion_type")
        year_range = request.GET.get("year_range").split(",")
        filter_selection = request.GET.get("filter_selection")
        year_min = year_range[0]
        year_max = year_range[1]
        if filter_selection is None:
            filter_selection = []
        else:
            filter_selection = (
                [] if filter_selection.split(",") == [""] else filter_selection.split(",")
            )

        if not transfusion_type or not year_range:
            HttpResponseBadRequest("transfusion_type, and year_range must be supplied.")

        extra_command = ""
        if len(filter_selection) > 0:
            extra_command = " AND ("
            for filter_string in filter_selection[:-1]:
                extra_command += (
                    f" CLIN_DM.BPU_CTS_DI_SURGERY_CASE.PRIM_PROC_DESC='{filter_string}' OR"
                )
            filter_string = filter_selection[-1]
            extra_command += (
                f" CLIN_DM.BPU_CTS_DI_SURGERY_CASE.PRIM_PROC_DESC='{filter_string}')"
            )

        command_dict = {
            "PRBC_UNITS": "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PRBC_UNITS)",
            "FFP_UNITS": "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.FFP_UNITS)",
            "PLT_UNITS": "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PLT_UNITS)",
            "CRYO_UNITS": "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.CRYO_UNITS)",
            "CELL_SAVER_ML": "SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.CELL_SAVER_ML)"
        }

        command = (
            f"SELECT transfused, di_case_id, YEAR, SURGEON_ID, ANESTHOLOGIST_ID FROM ( "
            f"SELECT {command_dict[transfusion_type]} transfused, CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID di_case_id, "
            f"EXTRACT (YEAR FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_DATE) YEAR, CLIN_DM.BPU_CTS_DI_SURGERY_CASE.SURGEON_PROV_DWID SURGEON_ID, "
            f"CLIN_DM.BPU_CTS_DI_SURGERY_CASE.ANESTH_PROV_DWID ANESTHOLOGIST_ID "
            f"FROM CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD "
            f"INNER JOIN CLIN_DM.BPU_CTS_DI_SURGERY_CASE "
            f"ON (CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID = CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.DI_CASE_ID "
            f"{extra_command}) "
            f"WHERE CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.DI_CASE_DATE BETWEEN "
            f"'01-JAN-{year_min}' AND '31-DEC-{year_max}' "
            f"GROUP BY CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_ID, EXTRACT (YEAR FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_DATE), CLIN_DM.BPU_CTS_DI_SURGERY_CASE.SURGEON_PROV_DWID, "
            f"CLIN_DM.BPU_CTS_DI_SURGERY_CASE.ANESTH_PROV_DWID "
            f") WHERE transfused>0"
        )
        
        connection = make_connection()
        cur = connection.cursor()
        result = cur.execute(command)
        
        items = [{"case_id": row[1], "transfused": row[0]}
                 for row in result]
        return JsonResponse({"result": items})

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
        connection = make_connection()
        cur = connection.cursor()
        result = cur.execute(command)

        items = [{"case_id":row[1],
                "visit_id": row[2],
                "year":row[4],
                "hemo": [row[-3], row[-1]],
                "surgeon_id": row[9],
                "anesth_id":row[10],
                "patient_id":row[0]} for row in result]

        return JsonResponse({"result": items})
