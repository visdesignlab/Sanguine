import ast
import os

from collections import Counter
from django.http import (
    HttpResponse,
    JsonResponse,
    HttpResponseBadRequest,
    HttpResponseNotAllowed
)
from django.forms.models import model_to_dict
from django_cas_ng.decorators import login_required

from api.decorators import conditional_login_required
from api.models import State
from api.utils import (
    data_dictionary,
    cpt,
    execute_sql,
    get_all_by_agg,
    get_filters,
    output_quarter,
    validate_dates
)


DE_IDENT_FIELDS = {
    "anest_id": "ANESTH_PROV_DWID",
    "birth_date": "DI_BIRTHDATE",
    "case_date": "DI_CASE_DATE",
    "case_id": "DI_CASE_ID",
    "death_date": "DI_DEATH_DATE",
    "patient_id": "DI_PAT_ID",
    "procedure_dtm": "DI_PROC_DTM",
    "surgeon_id": "SURGEON_PROV_DWID",
    "surgery_end_time": "DI_SURGERY_END_DTM",
    "surgery_start_time": "DI_SURGERY_START_DTM",
    "visit_no": "DI_VISIT_NO",
}

IDENT_FIELDS = {

}

DE_IDENT_TABLES = {
    "billing_codes": "CLIN_DM.BPU_CTS_DI_BILL_CODES_092920",
    "intra_op_trnsfsd": "CLIN_DM.BPU_CTS_DI_INTRP_TRNSF_092920",
    "extra_op_trnsfsd": "CLIN_DM.BPU_CTS_DI_EXTRP_TRNSF_092920",
    "patient": "CLIN_DM.BPU_CTS_DI_PATIENT_092920",
    "surgery_case": "CLIN_DM.BPU_CTS_DI_SURGERY_CASE_092920",
    "visit": "CLIN_DM.BPU_CTS_DI_VISIT_092920",
    "visit_labs": "CLIN_DM.BPU_CTS_DI_VST_LABS_092920",
    "extraop_meds": "CLIN_DM.BPU_CTS_DI_EXTRAOP_MEDS_092920",
    "intraop_meds": "CLIN_DM.BPU_CTS_DI_INTRAOP_MEDS_092920",
    "extraop_vitals": "CLIN_DM.BPU_CTS_DI_EXTRAOP_VTLS_092920",
    "preop_labs": "CLIN_DM.BPU_CTS_DI_PREOP_LABS_092920",
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


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def get_attributes(request):
    if request.method == "GET":
        # Get the list of allowed filter_selection names from the cpt function
        allowed_names = list(set([a[2] for a in cpt()]))

        filters, bind_names, filters_safe_sql = get_filters(allowed_names)

        # Make the connection and execute the command
        # ,CASE WHEN PRIM_PROC_DESC LIKE '%REDO%' THEN 1 ELSE 0 END AS REDO
        command = f"""
            SELECT
                CODE,
                DI_CASE_ID
            FROM (
                SELECT
                    BLNG.*, SURG.*
                FROM {TABLES_IN_USE.get('billing_codes')} BLNG
                INNER JOIN {TABLES_IN_USE.get('surgery_case')} SURG
                    ON (BLNG.{FIELDS_IN_USE.get('patient_id')} = SURG.{FIELDS_IN_USE.get('patient_id')})
                    AND (BLNG.{FIELDS_IN_USE.get('visit_no')} = SURG.{FIELDS_IN_USE.get('visit_no')})
                    AND (BLNG.{FIELDS_IN_USE.get('procedure_dtm')} = SURG.{FIELDS_IN_USE.get('case_date')})
                {filters_safe_sql}
            )
        """

        result = execute_sql(
            command,
            dict(zip(bind_names, filters))
        )

        # Return the result, the multi-selector component
        # in React requires the below format
        items = [
            {
                "procedure": [x[2] for x in cpt() if x[0] == str(row[0])][0],
                "id": row[1]
            } for row in result
        ]
        # Remove duplicated dicts (stops the double counting)
        items = [dict(t) for t in {tuple(d.items()) for d in items}]

        # Count the number of occurrences of each type of procedure
        items = dict(Counter(i["procedure"] for i in items))
        items = [{"value": k, "count": v} for k, v in items.items()]
        return JsonResponse({"result": items})
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def fetch_surgery(request):
    if request.method == "GET":
        # Get the values from the request
        case_id = request.GET.get('case_id')

        if not case_id:
            return HttpResponseBadRequest("case_id must be supplied.")

        command = f"""
        SELECT
            SURG.{FIELDS_IN_USE.get('case_date')},
            SURG.{FIELDS_IN_USE.get('surgery_start_time')},
            SURG.{FIELDS_IN_USE.get('surgery_end_time')},
            SURG.SURGERY_ELAP,
            SURG.SURGERY_TYPE_DESC,
            SURG.PRIM_PROC_DESC,
            SURG.POSTOP_ICU_LOS
        FROM
            {TABLES_IN_USE.get('surgery_case')} SURG
        WHERE SURG.{FIELDS_IN_USE.get('case_id')} = :id
        """

        result = execute_sql(command, id=case_id)
        data_dict = data_dictionary()
        data = [
            dict(zip([data_dict[key[0]] for key in result.description], row))
            for row in result
        ]

        return JsonResponse({"result": data})
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def fetch_patient(request):
    if request.method == "GET":
        # Get the values from the request
        patient_id = request.GET.get('patient_id')

        if not patient_id:
            return HttpResponseBadRequest("patient_id must be supplied.")

        command = f"""
        SELECT
            PATIENT.{FIELDS_IN_USE.get('birth_date')},
            PATIENT.GENDER_CODE,
            PATIENT.GENDER_DESC,
            PATIENT.RACE_CODE,
            PATIENT.RACE_DESC,
            PATIENT.ETHNICITY_CODE,
            PATIENT.ETHNICITY_DESC,
            PATIENT.{FIELDS_IN_USE.get('death_date')}
        FROM
            {TABLES_IN_USE.get('patient')} PATIENT
        WHERE PATIENT.{FIELDS_IN_USE.get('patient_id')} = :id
        """

        result = execute_sql(command, id=patient_id)
        data_dict = data_dictionary()
        data = [
            dict(zip([data_dict[key[0]] for key in result.description], row))
            for row in result
        ]

        return JsonResponse({"result": data})
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def request_transfused_units(request):
    if request.method == "GET":
        # Get the required parameters from the query string
        transfusion_type = request.GET.get("transfusion_type")
        date_range = request.GET.get("date_range") or ""

        # Get the optional parameters from the query string
        aggregated_by = request.GET.get("aggregated_by")
        patient_ids = request.GET.get("patient_ids") or ""
        case_ids = request.GET.get("case_ids") or ""
        filter_selection = request.GET.get("filter_selection") or ""

        # Parse the date_range and the filter selection
        patient_ids = patient_ids.split(",") if patient_ids else []
        case_ids = case_ids.split(",") if case_ids else []
        date_range = [s for s in date_range.split(",")]
        filter_selection = filter_selection.split(",")

        # Check the required parameters are there
        if not (transfusion_type):
            return HttpResponseBadRequest("transfusion_type must be supplied.")

        # Validate the dates
        if not (validate_dates(date_range) and len(date_range) == 2):
            return HttpResponseBadRequest("date_range is improperly formatted. It must look like: 09-JAN-2019,31-DEC-2020")

        # Coerce that params into a useable format
        min_time = date_range[0]
        max_time = date_range[1]

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
        having_options = {
            "PRBC_UNITS": "HAVING SUM(PRBC_UNITS) < 200 OR SUM(PRBC_UNITS) IS NULL",
            "FFP_UNITS": "HAVING SUM(FFP_UNITS) < 200 OR SUM(FFP_UNITS) IS NULL",
            "PLT_UNITS": "HAVING SUM(PLT_UNITS) < 30 OR SUM(PLT_UNITS) IS NULL",
            "CRYO_UNITS": "HAVING SUM(CRYO_UNITS) < 100 OR SUM(CRYO_UNITS) IS NULL",
            "CELL_SAVER_ML": "HAVING SUM(CELL_SAVER_ML) < 15000 OR SUM(CELL_SAVER_ML) IS NULL",
            "ALL_UNITS": (
                """
                HAVING
                    (SUM(PRBC_UNITS) < 200 OR SUM(PRBC_UNITS) IS NULL) AND
                    (SUM(FFP_UNITS) < 200 OR SUM(FFP_UNITS) IS NULL) AND
                    (SUM(PLT_UNITS) < 30 OR SUM(PLT_UNITS) IS NULL) AND
                    (SUM(CRYO_UNITS) < 100 OR SUM(CRYO_UNITS) IS NULL) AND
                    (SUM(CELL_SAVER_ML) < 15000 OR SUM(CELL_SAVER_ML) IS NULL)
                """
            ),
        }

        # Check that the params are valid
        if transfusion_type not in blood_products:
            return HttpResponseBadRequest(f"transfusion_type must be one of the following: {blood_products}")

        if aggregated_by and (aggregated_by not in aggregates.keys()):
            return HttpResponseBadRequest(f"If you use aggregated_by, it must be one of the following: {list(aggregates.keys())}")

        if aggregated_by and transfusion_type == "ALL_UNITS":
            return HttpResponseBadRequest("Requesting ALL_UNITS with an aggregation is unsupported, please query each unit type individually.")

        # Update the transfusion type to something more sql
        # friendly if "ALL_UNITS"
        having_sql = having_options.get(transfusion_type)
        transfusion_type = "PRBC_UNITS,FFP_UNITS,PLT_UNITS,CRYO_UNITS,CELL_SAVER_ML" if transfusion_type == "ALL_UNITS" else transfusion_type

        # Update the transfusion type to SUM(var) and add make a group by
        # if we are aggregating
        if transfusion_type != "PRBC_UNITS,FFP_UNITS,PLT_UNITS,CRYO_UNITS,CELL_SAVER_ML":
            transfusion_type = f"SUM({transfusion_type}), {aggregates[aggregated_by]}" if aggregated_by else f"SUM({transfusion_type})"
        else:
            transfusion_type = (
                f"SUM(PRBC_UNITS),SUM(FFP_UNITS),SUM(PLT_UNITS),SUM(CRYO_UNITS),SUM(CELL_SAVER_ML),{aggregates[aggregated_by]}"
                if aggregated_by
                else "SUM(PRBC_UNITS),SUM(FFP_UNITS),SUM(PLT_UNITS),SUM(CRYO_UNITS),SUM(CELL_SAVER_ML)"
            )

        group_by = (
            f"GROUP BY LIMITED_SURG.SURGEON_PROV_DWID, LIMITED_SURG.ANESTH_PROV_DWID, LIMITED_SURG.DI_PAT_ID, LIMITED_SURG.DI_CASE_ID, {aggregates[aggregated_by]}"
            if aggregated_by
            else "GROUP BY LIMITED_SURG.SURGEON_PROV_DWID, LIMITED_SURG.ANESTH_PROV_DWID, LIMITED_SURG.DI_PAT_ID, LIMITED_SURG.DI_CASE_ID"
        )

        # Generate the CPT filter sql
        filters, bind_names, filters_safe_sql = get_filters(filter_selection)

        # Generate the patient filters
        pat_bind_names = [f":pat_id{str(i)}" for i in range(len(patient_ids))]
        pat_filters_safe_sql = (
            f"AND TRNSFSD.DI_PAT_ID IN ({','.join(pat_bind_names)}) "
            if patient_ids != []
            else ""
        )

        # Generate case id filters
        case_bind_names = [f":case_id{str(i)}" for i in range(len(case_ids))]
        case_filters_safe_sql = (
            f"AND TRNSFSD.DI_CASE_ID IN ({','.join(case_bind_names)}) "
            if case_ids != []
            else ""
        )

        # Build the sql query
        # Safe to use format strings since there are limited options for
        # aggregated_by and transfusion_type
        command = f"""
        SELECT
            LIMITED_SURG.SURGEON_PROV_DWID,
            LIMITED_SURG.ANESTH_PROV_DWID,
            LIMITED_SURG.DI_PAT_ID,
            LIMITED_SURG.DI_CASE_ID,
            {transfusion_type}
        FROM {TABLES_IN_USE.get('intra_op_trnsfsd')} TRNSFSD
        RIGHT JOIN (
            SELECT *
            FROM {TABLES_IN_USE.get('surgery_case')}
            WHERE DI_CASE_ID IN (
                SELECT DI_CASE_ID
                FROM {TABLES_IN_USE.get('billing_codes')} BLNG
                INNER JOIN {TABLES_IN_USE.get('surgery_case')} SURG
                    ON (BLNG.DI_PAT_ID = SURG.DI_PAT_ID) AND (BLNG.DI_VISIT_NO = SURG.DI_VISIT_NO) AND (BLNG.DI_PROC_DTM = SURG.DI_CASE_DATE)
                {filters_safe_sql}
            )
        ) LIMITED_SURG
            ON LIMITED_SURG.DI_CASE_ID = TRNSFSD.DI_CASE_ID
        WHERE LIMITED_SURG.DI_CASE_DATE BETWEEN :min_time AND :max_time
        {pat_filters_safe_sql} {case_filters_safe_sql}
        {group_by}
        {having_sql}
        """

        # Execute the query
        result = execute_sql(
            command,
            dict(
                zip(bind_names + pat_bind_names + case_bind_names,
                    filters + patient_ids + case_ids),
                min_time=min_time,
                max_time=max_time
            )
        )

        # Get the raw data from the server
        result_dict = []
        for row in result:
            result_dict.append({
                "surgeon_id": row[0],
                "anest_id": row[1],
                "pat_id": row[2],
                "case_id": row[3],
                "transfused_units": (row[4:9]) if ("PRBC_UNITS" in transfusion_type and "FFP_UNITS" in transfusion_type) else (row[4] or 0),
                # aggregated_by and ALL_UNITS never happen together
                "aggregated_by": None if not aggregated_by else row[5]
            })

        # Manipulate the data into the right format
        if aggregated_by:
            aggregated_bys = list(
                set(map(lambda x: x["aggregated_by"], result_dict)))
            cleaned = [
                {
                    "aggregated_by": agg,
                    "transfused_units": get_all_by_agg(result_dict, agg, "transfused_units"),
                    "case_id": list(set(get_all_by_agg(result_dict, agg, "case_id"))),
                    "pat_id": list(set(get_all_by_agg(result_dict, agg, "pat_id"))),
                } for agg in aggregated_bys]
        else:
            cleaned = result_dict

        return JsonResponse(cleaned, safe=False)
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def test_results(request):
    if request.method == "GET":
        case_ids = request.GET.get("case_ids") or ""
        test_types = request.GET.get("test_types") or ""

        if not case_ids:
            HttpResponseBadRequest("You must supply case_ids")

        case_ids = case_ids.split(",")
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def risk_score(request):
    if request.method == "GET":
        patient_ids = request.GET.get("patient_ids") or ""

        # Parse the ids
        patient_ids = patient_ids.split(",") if patient_ids else []

        if patient_ids:
            # Generate the patient filters
            pat_bind_names = [
                f":pat_id{str(i)}" for i in range(len(patient_ids))]
            pat_filters_safe_sql = f"AND DI_PAT_ID IN ({','.join(pat_bind_names)}) " if patient_ids != [
            ] else ""
        else:
            pat_bind_names = []
            pat_filters_safe_sql = ""

        # Defined the sql command
        command = f"""
        SELECT
            DI_PAT_ID,
            DI_VISIT_NO,
            APR_DRG_WEIGHT,
            APR_DRG_CODE,
            APR_DRG_DESC,
            APR_DRG_ROM,
            APR_DRG_SOI
        FROM
            {TABLES_IN_USE.get('visit')}
        WHERE 1=1
            {pat_filters_safe_sql}
        """

        result = execute_sql(
            command,
            dict(zip(pat_bind_names, patient_ids))
        )

        result_list = []
        for row in result:
            result_list.append({
                "pat_id": row[0],
                "visit_no": row[1],
                "apr_drg_weight": row[2],
                "apr_drg_code": row[3],
                "apr_drg_desc": row[4],
                "apr_drg_rom": row[5],
                "apr_drg_soi": row[6],
            })

        return JsonResponse(result_list, safe=False)
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def patient_outcomes(request):
    if request.method == "GET":
        patient_ids = request.GET.get("patient_ids") or ""

        # Parse the ids
        patient_ids = patient_ids.split(",") if patient_ids else []

        if patient_ids:
            # Generate the patient filters
            pat_bind_names = [
                f":pat_id{str(i)}" for i in range(len(patient_ids))
            ]
            pat_filters_safe_sql = (
                f"AND VST.DI_PAT_ID IN ({','.join(pat_bind_names)}) "
                if patient_ids != [] 
                else ""
            )
        else:
            pat_bind_names = []
            pat_filters_safe_sql = ""

        # Define the sql command
        command = f"""
        SELECT
            VST.{FIELDS_IN_USE['patient_id']},
            VST.{FIELDS_IN_USE['visit_no']},
            CASE WHEN TOTAL_VENT_MINS > 1440 THEN 1 ELSE 0 END AS VENT_1440,
            CASE WHEN PAT_EXPIRED = 'Y' THEN 1 ELSE 0 END AS PAT_DEATH,
            BLNG_OUTCOMES.STROKE,
            BLNG_OUTCOMES.ECMO,
            MEDS.TRANEXAMIC_ACID,
            MEDS.AMICAR,
            MEDS.B12,
            MEDS.WARFARIN,
            MEDS.DABIGATRAN,
            MEDS.RIVAROXABAN,
            MEDS.APIXABAN,
            MEDS.HEPARIN,
            MEDS.FONDAPARINUX,
            MEDS.BIVALIRUDIN,
            MEDS.CLOPIDOGREL,
            MEDS.TICAGRELOR,
            MEDS.IRON_ORAL,
            MEDS.IRON_IV,
            CASE
                WHEN MEDS.WARFARIN = 1
                OR MEDS.DABIGATRAN = 1
                OR MEDS.RIVAROXABAN = 1
                OR MEDS.APIXABAN = 1
                OR MEDS.HEPARIN = 1
                OR MEDS.FONDAPARINUX = 1
                OR MEDS.BIVALIRUDIN = 1
            THEN 1 ELSE 0 END AS ANTICOAGULENT,
            CASE
                WHEN MEDS.CLOPIDOGREL = 1
                OR MEDS.TICAGRELOR = 1
            THEN 1 ELSE 0 END AS ANTI_PLATELET
        FROM
            {TABLES_IN_USE['visit']} VST
        LEFT JOIN (
            SELECT
                {FIELDS_IN_USE['patient_id']},
                {FIELDS_IN_USE['visit_no']},
                CASE WHEN SUM(CASE WHEN CODE IN ('I97.820', '997.02') THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS STROKE,
                CASE WHEN SUM(CASE WHEN CODE IN ('33952', '33954', '33956', '33958', '33962', '33964', '33966', '33973', '33974', '33975', '33976', '33977', '33978', '33979', '33980', '33981', '33982', '33983', '33984', '33986', '33987', '33988', '33989') THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS ECMO
            FROM {TABLES_IN_USE['billing_codes']}
            WHERE PRESENT_ON_ADM_F IS NULL
            GROUP BY {FIELDS_IN_USE['patient_id']}, {FIELDS_IN_USE['visit_no']}
        ) BLNG_OUTCOMES
            ON VST.{FIELDS_IN_USE['patient_id']} = BLNG_OUTCOMES.{FIELDS_IN_USE['patient_id']} AND VST.{FIELDS_IN_USE['visit_no']} = BLNG_OUTCOMES.{FIELDS_IN_USE['visit_no']}
        LEFT JOIN (
            SELECT
                {FIELDS_IN_USE['patient_id']},
                {FIELDS_IN_USE['visit_no']},
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (31383, 310071, 301530) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS TRANEXAMIC_ACID,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (300167, 300168, 300725, 310033) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS AMICAR,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (800001, 59535, 400030, 5553, 23584, 73156, 23579, 23582) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS B12,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (246886, 23837, 800001, 23834, 23836, 23833, 400114, 246887, 23835, 400113, 400116, 249243, 400115, 31692) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS WARFARIN,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (69663, 69662) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS DABIGATRAN,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (73759, 73760) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS RIVAROXABAN,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (115234, 114370) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS APIXABAN,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (27762, 303033, 303037, 242578, 300268, 27770, 300540, 27763, 244432, 301561, 303038, 301135, 303043, 303036, 388042, 310021, 310088, 303035, 310150, 303042, 310067, 303039, 310090, 303040, 300482, 310089, 303045, 310066, 9375, 300276, 303136, 310070, 252811, 69442, 300580, 302570, 303099, 310076, 301558, 303086) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS HEPARIN,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (70251, 24761, 70252) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS FONDAPARINUX,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (300232, 300233, 300276, 310030, 310113) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS BIVALIRUDIN,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (250238, 59580) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS CLOPIDOGREL,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (72530, 161785) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS TICAGRELOR,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (30070, 18344, 352120, 8333, 8341, 8345, 8349) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS IRON_ORAL,
                CASE WHEN SUM(CASE WHEN MEDICATION_ID IN (300544, 300545, 300599, 12899, 65529) THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS IRON_IV
            FROM (
                (
                    SELECT
                        {FIELDS_IN_USE['patient_id']},
                        {FIELDS_IN_USE['visit_no']},
                        MEDICATION_ID,
                        ADMIN_DOSE,
                        DOSE_UNIT_DESC
                    FROM {TABLES_IN_USE['intraop_meds']}
                )
                UNION ALL
                (
                    SELECT
                        {FIELDS_IN_USE['patient_id']},
                        {FIELDS_IN_USE['visit_no']},
                        MEDICATION_ID,
                        ADMIN_DOSE,
                        DOSE_UNIT_DESC
                    FROM {TABLES_IN_USE['extraop_meds']}
                ))
            GROUP BY {FIELDS_IN_USE['patient_id']}, {FIELDS_IN_USE['visit_no']}
        ) MEDS
            ON VST.{FIELDS_IN_USE['patient_id']} = MEDS.{FIELDS_IN_USE['patient_id']} AND VST.{FIELDS_IN_USE['visit_no']} = MEDS.{FIELDS_IN_USE['visit_no']}
        WHERE 1=1
            {pat_filters_safe_sql}
        """

        result = execute_sql(
            command,
            dict(zip(pat_bind_names, patient_ids))
        )

        result_list = []
        for row in result:
            result_list.append({
                "pat_id": row[0],
                "visit_no": row[1],
                "gr_than_1440_vent": row[2],
                "patient_death": row[3],
                "patient_stroke": row[4],
                "patient_ECMO": row[5],
                "tranexamic_acid": row[6],
                "AMICAR": row[7],
                "B12": row[8],
            })

        return JsonResponse(result_list, safe=False)
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def hemoglobin(request):
    if request.method == "GET":
        command = f"""
        WITH
        LAB_HB AS (
            SELECT
                V.DI_PAT_ID,
                V.DI_VISIT_NO,
                V.DI_DRAW_DTM,
                V.DI_RESULT_DTM,
                V.RESULT_CODE,
                V.RESULT_VALUE
            FROM
                {TABLES_IN_USE.get("visit_labs")} V
            WHERE UPPER(V.RESULT_DESC) = 'HEMOGLOBIN'
        ),
        PREOP_HB AS (
            SELECT
                X.DI_PAT_ID,
                X.DI_VISIT_NO,
                X.DI_CASE_ID,
                X.DI_SURGERY_START_DTM,
                X.DI_SURGERY_END_DTM,
                X.DI_PREOP_DRAW_DTM,
                LH2.RESULT_VALUE
            FROM (
                SELECT
                    SC.DI_PAT_ID,
                    SC.DI_VISIT_NO,
                    SC.DI_CASE_ID,
                    SC.DI_SURGERY_START_DTM,
                    SC.DI_SURGERY_END_DTM,
                    MAX(LH.DI_DRAW_DTM) AS DI_PREOP_DRAW_DTM
                FROM
                    {TABLES_IN_USE.get('surgery_case')} SC
                INNER JOIN LAB_HB LH
                    ON SC.DI_VISIT_NO = LH.DI_VISIT_NO
                WHERE LH.DI_RESULT_DTM < SC.DI_SURGERY_START_DTM
                GROUP BY
                    SC.DI_PAT_ID,
                    SC.DI_VISIT_NO,
                    SC.DI_CASE_ID,
                    SC.DI_SURGERY_START_DTM,
                    SC.DI_SURGERY_END_DTM
            ) X
            INNER JOIN LAB_HB LH2
                ON X.DI_VISIT_NO = LH2.DI_VISIT_NO
                AND X.DI_PREOP_DRAW_DTM = LH2.DI_DRAW_DTM  
        ),
        POSTOP_HB AS (
            SELECT
                Z.DI_PAT_ID,
                Z.DI_VISIT_NO,
                Z.DI_CASE_ID,
                Z.DI_SURGERY_START_DTM,
                Z.DI_SURGERY_END_DTM,
                Z.DI_POSTOP_DRAW_DTM,
                LH4.RESULT_VALUE
            FROM (
                SELECT
                    SC2.DI_PAT_ID,
                    SC2.DI_VISIT_NO,
                    SC2.DI_CASE_ID,
                    SC2.DI_SURGERY_START_DTM,
                    SC2.DI_SURGERY_END_DTM,
                    MIN(LH3.DI_DRAW_DTM) AS DI_POSTOP_DRAW_DTM
                FROM
                    {TABLES_IN_USE.get('surgery_case')} SC2
                INNER JOIN LAB_HB LH3
                    ON SC2.DI_VISIT_NO = LH3.DI_VISIT_NO
                WHERE LH3.DI_DRAW_DTM > SC2.DI_SURGERY_END_DTM
                GROUP BY
                    SC2.DI_PAT_ID,
                    SC2.DI_VISIT_NO,
                    SC2.DI_CASE_ID,
                    SC2.DI_SURGERY_START_DTM,
                    SC2.DI_SURGERY_END_DTM
            ) Z
            INNER JOIN LAB_HB LH4
                ON Z.DI_VISIT_NO = LH4.DI_VISIT_NO
                AND Z.DI_POSTOP_DRAW_DTM = LH4.DI_DRAW_DTM
        )
        SELECT
            SC3.DI_PAT_ID
            ,SC3.DI_CASE_ID
            ,SC3.DI_VISIT_NO
            ,SC3.DI_CASE_DATE
            ,EXTRACT (YEAR from SC3.DI_CASE_DATE) YEAR
            ,EXTRACT (MONTH from SC3.DI_CASE_DATE) AS MONTH
            ,SC3.DI_SURGERY_START_DTM
            ,SC3.DI_SURGERY_END_DTM
            ,SC3.SURGERY_ELAP
            ,SC3.SURGERY_TYPE_DESC
            ,SC3.SURGEON_PROV_DWID
            ,SC3.ANESTH_PROV_DWID
            ,SC3.PRIM_PROC_DESC
            ,SC3.POSTOP_ICU_LOS
            ,SC3.SCHED_SITE_DESC
            ,MAX(CASE
            WHEN PRE.DI_PREOP_DRAW_DTM IS NOT NULL
            THEN PRE.DI_PREOP_DRAW_DTM
            END)
            AS DI_PREOP_DRAW_DTM
            ,MAX(CASE
            WHEN PRE.RESULT_VALUE IS NOT NULL
            THEN PRE.RESULT_VALUE
            END)
            AS PREOP_HEMO
            ,MAX(CASE
            WHEN POST.DI_POSTOP_DRAW_DTM IS NOT NULL
            THEN POST.DI_POSTOP_DRAW_DTM
            END)
            AS DI_POSTOP_DRAW_DTM
            ,MAX(CASE
            WHEN POST.RESULT_VALUE IS NOT NULL
            THEN POST.RESULT_VALUE
            END)
            AS POSTOP_HEMO
        FROM
            {TABLES_IN_USE.get('surgery_case')} SC3
        LEFT OUTER JOIN PREOP_HB PRE
            ON SC3.DI_CASE_ID = PRE.DI_CASE_ID
        LEFT OUTER JOIN POSTOP_HB POST
            ON SC3.DI_CASE_ID = POST.DI_CASE_ID
        GROUP BY SC3.DI_PAT_ID
            ,SC3.DI_CASE_ID
            ,SC3.DI_VISIT_NO
            ,SC3.DI_CASE_DATE
            ,EXTRACT (YEAR from SC3.DI_CASE_DATE)
            ,EXTRACT (MONTH from SC3.DI_CASE_DATE)
            ,SC3.DI_SURGERY_START_DTM
            ,SC3.DI_SURGERY_END_DTM
            ,SC3.SURGERY_ELAP
            ,SC3.SURGERY_TYPE_DESC
            ,SC3.SURGEON_PROV_DWID
            ,SC3.ANESTH_PROV_DWID
            ,SC3.PRIM_PROC_DESC
            ,SC3.POSTOP_ICU_LOS
            ,SC3.SCHED_SITE_DESC
        """

        result = execute_sql(command)

        items = [{
            "CASE_ID": row[1],
            "VISIT_ID": row[2],
            "YEAR":row[4],
            "QUARTER": str(row[4])[2:]+"/"+str(output_quarter(row[5])),
            "MONTH":str(row[4])[2:]+"/"+str(row[5]),
            "DATE":row[3],
            "HEMO": [row[-3], row[-1]],
            "SURGEON_ID": row[10],
            "ANESTHESIOLOGIST_ID":row[11],
            "SURGERY_TYPE":row[9],
            "PATIENT_ID":row[0]
            }
            for row in result
        ]

        return JsonResponse({"result": items})
    else:
        return HttpResponseNotAllowed(["GET"], "Method Not Allowed")


@conditional_login_required(
    login_required,
    os.getenv("REQUIRE_LOGINS") == "True"
)
def state(request):
    if request.method == "GET":
        # Get the name from the querystring
        name = request.GET.get("name")

        if name:
            # Get the object from the database
            result = State.objects.get(name=name)

            # Return the json for the state
            return JsonResponse(model_to_dict(result))

        else:
            # Get the names of all the state objects
            states = State.objects.all().values_list()

            # Return the names as a list
            return JsonResponse(list(states), safe=False)

    elif request.method == "POST":
        # Get the name and definition from the request
        name = request.POST.get("name")
        definition = request.POST.get("definition")

        # Create and save the new State object
        new_state = State(name=name, definition=definition)
        new_state.save()

        return HttpResponse("state object created", 200)

    elif request.method == "PUT":
        # Get the required information from the request body
        put = ast.literal_eval(request.body.decode())
        old_name = put.get("old_name")
        new_name = put.get("new_name")
        new_definition = put.get("new_definition")

        # Update the State object and save
        result = State.objects.get(name=old_name)
        result.name = new_name
        result.definition = new_definition
        result.save()

        return HttpResponse("state object updated", 200)

    elif request.method == "DELETE":
        # Get the required information from the request body
        delete = ast.literal_eval(request.body.decode())
        name = delete.get("name")

        # Delete the matching State obejct
        result = State.objects.get(name=name)
        result.delete()

        return HttpResponse("state object deleted", 200)

    else:
        return HttpResponseNotAllowed(
            ["GET", "POST", "PUT", "DELETE"],
            "Method Not Allowed"
        )
