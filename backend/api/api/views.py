from django.http import HttpResponse, JsonResponse
import cx_Oracle

# Makes and returns the database connection object
def make_connection():
    # Load credentials
    with open('credential.json') as credential:
        credential_data = json.load(credential)
        usr_name = credential_data['usr_name']
        password = credential_data['password']

    # Generate the connection
    dsn_tns = cx_Oracle.makedsn('prodrac-scan.med.utah.edu', '1521',service_name = 'dwrac_som_analysts.med.utah.edu')
    return cx_Oracle.connect(user=usr_name,password=password,dsn=dsn_tns)


def index(request):
    return HttpResponse("Bloodvis API endpoint. Please use the client application to access the data here.")


def get_attributes(request):
    # Make the connection and execute the command
    connection = make_connection()
    command = "SELECT DISTINCT PRIM_PROC_DESC FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE"
    cur = connection.cursor()
    result = cur.execute(command)

    # Return the result, the multi-selector component in React requires the below format
    items = [{"label":row[0],"value":row[0]} for row in result]
    return JsonResponse({'result': items})


def summarize_attribute_w_year(request):
    x_axis = request.args.get('x_axis')
    y_axis = request.args.get('y_axis')
    year_range = request.args.get('year_range').split(",")
    filter_selection = request.args.get('filter_selection').split(",")
    filter_selection = [] if filter_selection == [""] else filter_selection
    
    
    print(x_axis, y_axis, year_range)
    
    if not x_axis or not y_axis or not year_range:
        abort(400)

    year_min = year_range[0]
    year_max = year_range[1]

    connection = make_connection()
    command_dict = {
        'YEAR': 'EXTRACT (YEAR FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_DATE)',
        'SURGEON_ID': 'CLIN_DM.BPU_CTS_DI_SURGERY_CASE.SURGEON_PROV_DWID',
        'ANESTHOLOGIST_ID': 'CLIN_DM.BPU_CTS_DI_SURGERY_CASE.ANESTH_PROV_DWID',
        'PRBC_UNITS' : 'SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PRBC_UNITS)',
        'FFP_UNITS':'SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.FFP_UNITS)',
        'PLT_UNITS':'SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PLT_UNITS)',
        'CRYO_UNITS': 'SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.CRYO_UNITS)'
    }
    data_origin = {
        'YEAR': 'CLIN_DM.BPU_CTS_DI_SURGERY_CASE', 
        'PRBC_UNITS': 'CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD',
        'FFP_UNITS': 'CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD', 
        'PLT_UNITS': 'CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD',
        'CRYO_UNITS': 'CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD', 
        'SURGEON_ID': 'CLIN_DM.BPU_CTS_DI_SURGERY_CASE',
        'ANESTHOLOGIST_ID':'CLIN_DM.BPU_CTS_DI_SURGERY_CASE'
    }
    dict_for_exchange={
        'YEAR': 'EXTRACT (YEAR FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE.DI_CASE_DATE)',
        'SURGEON_ID': 'SURGEON_PROV_DWID',
        'ANESTHOLOGIST_ID': 'ANESTH_PROV_DWID',
        'PRBC_UNITS' : 'SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PRBC_UNITS)',
        'FFP_UNITS':'SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.FFP_UNITS)',
        'PLT_UNITS':'SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.PLT_UNITS)',
        'CRYO_UNITS': 'SUM(CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD.CRYO_UNITS)'
    }

    # if data_origin[x_axis] == data_origin[y_axis]:
    #     command = 'SELECT ' + command_dict[x_axis] + ', ' + command_dict[y_axis] + ' FROM '+data_origin[x_axis] + " WHERE "+ data_origin[x_axis]+".DI_CASE_DATE BETWEEN '01-JAN-"+year_min +"' AND '"+"31-DEC-"+year_max+"' GROUP BY " + command_dict[x_axis] + ' ORDER BY ' + command_dict[x_axis]
    # else:
    extra_command = ""
    print(filter_selection)
    if len(filter_selection) > 0:
        extra_command = " AND ("
        for filter_string in filter_selection[:-1]:
            extra_command += (" CLIN_DM.BPU_CTS_DI_SURGERY_CASE.PRIM_PROC_DESC='" + filter_string + "' OR")
        filter_string = filter_selection[-1]
        extra_command +=(" CLIN_DM.BPU_CTS_DI_SURGERY_CASE.PRIM_PROC_DESC='" + filter_string + "')")

    command = 'SELECT ' + command_dict[x_axis] + ', ' + command_dict[y_axis] +', COUNT(' +data_origin[x_axis]+'.DI_VISIT_NO) AS CASES_COUNT'+ ' FROM ' + data_origin[x_axis] + ' INNER JOIN ' + data_origin[y_axis] +' ON (' + data_origin[x_axis] + '.DI_VISIT_NO = ' + data_origin[y_axis] +'.DI_VISIT_NO' + extra_command + ") WHERE "+ data_origin[x_axis]+".DI_CASE_DATE BETWEEN '01-JAN-"+year_min +"' AND '"+"31-DEC-"+year_max+"' GROUP BY " + command_dict[x_axis]
    print(command)

    cur = connection.cursor()
    result = cur.execute(command)
    data_exchange = {dict_for_exchange[x_axis].replace(" ",''):'x_axis', dict_for_exchange[y_axis].replace(" ",''):'y_axis',"CASES_COUNT":"case_count"}

    data = [dict(zip([data_exchange[key[0]] for key in cur.description], row)) for row in result]
    print(data)
    return JsonResponse({'task': data})


def hemoglobin(request):
    command = \
    "SELECT labs1.DI_VISIT_NO, labs1.RESULT_VALUE, labs1.DI_RESULT_DTM, labs1.RESULT_DESC \n"\
    "FROM CLIN_DM.BPU_CTS_DI_PREOP_LABS labs1 \n"\
    "INNER JOIN ( \n"\
    "SELECT DI_VISIT_NO, max(DI_RESULT_DTM) as MaxTime \n"\
    "FROM CLIN_DM.BPU_CTS_DI_PREOP_LABS \n"\
    "WHERE RESULT_DESC = 'Hemoglobin' \n"\
    "GROUP BY DI_VISIT_NO) labs2 \n"\
    "ON (labs2.DI_VISIT_NO = labs1.DI_VISIT_NO and labs2.MaxTime = labs1.DI_RESULT_DTM and labs1.RESULT_DESC = 'Hemoglobin') \n"\
    # ") \n"\
    # "SELECT trans_new.*, surgery.* \n"\
    # "FROM ( \n"\
    # "SELECT EXTRACT(YEAR FROM trans.DI_TRNSFSN_DTM) as year, \n"\
    # "trans.CRYO_UNITS, trans.PLT_UNITS, trans.FFP_UNITS, trans.PRBC_UNITS, trans.DI_VISIT_NO, \n"\
    # "Hemo.RESULT_VALUE as hemo_value \n"\
    # "FROM CLIN_DM.BPU_CTS_DI_INTRAOP_TRNSFSD trans \n"\
    # "INNER JOIN Hemo ON \n"\
    # "Hemo.DI_VISIT_NO = trans.DI_VISIT_NO \n"\
    # ") trans_new \n"\
    # "INNER JOIN CLIN_DM.BPU_CTS_DI_SURGERY_CASE surgery \n"\
    # "ON trans_new.DI_VISIT_NO = surgery.DI_VISIT_NO;"
    print(command)

    connection = make_connection()
    cur = connection.cursor()
    result = cur.execute(command)
    items = [{"label":row[0],"value":row[0]} for row in result]
    
    return JsonResponse({'result': items})
