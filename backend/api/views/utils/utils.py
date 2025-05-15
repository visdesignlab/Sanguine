import ast
import csv
import logging
from django.db import connections

logger = logging.getLogger("api.views")


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


def get_bind_names(filters):
    if not isinstance(filters, list):
        raise TypeError("get_bind_names was not passed a list")
    return [f"filters{str(i)}" for i in range(len(filters))]


def get_all_cpt_code_filters():
    filters = [a[0] for a in cpt()]
    bind_names = get_bind_names(filters)
    filters_safe_sql = f"WHERE CODE IN (%({')s,%('.join(bind_names)})s) "

    return filters, bind_names, filters_safe_sql


def log_request(request, paramsToExclude=[]):
    params = {}

    if request.method == "GET":
        params = request.GET
    if request.method == "POST":
        params = request.POST
    if request.method == "PUT" or request.method == "DELTE":
        params = ast.literal_eval(request.body.decode())

    # Remove excluded params
    params = {k: v for k, v in params.items() if k not in paramsToExclude}

    logger.info(
        f"From: {request.META.get('HTTP_X_FORWARDED_FOR')}. Path: {request.path}. Method: {request.method}. User: {request.user}. Params: {params}"
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
