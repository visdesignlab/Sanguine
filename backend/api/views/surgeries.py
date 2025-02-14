from collections import Counter, defaultdict
from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest
from django.views.decorators.http import require_http_methods
from django_cas_ng.decorators import login_required

from .decorators.conditional_login_required import conditional_login_required
from .sql_queries import procedure_count_query, patient_query, surgery_query, surgery_case_query
from .utils.utils import cpt, get_all_cpt_code_filters, log_request, execute_sql, execute_sql_dict


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
@conditional_login_required(login_required)
def get_procedure_counts(request):
    log_request(request)

    filters, bind_names, _ = get_all_cpt_code_filters()

    command = procedure_count_query

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
@conditional_login_required(login_required)
def fetch_surgery(request):
    log_request(request)

    # Get the values from the request
    case_id = request.GET.get("case_id")

    if not case_id:
        return HttpResponseBadRequest("case_id must be supplied.")

    command = surgery_query

    cpts = cpt()
    data = execute_sql_dict(command=command, id=case_id)
    for row in data:
        row["cpt"] = list(set([cpt[2] for cpt in cpts if cpt[1] in row["CODES"]]))
        del row["CODES"]

    return JsonResponse({"result": data})


@require_http_methods(["GET"])
@conditional_login_required(login_required)
def fetch_patient(request):
    log_request(request)

    # Get the values from the request
    patient_id = request.GET.get("patient_id")

    if not patient_id:
        return HttpResponseBadRequest("patient_id must be supplied.")

    command = patient_query

    data = execute_sql_dict(command=command, id=patient_id)

    return JsonResponse({"result": data})


@require_http_methods(["GET"])
@conditional_login_required(login_required)
def get_sanguine_surgery_cases(request):
    log_request(request)

    filters, bind_names, _ = get_all_cpt_code_filters()

    # Get the data from the database
    command = surgery_case_query

    result = execute_sql_dict(command, **dict(zip(bind_names, filters)))

    return JsonResponse({"result": result})
