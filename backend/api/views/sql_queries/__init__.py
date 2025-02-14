from django.conf import settings

if settings.IS_TESTING:
    from .mariadb import procedure_count_query, patient_query, surgery_query, surgery_case_query
    all = [procedure_count_query, patient_query, surgery_query, surgery_case_query]
else:
    from .oracle import procedure_count_query, patient_query, surgery_query, surgery_case_query
    all = [procedure_count_query, patient_query, surgery_query, surgery_case_query]