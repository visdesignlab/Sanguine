import json
import cx_Oracle

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
        items = [{"label": row[0], "value": row[0]} for row in result]
        return JsonResponse({"result": items})


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
        }
        data_origin = {
            "YEAR": "CLIN_DM.BPU_CTS_DI_SURGERY_CASE",
            "PRBC_UNITS": "CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD",
            "FFP_UNITS": "CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD",
            "PLT_UNITS": "CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD",
            "CRYO_UNITS": "CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD",
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
            f"COUNT({data_origin[x_axis]}.DI_CASE_ID) AS CASES_COUNT "
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
        return JsonResponse({"task": data})


def hemoglobin(request):
    if request.method == "GET":
        command = (
            "SELECT DI_PAT_ID, DI_VISIT_NO, DI_CASE_ID, DI_CASE_DATE, DI_SURGERY_START_DTM, DI_SURGERY_END_DTM, "
            "SURGERY_ELAP, SURGERY_TYPE_DESC, SURGEON_PROV_DWID, ANESTH_PROV_DWID, PRIM_PROC_DESC, POSTOP_ICU_LOS, SCHED_SITE_DESC, "
                "( "
                "SELECT RESULT_VALUE "
                "FROM (SELECT * FROM CLIN_DM.BPU_CTS_DI_VST_LABS ORDER BY DI_DRAW_DTM DESC) "
                "WHERE DI_DRAW_DTM <= outside.DI_SURGERY_START_DTM AND "
                "DI_PAT_ID = outside.DI_PAT_ID AND "
                "RESULT_DESC = 'Hemoglobin' AND "
                "ROWNUM = 1 "
                ") \"PREOP_HEMO\", "
                "( "
                "SELECT RESULT_VALUE "
                "FROM (SELECT * FROM CLIN_DM.BPU_CTS_DI_VST_LABS ORDER BY DI_DRAW_DTM ASC) "
                "WHERE DI_DRAW_DTM >= outside.DI_SURGERY_START_DTM AND "
                "DI_PAT_ID = outside.DI_PAT_ID AND "
                "RESULT_DESC = 'Hemoglobin' AND "
                "ROWNUM = 1 "
                ") \"POSTOP_HEMO\" "
            "FROM (select * from CLIN_DM.BPU_CTS_DI_SURGERY_CASE) outside"
        )

        connection = make_connection()
        cur = connection.cursor()
        result = cur.execute(command)
        items = [{"label": row[0], "value": row[0]} for row in result]
        return JsonResponse({"result": items})
