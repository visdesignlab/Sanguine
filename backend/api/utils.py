import csv
import cx_Oracle
import json
import os

from datetime import datetime


# Makes and returns the database connection object
def make_connection():
    # Load credentials
    with open("credential.json") as credential:
        credential_data = json.load(credential)
        usr_name = credential_data["usr_name"]
        password = credential_data["password"]

    # Generate the connection
    dsn_tns = cx_Oracle.makedsn(
        os.getenv("ORACLE_HOST"),
        os.getenv("ORACLE_PORT"),
        service_name=os.getenv("ORACLE_SERVICE_NAME"),
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


def cpt():
    # Instantiate mapping array
    cpt = []

    # Read in the cpt codes
    with open("cpt_codes_cleaned.csv", "r") as file:
        read_csv = csv.reader(file, delimiter=",")
        next(read_csv, None)
        for row in read_csv:
            cpt.append(tuple(row))

    return cpt


# Execute a command against the database
# *args passes through positional args
# **kwargs passes through keyword arguments
def execute_sql(command, *args, **kwargs):
    connection = make_connection()
    cur = connection.cursor()
    return cur.execute(command, *args, **kwargs)


# Returns all values from raw results for a specified agg var
def get_all_by_agg(result_dict, agg, variable):
    return [
        y for y in
        list(map(lambda x: x[variable] if x["aggregated_by"] == agg else None, result_dict))
        if y is not None
    ]


def get_bind_names(filters):
    if not isinstance(filters, list):
        raise TypeError("get_bind_names was not passed a list")
    return [f":filters{str(i)}" for i in range(len(filters))]


def get_all_cpt_code_filters():
    filters = [a[0] for a in cpt()]
    bind_names = get_bind_names(filters)
    filters_safe_sql = f"WHERE CODE IN ({','.join(bind_names)}) "

    return filters, bind_names, filters_safe_sql


def get_sum_proc_code_filters(procedure_names, blng_code_field):
    all_cpt = cpt()
    sum_code_statements = []

    for index, proc_name in enumerate(procedure_names): 
        # For only queries, we need to generate 2 queries so we can check for codes not in desired
        if "Only" in proc_name:
            filters = [a[0] for a in all_cpt if a[2] == proc_name.replace("Only ","")]
            complement_filters = [a[0] for a in all_cpt if a[2] != proc_name.replace("Only ","")]
            joined_filters = "','".join(filters)
            joined_complement_filters = "','".join(complement_filters)
            sum_code_statements.append(f"SUM(CASE WHEN {blng_code_field} IN ('{joined_filters}') THEN 1 ELSE 0 END) AS \"{index}\"")
            sum_code_statements.append(f"SUM(CASE WHEN {blng_code_field} IN ('{joined_complement_filters}') THEN 1 ELSE 0 END) AS \"{index}-only\"")
        else:
            filters = [a[0] for a in all_cpt if a[2] == proc_name]
            joined_filters = "','".join(filters)
            sum_code_statements.append(f"SUM(CASE WHEN {blng_code_field} IN ('{joined_filters}') THEN 1 ELSE 0 END) AS \"{index}\"")

    return sum_code_statements


def and_statement_handle_only(and_combo_singular, procedure_names):
    if "Only" in and_combo_singular:
        and_statement = f"\"{procedure_names.index(and_combo_singular)}\" > 0 AND \"{procedure_names.index(and_combo_singular)}-only\" = 0"
    else:
        and_statement = f"\"{procedure_names.index(and_combo_singular)}\" > 0"

    return and_statement


def get_and_statements(and_combinations_list, procedure_names):
    and_statements = []

    for index, and_combo in enumerate(and_combinations_list): 
        if len(and_combo) > 1:
            and_statement = f"({and_statement_handle_only(and_combo[0], procedure_names)} AND {and_statement_handle_only(and_combo[1], procedure_names)})" 
        else:
            and_statement = f"({and_statement_handle_only(and_combo[0], procedure_names)})"

        and_statements.append(and_statement)

    return and_statements


def output_quarter(number):
    if number > 0 and number < 4:
        return 1
    elif number > 3 and number < 7:
        return 2
    elif number > 6 and number < 10:
        return 3
    else:
        return 4


def validate_dates(date_array):
    checked_dates = [validate_one_date_string(x) for x in date_array]
    return all(checked_dates)


def validate_one_date_string(date):
    DATE_FORMAT = "%d-%b-%Y"
    try:
        datetime.strptime(date, DATE_FORMAT)
        return True
    except:
        return False
