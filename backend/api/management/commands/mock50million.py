import os
import csv
from collections import OrderedDict
from datetime import datetime, timedelta
from django.db import connection, transaction
from django.core.management.base import BaseCommand
from django.utils.timezone import make_aware
from faker import Faker
from faker.providers import date_time
import random
import tempfile

OUTPUT_DIR = "mock_data"
# MILLION = 10**6
MILLION = 50


class Command(BaseCommand):
    help = "Generate mock data CSV files"

    def send_csv_to_db(self, row_gen, fieldnames, table_name, batch_size=100000):
        """
        Generate a temp CSV file from row_gen and use LOAD DATA LOCAL INFILE to load it into the specified table.
        """
        self.stdout.write(f"Generating CSV for {table_name}...")
        with tempfile.NamedTemporaryFile(mode='w+', delete=False, newline='') as tmpfile:
            writer = csv.DictWriter(tmpfile, fieldnames=fieldnames, extrasaction='ignore')
            writer.writeheader()
            batch = []
            row_count = 0
            for r in row_gen:
                batch.append(r)
                row_count += 1
                if len(batch) >= batch_size:
                    writer.writerows(batch)
                    batch = []
                    if row_count % 100000 == 0:
                        self.stdout.write(f"Wrote {row_count} rows so far...")
            if batch:
                writer.writerows(batch)
                self.stdout.write(f"Wrote {row_count} rows so far...")
        tmpfile_path = tmpfile.name
        self.stdout.write(f"CSV generated at: {tmpfile_path}")

        self.stdout.write("Loading data into database...")
        # Perform the LOAD DATA LOCAL INFILE
        with connection.cursor() as cursor:
            load_sql = f"""
                LOAD DATA LOCAL INFILE '{tmpfile_path}'
                INTO TABLE {table_name}
                FIELDS TERMINATED BY ','
                ENCLOSED BY '"'
                LINES TERMINATED BY '\\n'
                IGNORE 1 LINES
                ({', '.join(fieldnames)});
            """
            # Disable autocommit for better performance
            with transaction.atomic():
                cursor.execute(load_sql)
        self.stdout.write(self.style.SUCCESS(f"Successfully loaded data into {table_name}."))

        os.remove(tmpfile_path)

    def materialize_visit_attributes(self):
        self.stdout.write("Materializing VisitAttributes...")
        with connection.cursor() as cursor:
            cursor.execute("CALL intelvia.materializeVisitAttributes()")
        self.stdout.write(self.style.SUCCESS("Successfully materialized VisitAttributes."))

    def handle(self, *args, **options):
        # Initialize the Faker object
        Faker.seed(42)
        fake = Faker()
        fake.add_provider(date_time)

        pats = []
        visits = []
        surgeries = []
        surgeons = [
            (fake.unique.random_number(digits=10), fake.name()) for _ in range(50)
        ]
        anests = [
            (fake.unique.random_number(digits=10), fake.name()) for _ in range(50)
        ]

        # Generate patients
        patient_fieldnames = [
            "mrn",
            "last_name",
            "first_name",
            "birth_date",
            "sex_code",
            "race_desc",
            "ethnicity_desc",
            "death_date",
        ]

        def gen_patients():
            # Constants for options that must be chosen together
            race_descs = [
                "Black or African American",
                "White or Caucasian",
                "American Indian and Alaska Native",
                "Hispanic/Latino/a/x-Other Hispanic/Latino/a/x",
                "Choose not to disclose",
                "Unreported/Refused to Report",
                "Native Hawaiian and Other Pacific Islander",
                "Asian",
            ]
            eth_descs = [
                "Hispanic/Latino",
                "Choose not to disclose",
                "Unknown/Information Not Available",
                "Not Hispanic/Latino",
            ]
            for _ in range(int(0.5 * MILLION)):
                race_idx = random.randint(0, 7)
                eth_idx = random.randint(0, 3)
                birthdate = fake.date_time_between(
                    start_date=datetime(1950, 1, 1),
                    end_date=datetime(1960, 1, 1),
                )
                death_date = make_aware(
                    fake.date_time_between(
                        start_date=datetime(2024, 11, 1),
                        end_date=datetime(2025, 5, 1),
                    )
                )
                death_date = (
                    death_date if fake.random_element(elements=(True, False)) else None
                )
                # bad_pat = fake.random_element(elements=(True, True, False)) if death_date is not None else fake.random_element(False, False, True)
                bad_pat = fake.random_element(elements=OrderedDict([(True, 0.7), (False, 0.3)]))

                patient = {
                    "mrn": fake.unique.random_number(digits=10),
                    "last_name": fake.last_name(),
                    "first_name": fake.first_name(),
                    "birth_date": birthdate,
                    "sex_code": fake.random_element(elements=("F", "M", "NB", "U", "X")),
                    "race_desc": race_descs[race_idx],
                    "ethnicity_desc": eth_descs[eth_idx],
                    "death_date": death_date,
                }
                pats.append((patient, bad_pat))
                yield patient
        self.send_csv_to_db(gen_patients(), fieldnames=patient_fieldnames, table_name="Patient")

        # Generate visits
        visit_fieldnames = [
            "visit_no",
            "mrn",
            "epic_pat_id",
            "hsp_account_id",
            "adm_dtm",
            "dsch_dtm",
            "clinical_los",
            "age_at_adm",
            "pat_class_desc",
            "pat_expired_f",
            "invasive_vent_f",
            "total_vent_mins",
            "total_vent_days",
            "apr_drg_code",
            "apr_drg_rom",
            "apr_drg_soi",
            "apr_drg_desc",
            "apr_drg_weight",
            "ms_drg_weight",
            "cci_mi",
            "cci_chf",
            "cci_pvd",
            "cci_cvd",
            "cci_dementia",
            "cci_copd",
            "cci_rheum_dz",
            "cci_pud",
            "cci_liver_dz_mild",
            "cci_dm_wo_compl",
            "cci_dm_w_compl",
            "cci_paraplegia",
            "cci_renal_dz",
            "cci_malign_wo_mets",
            "cci_liver_dz_severe",
            "cci_malign_w_mets",
            "cci_hiv_aids",
            "cci_score",
        ]

        def gen_visits():
            visit_no = 0
            for pat, bad_pat in pats:
                num_visits = 5 if bad_pat else 1
                for _ in range(num_visits):
                    year = fake.random_int(min=2020, max=2024)
                    admit_date = make_aware(
                        fake.date_time_between(
                            start_date=datetime(year, 1, 1),
                            end_date=datetime(year + 1, 1, 1).date()
                        )
                    )
                    discharge_date = admit_date + timedelta(days=fake.random_int(min=5, max=10))
                    clinical_los = (
                        discharge_date.date() - admit_date.date()
                    ).days
                    age_at_adm = (admit_date.date() - pat["birth_date"].date()).days // 365
                    cci = {
                        "cci_mi": fake.random_int(min=0, max=1),
                        "cci_chf": fake.random_int(min=0, max=1),
                        "cci_pvd": fake.random_int(min=0, max=1),
                        "cci_cvd": fake.random_int(min=0, max=1),
                        "cci_dementia": fake.random_int(min=0, max=1),
                        "cci_copd": fake.random_int(min=0, max=1),
                        "cci_rheum_dz": fake.random_int(min=0, max=1),
                        "cci_pud": fake.random_int(min=0, max=1),
                        "cci_liver_dz_mild": fake.random_int(min=0, max=1),
                        "cci_dm_wo_compl": fake.random_int(min=0, max=1),
                        "cci_dm_w_compl": fake.random_int(min=0, max=2),
                        "cci_paraplegia": fake.random_int(min=0, max=2),
                        "cci_renal_dz": fake.random_int(min=0, max=2),
                        "cci_malign_wo_mets": fake.random_int(min=0, max=2),
                        "cci_liver_dz_severe": fake.random_int(min=0, max=3),
                        "cci_malign_w_mets": fake.random_int(min=0, max=6),
                        "cci_hiv_aids": fake.random_int(min=0, max=6),
                    }
                    vent = fake.random_element(elements=(True, True, False)) if bad_pat else fake.random_element(elements=(True, False, False, False, False))
                    vent_mins = fake.random_int(min=30, max=10000) if vent else 0
                    vent_days = max(1, vent_mins // 1440) if vent else 0 
                    
                    visit = {
                        "visit_no": visit_no,
                        "mrn": pat["mrn"],
                        "epic_pat_id": fake.unique.random_number(digits=10),
                        "hsp_account_id": fake.unique.random_number(digits=10),
                        "adm_dtm": admit_date.strftime("%Y-%m-%d %H:%M:%S"),
                        "dsch_dtm": discharge_date.strftime("%Y-%m-%d %H:%M:%S"),
                        "clinical_los": clinical_los,
                        "age_at_adm": age_at_adm,
                        "pat_class_desc": "Inpatient",
                        "pat_expired_f": fake.random_element(elements=tuple(["Y"] + [None] * 9)),
                        "invasive_vent_f": "Y" if vent else None,
                        "total_vent_mins": vent_mins,
                        "total_vent_days": vent_days,
                        "apr_drg_code": fake.random_element(elements=("001", "002", "003")),
                        "apr_drg_rom": fake.random_element(elements=(1, 2, 3, 4, None)),
                        "apr_drg_soi": fake.random_element(elements=(1, 2, 3, 4, None)),
                        "apr_drg_desc": fake.sentence(),
                        "apr_drg_weight": str(fake.random_int(1, 999)).zfill(3),
                        "ms_drg_weight": str(fake.random_int(1, 999)).zfill(3),
                        "cci": cci,
                        "cci_score": sum(cci.values()),
                    }
                    visits.append((pat, bad_pat, visit))
                    visit_no += 1
                    yield visit
        self.send_csv_to_db(gen_visits(), fieldnames=visit_fieldnames, table_name="Visit")

        # Generate surgery case
        surgery_case_fieldnames = [
            "case_id",
            "visit_no",
            "mrn",
            "case_date",
            "surgery_start_dtm",
            "surgery_end_dtm",
            "surgery_elap",
            "surgery_type_desc",
            "surgeon_prov_id",
            "surgeon_prov_name",
            "anesth_prov_id",
            "anesth_prov_name",
            "prim_proc_desc",
            "postop_icu_los",
            "sched_site_desc",
            "asa_code",
        ]

        def gen_surgery_cases():
            for i in range(int(0.4 * MILLION)):
                yield {
                    "case_id": i,
                    "visit_no": (i % int(1 * MILLION)),
                    "mrn": f"MRN{(i % int(0.5 * MILLION)):07d}",
                    "case_date": "2020-01-02",
                    "surgery_start_dtm": "2020-01-02 08:00:00",
                    "surgery_end_dtm": "2020-01-02 10:00:00",
                    "surgery_elap": 120.0,
                    "surgery_type_desc": "Appendectomy",
                    "surgeon_prov_id": f"SURG{i:05d}",
                    "surgeon_prov_name": f"Dr. Surgeon{i}",
                    "anesth_prov_id": f"ANES{i:05d}",
                    "anesth_prov_name": f"Dr. Anesth{i}",
                    "prim_proc_desc": "Laparoscopic Appendectomy",
                    "postop_icu_los": 1.0 if i % 5 == 0 else None,
                    "sched_site_desc": "Main OR",
                    "asa_code": "II",
                }
        self.send_csv_to_db(gen_surgery_cases(), fieldnames=surgery_case_fieldnames, table_name="SurgeryCase")

        # Generate billing codes
        billing_code_fieldnames = [
            "visit_no",
            "cpt_code",
            "cpt_code_desc",
            "proc_dtm",
            "prov_id",
            "prov_name",
            "code_rank",
        ]

        def gen_billing_codes():
            for i in range(int(10 * MILLION)):
                yield {
                    "visit_no": (i % int(1 * MILLION)),
                    "cpt_code": f"{10000 + (i % 5000)}",
                    "cpt_code_desc": "Sample CPT Description",
                    "proc_dtm": "2020-01-02 09:00:00",
                    "prov_id": f"PROV{i:05d}",
                    "prov_name": f"Dr. Provider{i}",
                    "code_rank": float(i % 10 + 1),
                }
        self.send_csv_to_db(gen_billing_codes(), fieldnames=billing_code_fieldnames, table_name="BillingCode")

        # Generate Medications
        medication_fieldnames = [
            "visit_no",
            "order_med_id",
            "order_dtm",
            "medication_id",
            "medication_name",
            "med_admin_line",
            "admin_dtm",
            "admin_dose",
            "med_form",
            "admin_route_desc",
            "dose_unit_desc",
            "med_start_dtm",
            "med_end_dtm",
        ]

        def gen_medications():
            for i in range(int(15 * MILLION)):
                yield {
                    "visit_no": (i % int(1 * MILLION)),
                    "order_med_id": i,
                    "order_dtm": "2020-01-02 10:00:00",
                    "medication_id": 2000 + (i % 1000),
                    "medication_name": f"Med{i % 1000}",
                    "med_admin_line": i,
                    "admin_dtm": "2020-01-02 12:00:00",
                    "admin_dose": f"{50 + (i % 50)} mg",
                    "med_form": "Tablet",
                    "admin_route_desc": "Oral",
                    "dose_unit_desc": "mg",
                    "med_start_dtm": "2020-01-02 10:00:00",
                    "med_end_dtm": "2020-01-05 10:00:00",
                }
        self.send_csv_to_db(gen_medications(), fieldnames=medication_fieldnames, table_name="Medication")

        # Generate Labs
        lab_fieldnames = [
            "visit_no",
            "mrn",
            "lab_id",
            "lab_draw_dtm",
            "lab_panel_desc",
            "lab_panel_code",
            "result_dtm",
            "result_code",
            "result_loinc",
            "result_desc",
            "result_value",
            "uom_code",
            "lower_limit",
            "upper_limit",
        ]

        def gen_labs():
            for i in range(int(8 * MILLION)):
                yield {
                    "visit_no": (i % int(1 * MILLION)),
                    "mrn": f"MRN{(i % int(0.5 * MILLION)):07d}",
                    "lab_id": i,
                    "lab_draw_dtm": "2020-01-03 07:00:00",
                    "lab_panel_code": f"LABP{100 + (i % 10)}",
                    "lab_panel_desc": f"Panel Desc {i % 10}",
                    "result_dtm": "2020-01-03 09:00:00",
                    "result_code": f"RESC{200 + (i % 20)}",
                    "result_loinc": f"LOINC{300 + (i % 30)}",
                    "result_desc": f"Result Desc {i % 20}",
                    "result_value": round(100.0 + (i % 50) * 0.1, 4),
                    "uom_code": "mg/dL",
                    "lower_limit": 90.0,
                    "upper_limit": 110.0,
                }
        self.send_csv_to_db(gen_labs(), fieldnames=lab_fieldnames, table_name="Lab")

        # Generate Transfusions
        transfusion_fieldnames = [
            "visit_no",
            "trnsfsn_dtm",
            "transfusion_rank",
            "blood_unit_number",
            "rbc_units",
            "ffp_units",
            "plt_units",
            "cryo_units",
            "whole_units",
            "rbc_vol",
            "ffp_vol",
            "plt_vol",
            "cryo_vol",
            "whole_vol",
            "cell_saver_ml",
        ]

        def gen_transfusions():
            for i in range(int(.25 * MILLION)):
                yield {
                    "visit_no": (i % int(1 * MILLION)),
                    "trnsfsn_dtm": "2020-01-04 14:00:00",
                    "transfusion_rank": float(i),
                    "blood_unit_number": f"BU{i:08d}",
                    "rbc_units": 1.0 if i % 3 == 0 else None,
                    "ffp_units": 1.0 if i % 4 == 0 else None,
                    "plt_units": 1.0 if i % 5 == 0 else None,
                    "cryo_units": None,
                    "whole_units": None,
                    "rbc_vol": 300.0 if i % 3 == 0 else None,
                    "ffp_vol": 250.0 if i % 4 == 0 else None,
                    "plt_vol": 200.0 if i % 5 == 0 else None,
                    "cryo_vol": None,
                    "whole_vol": None,
                    "cell_saver_ml": None,
                }
        self.send_csv_to_db(gen_transfusions(), fieldnames=transfusion_fieldnames, table_name="Transfusion")

        # Generate Attending Providers
        attending_provider_fieldnames = [
            "visit_no",
            "prov_id",
            "prov_name",
            "attend_start_dtm",
            "attend_end_dtm",
            "attend_prov_line",
        ]

        def gen_attending_providers():
            for i in range(int(1.7 * MILLION)):
                yield {
                    "visit_no": (i % int(1 * MILLION)),
                    "prov_id": f"PROV{i:05d}",
                    "prov_name": f"Dr. Attending{i}",
                    "attend_start_dtm": "2020-01-01 08:00:00",
                    "attend_end_dtm": "2020-01-05 17:00:00",
                    "attend_prov_line": float(i),
                }
        self.send_csv_to_db(gen_attending_providers(), fieldnames=attending_provider_fieldnames, table_name="AttendingProvider")

        # Generate Room Trace
        room_trace_fieldnames = [
            "visit_no",
            "department_id",
            "department_name",
            "room_id",
            "bed_id",
            "service_in_c",
            "service_in_desc",
            "in_dtm",
            "out_dtm",
            "duration_days",
            "bed_room_dept_line",
        ]

        def gen_room_traces():
            for i in range(int(2.2 * MILLION)):
                yield {
                    "visit_no": (i % int(1 * MILLION)),
                    "department_id": f"DEPT{100 + (i % 10)}",
                    "department_name": f"Department {i % 10}",
                    "room_id": f"ROOM{200 + (i % 20)}",
                    "bed_id": f"BED{300 + (i % 30)}",
                    "service_in_c": "A",
                    "service_in_desc": "General Medicine",
                    "in_dtm": "2020-01-01 09:00:00",
                    "out_dtm": "2020-01-02 09:00:00",
                    "duration_days": 1.0,
                    "bed_room_dept_line": float(i),
                }
        self.send_csv_to_db(gen_room_traces(), fieldnames=room_trace_fieldnames, table_name="RoomTrace")

        # Materialize VisitAttributes
        self.materialize_visit_attributes()
