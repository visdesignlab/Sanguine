from collections import Counter, defaultdict
from datetime import datetime, date, time
from django.http import HttpResponse, JsonResponse
from django.conf import settings
from django.views.decorators.http import require_http_methods
from django.forms.models import model_to_dict

from api.models import Visit

from .decorators.conditional_login_required import conditional_login_required
from .sql_queries import procedure_count_query
from .utils.utils import cpt, get_all_cpt_code_filters, log_request, execute_sql


@require_http_methods(["GET"])
def index(request):
    log_request(request)
    return HttpResponse("Bloodvis API endpoint. Please use the client application to access the data here.")


@require_http_methods(["GET"])
def whoami(request):
    if request.user.is_authenticated:
        return HttpResponse(request.user.username)
    elif settings.DISABLE_LOGINS:
        return HttpResponse("Login disabled")
    else:
        return HttpResponse("Unauthorized", status=401)


@require_http_methods(["GET"])
@conditional_login_required
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


import time as t
@require_http_methods(["GET"])
@conditional_login_required
def get_all_data(request):
    log_request(request)
    # start timer
    start_time = t.time()

    # Get all patients including the visits and jsonify it
    visits = Visit.objects.select_related(
        "mrn"
    ).prefetch_related(
        "surgerycase_set",
        "transfusion_set",
        "medication_set",
        "lab_set",
        "billingcode_set",
    ).all()

    list(visits)  # Force evaluation of the queryset to fetch all data

    # Log the time taken to fetch the data
    elapsed_time = t.time() - start_time
    print(f"Time taken to fetch all data: {elapsed_time:.2f} seconds")

    visits = [
        {
            **model_to_dict(visit),
            "patient": model_to_dict(visit.mrn),
            "surgeries": [
                {
                    **model_to_dict(surgery_case),
                    "surgery_start_dtm": surgery_case.surgery_start_dtm.timestamp() * 1000,
                    "surgery_end_dtm": surgery_case.surgery_end_dtm.timestamp() * 1000,
                    "case_date": datetime.combine(surgery_case.case_date, time.min).timestamp() * 1000,
                    "year": surgery_case.case_date.year,
                    "quarter": f"{str(surgery_case.case_date.year)[-2:]}-{(surgery_case.case_date.month - 1) // 3 + 1}",
                    "transfusions": [
                        model_to_dict(transfusion)
                        for transfusion in visit.transfusion_set.all()
                        if transfusion.trnsfsn_dtm <= surgery_case.surgery_end_dtm and transfusion.trnsfsn_dtm >= surgery_case.surgery_start_dtm
                    ],
                }
                for surgery_case in visit.surgerycase_set.all()
            ],
            "transfusions": [
                model_to_dict(transfusion)
                for transfusion in visit.transfusion_set.all()
            ],
            "medications": [
                model_to_dict(medication)
                for medication in visit.medication_set.all()
            ],
            "labs": [
                model_to_dict(lab)
                for lab in visit.lab_set.all()
            ],
            "billing_codes": [
                model_to_dict(billing_code)
                for billing_code in visit.billingcode_set.all()
            ],
        }
    for visit in visits]

    # log the time taken to process the data
    elapsed_time2 = t.time() - start_time
    print(f"Time taken to process all data: {elapsed_time2:.2f} seconds")

    return JsonResponse(visits, safe=False)
