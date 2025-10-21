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

from api.views.utils.utils import get_all_cpt_code_filters

DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Scale mock counts to match real-data percentages.
MOCK_TOTAL = 40 * 10**6  # Change to scale
REAL_COUNTS = {
    "Patients": 303_000,
    "Visits": 704_000,
    "Surgeries": 252_000,
    "Transfusions": 159_000,
    "BillingCodes": 7_100_000,
    "Medications": 10_300_000,
    "Labs": 5_400_000,
    "AttendingProvider": 1_100_000,
    "DeptServ": 1_500_000,
}
REAL_TOTAL = sum(REAL_COUNTS.values())
REAL_PCTS = {k: v / REAL_TOTAL for k, v in REAL_COUNTS.items()}
target_counts = {k: max(1, int(MOCK_TOTAL * REAL_PCTS[k])) for k in REAL_COUNTS}

# Target row counts
target_patients_count = target_counts["Patients"]
target_visits_count = target_counts["Visits"]
target_surgeries_count = target_counts["Surgeries"]
target_billings_count = target_counts["BillingCodes"]
target_meds_count = target_counts["Medications"]
target_labs_count = target_counts["Labs"]
target_transfusions_count = target_counts["Transfusions"]
target_attending_provs_count = target_counts["AttendingProvider"]
target_roomtraces_count = target_counts["DeptServ"]


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

    def _report_counts(self):
        """Compare target counts vs actual table row counts and print % difference."""
        table_targets = OrderedDict([
            ("Patient", target_patients_count),
            ("Visit", target_visits_count),
            ("SurgeryCase", target_surgeries_count),
            ("BillingCode", target_billings_count),
            ("Lab", target_labs_count),
            ("Medication", target_meds_count),
            ("Transfusion", target_transfusions_count),
            ("AttendingProvider", target_attending_provs_count),
            ("RoomTrace", target_roomtraces_count),
        ])
        self.stdout.write(self.style.MIGRATE_HEADING("Row count summary"))
        with connection.cursor() as cursor:
            for table, target in table_targets.items():
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                actual = cursor.fetchone()[0] or 0
                diff = actual - (target or 0)
                diff_pct = (diff / target * 100.0) if target else 0.0
                self.stdout.write(
                    f"- {table}: target={target:,}  actual={actual:,}  "
                    f"diff={diff:+,} ({diff_pct:.2f}%)"
                )
                
    def handle(self, *args, **options):
        # Initialize the Faker object
        Faker.seed(42)
        fake = Faker()
        fake.add_provider(date_time)
        pats = []
        visits = []
        surgeries = []
        labs = []
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
            for _ in range(int(target_patients_count)):
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
                bad_pat = fake.random_element(elements=OrderedDict([(True, 0.67), (False, 0.33)]))

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
                num_visits = 3 if bad_pat else 1
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
                        "adm_dtm": admit_date.strftime(DATE_FORMAT),
                        "dsch_dtm": discharge_date.strftime(DATE_FORMAT),
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
                        **cci,
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
            for pat, bad_pat, visit in visits:
                # Randomly decide if this visit gets a surgery case, most don't
                if not bad_pat and random.random() < 0.9:
                    continue 
                if bad_pat and random.random() < 0.7:
                    continue

                # Possible surgery start times
                surg1_start = make_aware(fake.date_time_between(
                    start_date=datetime.strptime(visit["adm_dtm"], DATE_FORMAT),
                    end_date=datetime.strptime(visit["adm_dtm"], DATE_FORMAT) + timedelta(days=1),
                ))
                surg2_start = make_aware(fake.date_time_between(
                    start_date=datetime.strptime(visit["adm_dtm"], DATE_FORMAT) + timedelta(days=3),
                    end_date=datetime.strptime(visit["adm_dtm"], DATE_FORMAT) + timedelta(days=4),
                ))
                # Bad cases: 35% 2 surgeries, 65% 1 surgery
                # Good cases: always 1 surgery
                if bad_pat and random.random() < 0.65:
                    surg_starts = [surg1_start]
                else:
                    surg_starts = [surg1_start, surg2_start] if bad_pat else [surg1_start]

                # Create surgery cases
                for start_time in surg_starts:
                    surg_end = start_time + timedelta(hours=5)

                    surgeon = fake.random_element(elements=surgeons)
                    anesth = fake.random_element(elements=anests)

                    surgery = {
                        "case_id": fake.unique.random_number(digits=10),
                        "visit_no": visit["visit_no"],
                        "mrn": pat["mrn"],
                        "case_date": start_time.date().strftime("%Y-%m-%d"),
                        "surgery_start_dtm": start_time.strftime(DATE_FORMAT),
                        "surgery_end_dtm": surg_end.strftime(DATE_FORMAT),
                        "surgery_elap": (surg_end - start_time).total_seconds() / 60,
                        "surgery_type_desc": fake.random_element(
                            elements=(
                                "Elective",
                                "Emergent",
                                "Trauma Emergent",
                                "Trauma Urgent",
                                "Urgent",
                            )
                        ),
                        "surgeon_prov_id": surgeon[0],
                        "surgeon_prov_name": surgeon[1],
                        "anesth_prov_id": anesth[0],
                        "anesth_prov_name": anesth[1],
                        "prim_proc_desc": fake.sentence(),
                        "postop_icu_los": fake.random_int(min=0, max=10),
                        "sched_site_desc": fake.sentence(),
                        "asa_code": fake.random_element(
                            elements=("1", "2", "3", "4", "5", "6")
                        ),
                    }
                    surgeries.append((pat, bad_pat, visit, surgery))
                    yield surgery
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
            codes, _, _ = get_all_cpt_code_filters()
            for _, bad_pat, _, surg in surgeries:
                for rank in range(random.randint(1, 52)):
                    yield {
                        "visit_no": surg["visit_no"],
                        "cpt_code": fake.random_element(elements=codes),
                        "cpt_code_desc": fake.sentence(),
                        "proc_dtm": surg["surgery_start_dtm"],
                        "prov_id": surg["surgeon_prov_id"],
                        "prov_name": surg["surgeon_prov_name"],
                        "code_rank": rank,
                    }
                # Add ecmo codes
                if bad_pat and random.random() < 0.2:
                    yield {
                        "visit_no": surg["visit_no"],
                        "cpt_code": fake.random_element(elements=['33946', '33947', '33948', '33949', '33952', '33953', '33954', '33955', '33956', '33957', '33958', '33959', '33960', '33961', '33962', '33963', '33964', '33965', '33966', '33969', '33984', '33985', '33986', '33987', '33988', '33989']),
                        "cpt_code_desc": fake.sentence(),
                        "proc_dtm": surg["surgery_start_dtm"],
                        "prov_id": surg["anesth_prov_id"],
                        "prov_name": surg["anesth_prov_name"],
                        "code_rank": rank + 1,
                    }
                # Add stroke codes
                if bad_pat and random.random() < 0.05:
                    yield {
                        "visit_no": surg["visit_no"],
                        "cpt_code": fake.random_element(elements=['99291', '1065F', '1066F']),
                        "cpt_code_desc": fake.sentence(),
                        "proc_dtm": surg["surgery_start_dtm"],
                        "prov_id": surg["anesth_prov_id"],
                        "prov_name": surg["anesth_prov_name"],
                        "code_rank": rank + 2,
                    }
        self.send_csv_to_db(gen_billing_codes(), fieldnames=billing_code_fieldnames, table_name="BillingCode")

        # Generate Labs
        def make_lab_row(fake, pat, visit, lab_draw_dtm, last_lab, test_type):
            if test_type == ["HGB", "Hemoglobin"]:
                if last_lab is None:
                    if random.random() < 0.4:  # 40% chance low
                        result_value = fake.pydecimal(left_digits=1, right_digits=1, positive=True, min_value=6, max_value=9)
                    else:
                        result_value = fake.pydecimal(left_digits=2, right_digits=1, positive=True, min_value=10, max_value=16)
                else:
                    if last_lab["result_value"] < 6:
                        result_value = last_lab["result_value"] + 2
                    elif last_lab["result_value"] < 8:
                        result_value = last_lab["result_value"] + 1
                    else:
                        result_value = fake.pydecimal(
                            left_digits=2,
                            right_digits=1,
                            positive=True,
                            min_value=max(last_lab["result_value"] - 2, 5),
                            max_value=min(last_lab["result_value"] + 2, 20),
                        )
                lower_limit = 12
                upper_limit = 18
                uom = "g/dL"
            elif test_type == ["INR"]:
                if last_lab is None:
                    if random.random() < 0.4:  # 40% chance low
                        result_value = fake.pydecimal(left_digits=1, right_digits=1, positive=True, min_value=6, max_value=9)
                    else:
                        result_value = fake.pydecimal(left_digits=2, right_digits=1, positive=True, min_value=10, max_value=16)
                else:
                    if last_lab["result_value"] > 4.0:
                        result_value = last_lab["result_value"] - 1.5
                    elif last_lab["result_value"] > 2.0:
                        result_value = last_lab["result_value"] - 0.5
                    else:
                        result_value = fake.pydecimal(
                            left_digits=2,
                            right_digits=2,
                            positive=True,
                            min_value=max(last_lab["result_value"] - 1, 1.0),
                            max_value=min(last_lab["result_value"] + 1, 5.0),
                        )
                lower_limit = 0.8
                upper_limit = 1.2
                uom = "unitless"
            elif test_type == ["PLT", "Platelet Count"]:
                CRITICAL_LOW_MAX = 30000
                if last_lab is None:
                    # Normal adult range ~150k–450k per µL
                    if random.random() < 0.25:
                        # 25% of labs are critically low (5,000 to 30,000)
                        result_value = fake.pydecimal(left_digits=5, right_digits=0, positive=True, min_value=5000, max_value=CRITICAL_LOW_MAX)
                    else:
                        # The normal range
                        result_value = fake.pydecimal(left_digits=6, right_digits=0, positive=True, min_value=150000, max_value=450000)
                else:
                    # If the last lab was very low, it might rise, or it might stay low.
                    if last_lab["result_value"] < CRITICAL_LOW_MAX or random.random() < 0.1:
                        # A small chance (10%) of an *incident* of critical low
                        delta = fake.random_int(min=-30000, max=30000)
                    else:
                        # Smaller change when already high/normal
                        delta = fake.random_int(min=-15000, max=15000)
                    
                    # Ensure result_value is between 5000 and 700000
                    result_value = max(5000, min(700000, int(last_lab["result_value"]) + delta))

                lower_limit = 150000
                upper_limit = 450000
                uom = "cells/uL"
            elif test_type == ["Fibrinogen"]:
                if last_lab is None:
                    if random.random() < 0.35:  # 35% chance low
                        result_value = fake.pydecimal(left_digits=3, right_digits=1, positive=True, min_value=80, max_value=150)
                    else:
                        result_value = fake.pydecimal(left_digits=3, right_digits=1, positive=True, min_value=151, max_value=300)
                else:
                    if last_lab["result_value"] < 150:
                        result_value = last_lab["result_value"] + 100
                    elif last_lab["result_value"] < 200:
                        result_value = last_lab["result_value"] + 50
                    else:
                        result_value = fake.pydecimal(
                            left_digits=3,
                            right_digits=1,
                            positive=True,
                            min_value=max(last_lab["result_value"] - 100, 50),
                            max_value=min(last_lab["result_value"] + 100, 400),
                        )
                lower_limit = 150
                upper_limit = 400
                uom = "mg/dL"

            return {
                "visit_no": visit["visit_no"],
                "mrn": pat["mrn"],
                "lab_id": fake.unique.random_number(digits=10),
                "lab_draw_dtm": lab_draw_dtm.strftime(DATE_FORMAT),
                "lab_panel_code": fake.unique.random_number(digits=10),
                "lab_panel_desc": fake.sentence(),
                "result_dtm": (lab_draw_dtm + timedelta(hours=random.randint(1, 12))).strftime(DATE_FORMAT),
                "result_code": fake.unique.random_number(digits=10),
                "result_loinc": fake.unique.random_number(digits=10),
                "result_desc": fake.random_element(elements=test_type),
                "result_value": float(result_value),
                "uom_code": uom,
                "lower_limit": lower_limit,
                "upper_limit": upper_limit,
            }
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
            for pat, bad_pat, visit, surgery in surgeries:
                
                # Tests being run on patients
                tests = [["HGB", "Hemoglobin"]]
                if fake.random.random() < (0.9 if bad_pat else 0.8):
                    tests.append(["PLT", "Platelet Count"])
                if fake.random.random() < (0.9 if bad_pat else 0.6):
                    tests.append(["INR"])
                if fake.random.random() < (0.9 if bad_pat else 0.75):
                    tests.append(["Fibrinogen"])

                for result_desc_option in tests:
                    lab = None
                    # Pre-op
                    draw_dtm = make_aware(
                        fake.date_time_between(
                            start_date=datetime.strptime(visit["adm_dtm"], DATE_FORMAT),
                            end_date=datetime.strptime(surgery["surgery_start_dtm"], DATE_FORMAT) - timedelta(minutes=30)
                        )
                    )
                    lab_row = make_lab_row(fake, pat, visit, draw_dtm, lab, result_desc_option)
                    yield lab_row
                    labs.append((surgery, lab_row))
                    lab = lab_row

                    # Intra-op: 0-5 tests
                    for i in range(random.randint(0, 5)):
                        draw_dtm = make_aware(
                            fake.date_time_between(
                                start_date=datetime.strptime(surgery["surgery_start_dtm"], DATE_FORMAT) + timedelta(hours=i),
                                end_date=datetime.strptime(surgery["surgery_start_dtm"], DATE_FORMAT) + timedelta(hours=i + 1),
                            )
                        )
                        lab_row = make_lab_row(fake, pat, visit, draw_dtm, lab, result_desc_option)
                        yield lab_row
                        labs.append((surgery, lab_row))
                        lab = lab_row

                    # Post-op: 0-4 tests
                    for i in range(random.randint(0, 4)):
                        draw_dtm = make_aware(
                            fake.date_time_between(
                                start_date=datetime.strptime(surgery["surgery_end_dtm"], DATE_FORMAT) + timedelta(hours=i),
                                end_date=datetime.strptime(surgery["surgery_end_dtm"], DATE_FORMAT) + timedelta(hours=i + 1),
                            )
                        )
                        lab_row = make_lab_row(fake, pat, visit, draw_dtm, lab, result_desc_option)
                        labs.append((surgery, lab_row))
                        yield lab_row
                        lab = lab_row
        self.send_csv_to_db(gen_labs(), fieldnames=lab_fieldnames, table_name="Lab")

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
            med_types = [
                "TXA",
                "B12",
                "AMICAR",
                "tranexamic acid",
                "vitamin B12",
                "aminocaproic acid",
                "iron",
                "ferrous sulfate",
                "ferric carboxymaltose",
            ]
            for _, _, visit, surg in surgeries:
                order_dtm = make_aware(
                    fake.date_time_between(
                        start_date=datetime.strptime(visit["adm_dtm"], DATE_FORMAT),
                        end_date=datetime.strptime(visit["dsch_dtm"], DATE_FORMAT),
                    )
                )
                admin_dtm = order_dtm + timedelta(minutes=fake.random_int(min=1, max=120))
                for _ in range(random.randint(1, 80)):
                    yield {
                        "visit_no": surg["visit_no"],
                        "order_med_id": fake.unique.random_number(digits=10),
                        "order_dtm": order_dtm,
                        "medication_id": fake.unique.random_number(digits=10),
                        "medication_name": fake.random_element(elements=med_types),
                        "med_admin_line": fake.random_int(min=1, max=4),
                        "admin_dtm": admin_dtm,
                        "admin_dose": fake.pydecimal(
                            left_digits=2,
                            right_digits=1,
                            positive=True,
                            min_value=0.1,
                            max_value=10,
                        ),
                        "med_form": fake.random_element(
                            elements=("tablet", "capsule", "injection", "syrup")
                        ),
                        "admin_route_desc": fake.random_element(
                            elements=(
                                "oral",
                                "intravenous",
                                "intramuscular",
                                "subcutaneous",
                            )
                        ),
                        "dose_unit_desc": fake.random_element(
                            elements=("mg", "g", "mL", "unit")
                        ),
                        "med_start_dtm": admin_dtm,
                        "med_end_dtm": admin_dtm + timedelta(hours=fake.random_int(min=1, max=12)),
                    }
        self.send_csv_to_db(gen_medications(), fieldnames=medication_fieldnames, table_name="Medication")

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
            # --- Helper functions ---
            # Get worst lab values in window close to transfusion time
            def get_lab_extrema(labs_window):
                extrema = {"HGB": None, "INR": None, "PLT": None, "Fibrinogen": None}
                for l in labs_window:
                    val = float(l["result_value"])
                    desc = l["result_desc"]
                    if desc in ("HGB", "Hemoglobin"):
                        extrema["HGB"] = val if extrema["HGB"] is None else min(extrema["HGB"], val)
                    elif desc == "INR":
                        extrema["INR"] = val if extrema["INR"] is None else max(extrema["INR"], val)
                    elif desc in ("PLT", "Platelet Count"):
                        extrema["PLT"] = val if extrema["PLT"] is None else min(extrema["PLT"], val)
                    elif desc == "Fibrinogen":
                        extrema["Fibrinogen"] = val if extrema["Fibrinogen"] is None else min(extrema["Fibrinogen"], val)
                return extrema

            # Blood products given based on worst labs in time window
            def blood_products_given(extrema, has_surg, surg_type, surg_len):
                rbc_units = ffp_units = plt_units = cryo_units = 0
                hgb, inr, plt, fib = extrema["HGB"], extrema["INR"], extrema["PLT"], extrema["Fibrinogen"]
                if hgb is not None:
                    if hgb < 6: rbc_units = random.randint(2, 4)
                    elif hgb < 7: rbc_units = random.randint(1, 3)
                    elif hgb < 8: rbc_units = random.randint(0, 2)
                    elif hgb < 9 and random.random() < 0.4: rbc_units = 1
                    elif hgb < 10 and random.random() < 0.25: rbc_units = 1
                if inr is not None:
                    if inr > 4: ffp_units = random.randint(3, 7)
                    elif inr > 2: ffp_units = random.randint(2, 4)
                    elif inr > 1.5: ffp_units = random.randint(1, 2)
                if plt is not None:
                    if plt < 10000: plt_units = random.randint(1, 3)
                    elif plt < 20000: plt_units = random.randint(1, 2)
                    elif plt < 50000: plt_units = random.randint(0, 1)
                    elif has_surg and plt < 100000 and random.random() < 0.2: plt_units = max(plt_units, 1)
                if fib is not None:
                    if fib < 150: cryo_units = random.randint(1, 2)
                    elif fib < 200: cryo_units = random.randint(0, 1)
                # Massive transfusion for trauma/emergent/long cases
                if has_surg and ("Emergent" in surg_type or "Trauma" in surg_type or surg_len > 4) and random.random() < 0.5:
                    rbc_units += random.randint(1, 3)
                    ffp_units += random.randint(1, 3)
                    plt_units += random.randint(0, 2)
                    cryo_units += random.randint(0, 1)
                return rbc_units, ffp_units, plt_units, cryo_units

            # --- Index labs and surgeries by visit ---
            labs_by_visit = {}
            for surg, lab in labs:
                labs_by_visit.setdefault(surg["visit_no"], []).append(lab)
            for v in labs_by_visit.values():
                v.sort(key=lambda l: l["lab_draw_dtm"])
            surg_by_visit = {s["visit_no"]: s for _, _, _, s in surgeries}

            # --- Generate transfusion events per visit ---
            for _, _, visit in visits:
                visit_no = visit["visit_no"]
                v_labs = labs_by_visit.get(visit_no, [])
                surg = surg_by_visit.get(visit_no)
                has_surg = surg is not None
                surg_type = surg["surgery_type_desc"] if surg else ""
                surg_len = (datetime.strptime(surg["surgery_end_dtm"], DATE_FORMAT) - datetime.strptime(surg["surgery_start_dtm"], DATE_FORMAT)).total_seconds()/3600 if surg else 0

                # --- Create transfusion events, triggered by lab abnormalities ---
                transfusion_events = [
                    (datetime.strptime(lab["lab_draw_dtm"], DATE_FORMAT), lab)
                    for lab in v_labs
                    if (not has_surg or datetime.strptime(lab["lab_draw_dtm"], DATE_FORMAT) <= datetime.strptime(surg["surgery_end_dtm"], DATE_FORMAT))
                    and (
                        (score := (
                            (max(0, 10 - float(lab["result_value"])) if lab["result_desc"] in ("HGB", "Hemoglobin") else 0) +
                            (max(0, float(lab["result_value"]) - 1) if lab["result_desc"] == "INR" else 0) +
                            (max(0, (150000 - float(lab["result_value"])) / 50000) if lab["result_desc"] in ("PLT", "Platelet Count") else 0) +
                            (max(0, (150 - float(lab["result_value"])) / 50) if lab["result_desc"] == "Fibrinogen" else 0)
                        )) > 0.5 and random.random() < min(0.9, 0.1 + score/12)
                    )
                ]
                # Extra chance for intra-op/trauma transfusion event
                if has_surg and random.random() < 0.1:
                    mid_surg = datetime.strptime(surg["surgery_start_dtm"], DATE_FORMAT) + timedelta(minutes=random.randint(30, int(surg_len*60-10)))
                    transfusion_events.append((mid_surg, None))
                if has_surg and (("Emergent" in surg_type or "Trauma" in surg_type or surg_len > 4) and random.random() < 0.2):
                    mid_surg = datetime.strptime(surg["surgery_start_dtm"], DATE_FORMAT) + timedelta(minutes=random.randint(10, int(surg_len*60-10)))
                    transfusion_events.append((mid_surg, None))
                # Limit to 1–3 transfusion events per visit
                if transfusion_events:
                    transfusion_events = random.sample(transfusion_events, min(len(transfusion_events), random.choices([1,2,3],[0.8,0.1,0.05])[0]))

                # --- For each transfusion event, create it and determine products ---
                for rank, (event_time, anchor_lab) in enumerate(transfusion_events):
                    labs_window = [l for l in v_labs if datetime.strptime(l["lab_draw_dtm"], DATE_FORMAT) <= event_time and datetime.strptime(l["lab_draw_dtm"], DATE_FORMAT) >= event_time - timedelta(hours=24)]
                    extrema = get_lab_extrema(labs_window)
                    rbc_units, ffp_units, plt_units, cryo_units = blood_products_given(extrema, has_surg, surg_type, surg_len)

                    # If nothing to transfuse, skip
                    if (rbc_units + ffp_units + plt_units + cryo_units) <= 0:
                        continue
                    
                    # --- Record the transfusion event ---
                    cell_saver_ml = random.randint(100, 1000) if has_surg and rbc_units > 0 else 0
                    mode = random.choice(("unit", "vol"))
                    yield {
                        "visit_no": visit_no,
                        "trnsfsn_dtm": make_aware(event_time).strftime(DATE_FORMAT),
                        "transfusion_rank": rank,
                        "blood_unit_number": Faker().unique.random_number(digits=10),
                        "rbc_units": rbc_units if mode == "unit" else None,
                        "ffp_units": ffp_units if mode == "unit" else None,
                        "plt_units": plt_units if mode == "unit" else None,
                        "cryo_units": cryo_units if mode == "unit" else None,
                        "whole_units": 0 if mode == "unit" else None,
                        "rbc_vol": rbc_units * 250 if mode == "vol" else None,
                        "ffp_vol": ffp_units * 220 if mode == "vol" else None,
                        "plt_vol": plt_units * 300 if mode == "vol" else None,
                        "cryo_vol": cryo_units * 75 if mode == "vol" else None,
                        "whole_vol": 0 if mode == "vol" else None,
                        "cell_saver_ml": cell_saver_ml,
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
            for i in range(int(target_attending_provs_count)):
                yield {
                    "visit_no": (i % int(target_visits_count + 1)),
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

        dept_choices = [
                    ("Emergency", 0.15),
                    ("Radiology", 0.25),
                    ("Hemoc", 0.10),
                    ("Cardiology", 0.40),
                    ("Orthopedics", 0.10),
                ]
        dept_names, dept_weights = zip(*dept_choices)
        dept_id_map = {
            "Emergency": "DEPT101",
            "Radiology": "DEPT102",
            "Hemoc": "DEPT103",
            "Cardiology": "DEPT104",
            "Orthopedics": "DEPT105",
        }

        def gen_room_traces():
            for i in range(int(target_roomtraces_count)):
                dept_name = random.choices(dept_names, weights=dept_weights, k=1)[0]
                yield {
                    "visit_no": (i % int(target_visits_count + 1)),
                    "department_id": dept_id_map[dept_name],
                    "department_name": dept_name,
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

        self._report_counts()