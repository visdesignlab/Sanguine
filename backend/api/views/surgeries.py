import json
from pathlib import Path

from django.conf import settings
from django.http import HttpResponse, FileResponse, JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.cache import never_cache

from .decorators.conditional_login_required import conditional_login_required
from .utils.utils import log_request


@require_http_methods(["GET"])
def index(request):
    log_request(request)
    return HttpResponse("Intelvia API endpoint. Please use the client application to access the data here.")


@require_http_methods(["GET"])
def whoami(request):
    if request.user.is_authenticated:
        return HttpResponse(request.user.username)
    elif settings.DISABLE_LOGINS:
        return HttpResponse("Login disabled")
    else:
        return HttpResponse("Unauthorized", status=401)


# @require_http_methods(["GET"])
# @conditional_login_required
# def get_all_data(request):
#     log_request(request)
#     # start timer
#     start_time = t.time()

#     # Get all patients including the visits and jsonify it
#     visits = Visit.objects.select_related(
#         "mrn"
#     ).prefetch_related(
#         "surgerycase_set",
#         "transfusion_set",
#         "medication_set",
#         "lab_set",
#         "billingcode_set",
#     ).all()

#     list(visits)  # Force evaluation of the queryset to fetch all data

#     # Log the time taken to fetch the data
#     elapsed_time = t.time() - start_time
#     print(f"Time taken to fetch all data: {elapsed_time:.2f} seconds")

#     visits = [
#         {
#             **model_to_dict(visit),
#             "patient": model_to_dict(visit.mrn),
#             "surgeries": [
#                 {
#                     **model_to_dict(surgery_case),
#                     "surgery_start_dtm": surgery_case.surgery_start_dtm.timestamp() * 1000,
#                     "surgery_end_dtm": surgery_case.surgery_end_dtm.timestamp() * 1000,
#                     "case_date": datetime.combine(surgery_case.case_date, time.min).timestamp() * 1000,
#                     "year": surgery_case.case_date.year,
#                     "quarter": f"{str(surgery_case.case_date.year)[-2:]}-{(surgery_case.case_date.month - 1) // 3 + 1}",
#                     "transfusions": [
#                         model_to_dict(transfusion)
#                         for transfusion in visit.transfusion_set.all()
#                         if transfusion.trnsfsn_dtm <= surgery_case.surgery_end_dtm and transfusion.trnsfsn_dtm >= surgery_case.surgery_start_dtm
#                     ],
#                 }
#                 for surgery_case in visit.surgerycase_set.all()
#             ],
#             "transfusions": [
#                 model_to_dict(transfusion)
#                 for transfusion in visit.transfusion_set.all()
#             ],
#             "medications": [
#                 model_to_dict(medication)
#                 for medication in visit.medication_set.all()
#             ],
#             "labs": [
#                 model_to_dict(lab)
#                 for lab in visit.lab_set.all()
#             ],
#             "billing_codes": [
#                 model_to_dict(billing_code)
#                 for billing_code in visit.billingcode_set.all()
#             ],
#         }
#         for visit in visits]

#     # log the time taken to process the data
#     elapsed_time2 = t.time() - start_time
#     print(f"Time taken to process all data: {elapsed_time2:.2f} seconds")

#     return JsonResponse(visits, safe=False)


# @never_cache
# @require_http_methods(["GET"])
# @conditional_login_required
# def get_all_data(request):
#     log_request(request)
#     # Use a raw SQL cursor to avoid ORM overhead
#     with connection.cursor() as cursor:
#         cursor.execute("SELECT * FROM VisitAttributes")  # No joins, pure scan
#         columns = [col[0] for col in cursor.description]
#         rows = cursor.fetchall()

#     # Convert to list of dicts (fast path)
#     visits = [dict(zip(columns, row)) for row in rows]
#     return OrjsonResponse(visits, safe=False)

# @never_cache
# @require_http_methods(["GET"])
# @conditional_login_required
# def get_all_data(request):
#     log_request(request)
#     response = FileResponse(open('./api/views/all_data.json.gz', 'rb'), content_type='application/json')
#     response['Content-Encoding'] = 'gzip'
#     return response

# Get apache arrow file from ./api/views/all_data.arrow
@never_cache
@require_http_methods(["HEAD", "GET"])
@conditional_login_required
def get_visit_attributes(request):
    log_request(request)
    file_path = Path(settings.BASE_DIR) / "parquet_cache" / "visit_attributes.parquet"
    if not file_path.exists():
        return HttpResponse("Parquet file not found. Please generate it first.", status=404)
    return FileResponse(open(file_path, 'rb'), content_type='application/vnd.apache.arrow.file')


@never_cache
@require_http_methods(["GET"])
@conditional_login_required
def get_procedure_hierarchy(request):
    log_request(request)
    file_path = Path(settings.BASE_DIR) / "parquet_cache" / "procedure_hierarchy.json"
    if not file_path.exists():
        return HttpResponse(
            "Procedure hierarchy cache not found.",
            status=404,
        )

    try:
        with file_path.open("r", encoding="utf-8") as cache_file:
            return JsonResponse(json.load(cache_file))
    except Exception as exc:
        return HttpResponse(
            f"Procedure hierarchy cache could not be read. Error: {exc}",
            status=503,
        )
