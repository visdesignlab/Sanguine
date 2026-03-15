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
import string
import tempfile

from api.views.utils.utils import get_all_cpt_code_filters

DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Scale mock counts to match real-data percentages.
MOCK_TOTAL = 40 * 10**5  # Change to scale
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
            # Truncate table to prevent duplicates
            cursor.execute("SET FOREIGN_KEY_CHECKS=0;")
            cursor.execute(f"TRUNCATE TABLE {table_name};")
            cursor.execute("SET FOREIGN_KEY_CHECKS=1;")
            
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
            (
                fake.unique.random_number(digits=10),
                f"Dr. {fake.first_name()} {random.choice(string.ascii_uppercase)}. {fake.last_name()}"
            )
            for _ in range(50)
        ]
        anests = [
            (
                fake.unique.random_number(digits=10),
                f"Dr. {fake.first_name()} {random.choice(string.ascii_uppercase)}. {fake.last_name()}"
            )
            for _ in range(50)
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
            # Realistic demographic weights
            race_weights = [0.13, 0.60, 0.01, 0.06, 0.03, 0.05, 0.01, 0.11]
            eth_weights  = [0.19, 0.02, 0.04, 0.75]
            sex_weights  = [0.51, 0.48, 0.004, 0.003, 0.003]
            sex_codes    = ("F", "M", "NB", "U", "X")
            # Age buckets: (start_year, end_year) with weights favoring 50-80
            age_buckets  = [(1935, 1950), (1950, 1965), (1965, 1980), (1980, 1995), (1995, 2010)]
            age_weights  = [0.10, 0.25, 0.30, 0.25, 0.10]

            for _ in range(int(target_patients_count)):
                race_idx = random.choices(range(8), weights=race_weights, k=1)[0]
                eth_idx = random.choices(range(4), weights=eth_weights, k=1)[0]
                bucket = random.choices(age_buckets, weights=age_weights, k=1)[0]
                birthdate = fake.date_time_between(
                    start_date=datetime(bucket[0], 1, 1),
                    end_date=datetime(bucket[1], 1, 1),
                )
                # ~3% mortality rate (realistic in-hospital)
                if random.random() < 0.03:
                    death_date = make_aware(
                        fake.date_time_between(
                            start_date=datetime(2024, 11, 1),
                            end_date=datetime(2025, 5, 1),
                        )
                    )
                else:
                    death_date = None
                bad_pat = fake.random_element(elements=OrderedDict([(True, 0.67), (False, 0.33)]))

                patient = {
                    "mrn": fake.unique.random_number(digits=10),
                    "last_name": fake.last_name(),
                    "first_name": fake.first_name(),
                    "birth_date": birthdate,
                    "sex_code": random.choices(sex_codes, weights=sex_weights, k=1)[0],
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
            # Realistic APR-DRG codes relevant to blood management / surgical cohort
            drg_catalog = [
                ("001", "Liver Transplant and/or Intestinal Transplant"),
                ("002", "Heart and/or Lung Transplant"),
                ("040", "Major Joint Replacement"),
                ("163", "Coronary Bypass w/ Cardiac Catheterization"),
                ("165", "Coronary Bypass w/o Cardiac Catheterization"),
                ("166", "Coronary Stent Insertion"),
                ("170", "Permanent Cardiac Pacemaker Implant"),
                ("220", "Major Stomach, Esophageal & Duodenal Procedures"),
                ("221", "Major Small & Large Bowel Procedures"),
                ("260", "Major Biliary Tract Procedures"),
                ("302", "Kidney Transplant"),
                ("360", "Vaginal Delivery"),
                ("370", "Cesarean Delivery"),
                ("403", "Hip Joint Replacement"),
                ("404", "Knee Joint Replacement"),
                ("440", "Kidney & Urinary Tract Procedures"),
                ("482", "Extensive Burns w/ Skin Graft"),
                ("560", "Red Blood Cell Disorders"),
                ("661", "Major Hematologic/Immunologic Diagnoses"),
                ("710", "Craniotomy for Multiple Significant Trauma"),
            ]
            drg_weights_list = [
                0.02, 0.02, 0.10, 0.06, 0.06, 0.05, 0.03,
                0.04, 0.08, 0.03, 0.02, 0.06, 0.08,
                0.08, 0.08, 0.04, 0.01, 0.05, 0.04, 0.05,
            ]
            # Patient class distribution
            pat_class_choices = ["Inpatient", "Observation", "Outpatient Surgery", "Emergency"]
            pat_class_weights = [0.60, 0.20, 0.15, 0.05]

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
                    # Right-skewed LOS: median ~3-4 days, tail to 45
                    los_r = random.random()
                    if los_r < 0.30:
                        los_days = random.randint(1, 2)
                    elif los_r < 0.60:
                        los_days = random.randint(3, 5)
                    elif los_r < 0.85:
                        los_days = random.randint(6, 10)
                    elif los_r < 0.95:
                        los_days = random.randint(11, 20)
                    else:
                        los_days = random.randint(21, 45)
                    discharge_date = admit_date + timedelta(days=los_days)
                    clinical_los = los_days
                    age_at_adm = (admit_date.date() - pat["birth_date"].date()).days // 365
                    # CCI with realistic prevalences and correct Charlson weights
                    # Each component: (probability_present, CCI_weight)
                    cci_specs = [
                        ("cci_mi",              0.08, 1),
                        ("cci_chf",             0.12, 1),
                        ("cci_pvd",             0.06, 1),
                        ("cci_cvd",             0.07, 1),
                        ("cci_dementia",        0.03, 1),
                        ("cci_copd",            0.15, 1),
                        ("cci_rheum_dz",        0.03, 1),
                        ("cci_pud",             0.02, 1),
                        ("cci_liver_dz_mild",   0.05, 1),
                        ("cci_dm_wo_compl",     0.20, 1),
                        ("cci_dm_w_compl",      0.08, 2),
                        ("cci_paraplegia",      0.02, 2),
                        ("cci_renal_dz",        0.10, 2),
                        ("cci_malign_wo_mets",  0.07, 2),
                        ("cci_liver_dz_severe", 0.02, 3),
                        ("cci_malign_w_mets",   0.04, 6),
                        ("cci_hiv_aids",        0.005, 6),
                    ]
                    # Bad patients are sicker — double the prevalence
                    cci = {}
                    cci_score = 0
                    for name, prob, weight in cci_specs:
                        effective_prob = min(prob * 2, 0.6) if bad_pat else prob
                        present = 1 if random.random() < effective_prob else 0
                        cci[name] = present * weight
                        cci_score += present * weight

                    vent = fake.random_element(elements=(True, True, False)) if bad_pat else fake.random_element(elements=(True, False, False, False, False))
                    vent_mins = fake.random_int(min=30, max=10000) if vent else 0
                    vent_days = max(1, vent_mins // 1440) if vent else 0 

                    # Pick a DRG
                    drg_code, drg_desc = random.choices(drg_catalog, weights=drg_weights_list, k=1)[0]
                    
                    visit = {
                        "visit_no": visit_no,
                        "mrn": pat["mrn"],
                        "epic_pat_id": fake.unique.random_number(digits=10),
                        "hsp_account_id": fake.unique.random_number(digits=10),
                        "adm_dtm": admit_date.strftime(DATE_FORMAT),
                        "dsch_dtm": discharge_date.strftime(DATE_FORMAT),
                        "clinical_los": clinical_los,
                        "age_at_adm": age_at_adm,
                        "pat_class_desc": random.choices(pat_class_choices, weights=pat_class_weights, k=1)[0],
                        "pat_expired_f": "Y" if (pat["death_date"] is not None and random.random() < 0.5) else None,
                        "invasive_vent_f": "Y" if vent else None,
                        "total_vent_mins": vent_mins,
                        "total_vent_days": vent_days,
                        "apr_drg_code": drg_code,
                        "apr_drg_rom": fake.random_element(elements=(1, 2, 3, 4, None)),
                        "apr_drg_soi": fake.random_element(elements=(1, 2, 3, 4, None)),
                        "apr_drg_desc": drg_desc,
                        "apr_drg_weight": (
                            round(random.uniform(0.5, 2.5), 4) if (r := random.random()) < 0.8
                            else round(random.uniform(2.5, 5.0), 4) if r < 0.95
                            else round(random.uniform(5.0, 25.0), 4)
                        ),
                        "ms_drg_weight": (
                            round(random.uniform(0.5, 2.5), 4) if (r := random.random()) < 0.8
                            else round(random.uniform(2.5, 5.0), 4) if r < 0.95
                            else round(random.uniform(5.0, 25.0), 4)
                        ),
                        **cci,
                        "cci_score": cci_score,
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
            # Realistic procedure names for blood-management surgical cohort
            proc_descs = [
                "Coronary Artery Bypass Graft (CABG)",
                "Aortic Valve Replacement",
                "Mitral Valve Repair",
                "Total Hip Arthroplasty",
                "Total Knee Arthroplasty",
                "Revision Total Hip Arthroplasty",
                "Cesarean Section",
                "Hysterectomy, Abdominal",
                "Liver Resection, Partial Hepatectomy",
                "Liver Transplant, Orthotopic",
                "Kidney Transplant, Cadaveric Donor",
                "Splenectomy, Open",
                "Exploratory Laparotomy",
                "Small Bowel Resection",
                "Colectomy, Right Hemicolectomy",
                "Repair of Abdominal Aortic Aneurysm",
                "Craniotomy for Tumor Excision",
                "Craniotomy for Subdural Hematoma Evacuation",
                "Thoracotomy with Lung Resection",
                "Open Reduction Internal Fixation, Femur",
                "Spine Fusion, Posterior Lumbar",
                "Spine Fusion, Anterior Cervical",
                "Radical Prostatectomy",
                "Radical Nephrectomy",
                "Whipple Procedure (Pancreaticoduodenectomy)",
                "Gastrectomy, Partial",
                "Debridement of Open Fracture",
                "Skin Graft, Full Thickness",
                "Vascular Bypass, Femoral-Popliteal",
                "Appendectomy, Laparoscopic",
            ]
            # Realistic facility/OR site names
            site_descs = [
                "Main OR - Building A",
                "Cardiac OR Suite",
                "Ambulatory Surgery Center",
                "Trauma OR - Level 1",
                "Neuro OR Suite",
                "Orthopedic OR Suite",
                "OB/GYN OR Suite",
                "Transplant OR Suite",
            ]
            # Weighted ASA codes: ASA 2-3 dominate, ASA 6 very rare
            asa_codes   = ["1", "2", "3", "4", "5", "6"]
            asa_weights = [0.05, 0.30, 0.35, 0.20, 0.09, 0.01]
            # Weighted surgery types: mostly elective
            surg_types   = ["Elective", "Emergent", "Trauma Emergent", "Trauma Urgent", "Urgent"]
            surg_weights = [0.65, 0.10, 0.05, 0.05, 0.15]

            def _random_duration_hours():
                """Lognormal-like surgical duration: median ~2.5h, tail to 10h+"""
                r = random.random()
                if r < 0.20:
                    return random.uniform(0.5, 1.5)
                elif r < 0.55:
                    return random.uniform(1.5, 3.0)
                elif r < 0.80:
                    return random.uniform(3.0, 5.0)
                elif r < 0.95:
                    return random.uniform(5.0, 8.0)
                else:
                    return random.uniform(8.0, 12.0)

            def _random_icu_los():
                """Realistic postop ICU LOS: most patients 0, skewed tail"""
                r = random.random()
                if r < 0.70:
                    return 0
                elif r < 0.85:
                    return random.randint(1, 2)
                elif r < 0.95:
                    return random.randint(3, 5)
                else:
                    return random.randint(6, 14)

            # Seed one surgery per surgeon so every provider has surgery_count >= 1
            if visits:
                for prov_id, prov_name in surgeons:
                    pat, bad_pat, visit = random.choice(visits)
                    # schedule somewhere during the stay
                    start_time = make_aware(
                        fake.date_time_between(
                            start_date=datetime.strptime(visit["adm_dtm"], DATE_FORMAT),
                            end_date=datetime.strptime(visit["dsch_dtm"], DATE_FORMAT),
                        )
                    )
                    dur_hours = _random_duration_hours()
                    end_time = start_time + timedelta(hours=dur_hours)
                    anesth = fake.random_element(elements=anests)
                    surgery = {
                        "case_id": fake.unique.random_number(digits=10),
                        "visit_no": visit["visit_no"],
                        "mrn": pat["mrn"],
                        "case_date": start_time.date().strftime("%Y-%m-%d"),
                        "surgery_start_dtm": start_time.strftime(DATE_FORMAT),
                        "surgery_end_dtm": end_time.strftime(DATE_FORMAT),
                        "surgery_elap": (end_time - start_time).total_seconds() / 60,
                        "surgery_type_desc": random.choices(surg_types, weights=surg_weights, k=1)[0],
                        "surgeon_prov_id": prov_id,
                        "surgeon_prov_name": prov_name,
                        "anesth_prov_id": anesth[0],
                        "anesth_prov_name": anesth[1],
                        "prim_proc_desc": random.choice(proc_descs),
                        "postop_icu_los": _random_icu_los(),
                        "sched_site_desc": random.choice(site_descs),
                        "asa_code": random.choices(asa_codes, weights=asa_weights, k=1)[0],
                    }
                    surgeries.append((pat, bad_pat, visit, surgery))
                    yield surgery

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
                    dur_hours = _random_duration_hours()
                    surg_end = start_time + timedelta(hours=dur_hours)

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
                        "surgery_type_desc": random.choices(surg_types, weights=surg_weights, k=1)[0],
                        "surgeon_prov_id": surgeon[0],
                        "surgeon_prov_name": surgeon[1],
                        "anesth_prov_id": anesth[0],
                        "anesth_prov_name": anesth[1],
                        "prim_proc_desc": random.choice(proc_descs),
                        "postop_icu_los": _random_icu_los(),
                        "sched_site_desc": random.choice(site_descs),
                        "asa_code": random.choices(asa_codes, weights=asa_weights, k=1)[0],
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
            
            # Base visit codes
            for pat, bad_pat, visit in visits:
                bc_r = random.random()
                if bc_r < 0.45:
                    num_codes = random.randint(3, 8)
                elif bc_r < 0.75:
                    num_codes = random.randint(9, 14)
                elif bc_r < 0.90:
                    num_codes = random.randint(15, 22)
                else:
                    num_codes = random.randint(23, 33)
                    
                prov = fake.random_element(elements=surgeons)
                proc_dtm = visit["adm_dtm"]
                
                for rank in range(num_codes):
                    yield {
                        "visit_no": visit["visit_no"],
                        "cpt_code": fake.random_element(elements=codes),
                        "cpt_code_desc": fake.sentence(),
                        "proc_dtm": proc_dtm,
                        "prov_id": prov[0],
                        "prov_name": prov[1],
                        "code_rank": rank,
                    }

            # Surgery specific codes
            for _, bad_pat, _, surg in surgeries:
                # Add ecmo codes
                if bad_pat and random.random() < 0.2:
                    yield {
                        "visit_no": surg["visit_no"],
                        "cpt_code": fake.random_element(elements=['33946', '33947', '33948', '33949', '33952', '33953', '33954', '33955', '33956', '33957', '33958', '33959', '33960', '33961', '33962', '33963', '33964', '33965', '33966', '33969', '33984', '33985', '33986', '33987', '33988', '33989']),
                        "cpt_code_desc": fake.sentence(),
                        "proc_dtm": surg["surgery_start_dtm"],
                        "prov_id": surg["anesth_prov_id"],
                        "prov_name": surg["anesth_prov_name"],
                        "code_rank": 101,
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
                        "code_rank": 102,
                    }
                # Add bleeding/hemorrhage codes
                if bad_pat and random.random() < 0.4:
                    yield {
                        "visit_no": surg["visit_no"],
                        "cpt_code": "11000", # In range 10000-69999
                        "cpt_code_desc": "CONTROL OF HEMORRHAGE",
                        "proc_dtm": surg["surgery_start_dtm"],
                        "prov_id": surg["surgeon_prov_id"],
                        "prov_name": surg["surgeon_prov_name"],
                        "code_rank": 103,
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
                    result_value = fake.pydecimal(left_digits=1, right_digits=2, positive=True, min_value=0.5, max_value=5.0)
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
                        labs.append((surgery, lab_row))    # <-- append intra-op lab
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

            # Add admission labs for non-surgical visits
            surg_visit_nos = {s["visit_no"] for _, _, _, s in surgeries}
            for pat, bad_pat, visit in visits:
                if visit["visit_no"] not in surg_visit_nos:
                    if random.random() < 0.5:
                        draw_dtm = make_aware(
                            datetime.strptime(visit["adm_dtm"], DATE_FORMAT) + timedelta(minutes=random.randint(15, 120))
                        )
                        tests = [["HGB", "Hemoglobin"], ["PLT", "Platelet Count"]]
                        for result_desc_option in tests:
                            lab_row = make_lab_row(fake, pat, visit, draw_dtm, None, result_desc_option)
                            yield lab_row
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
            # Drug-specific mappings: (name, route, form, dose, unit)
            med_profiles = [
                ("tranexamic acid",      "intravenous",  "injection", 1000, "mg"),
                ("TXA",                 "intravenous",  "injection", 1000, "mg"),
                ("tranexamic acid",      "oral",         "tablet",    650,  "mg"),
                ("aminocaproic acid",    "intravenous",  "injection", 5000, "mg"),
                ("AMICAR",              "intravenous",  "injection", 5000, "mg"),
                ("aminocaproic acid",    "oral",         "tablet",    1000, "mg"),
                ("vitamin B12",          "intramuscular","injection", 1000, "mcg"),
                ("B12",                 "intramuscular","injection", 1000, "mcg"),
                ("vitamin B12",          "oral",         "tablet",    1000, "mcg"),
                ("ferrous sulfate",      "oral",         "tablet",    325,  "mg"),
                ("iron sucrose",         "intravenous",  "injection", 200,  "mg"),
                ("ferric carboxymaltose","intravenous",  "injection", 750,  "mg"),
                ("iron dextran",         "intravenous",  "injection", 100,  "mg"),
            ]
            for pat, bad_pat, visit in visits:
                order_dtm = make_aware(
                    fake.date_time_between(
                        start_date=datetime.strptime(visit["adm_dtm"], DATE_FORMAT),
                        end_date=datetime.strptime(visit["dsch_dtm"], DATE_FORMAT),
                    )
                )
                admin_dtm = order_dtm + timedelta(minutes=fake.random_int(min=1, max=120))
                # Target average ~14.5 across visits
                med_r = random.random()
                if med_r < 0.15:
                    num_meds = random.randint(1, 5)
                elif med_r < 0.40:
                    num_meds = random.randint(6, 12)
                elif med_r < 0.75:
                    num_meds = random.randint(13, 20)
                else:
                    num_meds = random.randint(21, 35)
                for _ in range(num_meds):
                    profile = random.choice(med_profiles)
                    med_name, route, form, base_dose, unit = profile
                    # Add ±20% dose variation
                    dose = round(base_dose * random.uniform(0.8, 1.2), 1)
                    yield {
                        "visit_no": visit["visit_no"],
                        "order_med_id": fake.unique.random_number(digits=10),
                        "order_dtm": order_dtm,
                        "medication_id": fake.unique.random_number(digits=10),
                        "medication_name": med_name,
                        "med_admin_line": fake.random_int(min=1, max=4),
                        "admin_dtm": admin_dtm,
                        "admin_dose": dose,
                        "med_form": form,
                        "admin_route_desc": route,
                        "dose_unit_desc": unit,
                        "med_start_dtm": admin_dtm,
                        "med_end_dtm": admin_dtm + timedelta(hours=fake.random_int(min=1, max=12)),
                    }
        self.send_csv_to_db(gen_medications(), fieldnames=medication_fieldnames, table_name="Medication")

        # Generate Transfusions
        transfusion_fieldnames = [
            "id",
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
            transfusion_id_counter = 1
            for rank, (surg, lab) in enumerate(labs):
                num_transfusions = random.choices([0, 1, 2, 3, 4], weights=[0.94, 0.03, 0.015, 0.01, 0.005])[0]
                for t in range(num_transfusions):
                    rcb_units = 0
                    cell_saver_ml = 0
                    if lab["result_desc"] in ["HGB", "Hemoglobin"]:
                        if lab["result_value"] < 6:
                            rcb_units = fake.random_int(min=2, max=3)
                            cell_saver_ml = fake.random_int(min=300, max=1000)
                        elif lab["result_value"] < 7:
                            rcb_units = fake.random_int(min=1, max=2)
                            cell_saver_ml = fake.random_int(min=100, max=500)
                        elif lab["result_value"] < 8:
                            rcb_units = fake.random_int(min=0, max=1)
                            cell_saver_ml = fake.random_int(min=100, max=200)

                    rbcs = rcb_units
                    cell_saver = cell_saver_ml
                    ffp_units = 0
                    if lab["result_desc"] == "INR":
                        if lab["result_value"] > 4:
                            ffp_units = fake.random_int(min=3, max=7)
                        elif lab["result_value"] > 1.5:
                            ffp_units = fake.random_int(min=2, max=4)
                    ffp = ffp_units

                    # PLT if PLT count below 10,000
                    plt_units = 0
                    if lab["result_desc"] in ["PLT", "Platelet Count"]:
                        if lab["result_value"] < 10000:
                            # One plt unit = ~6 Pooled WB Units
                            plt_units = fake.random_int(min=1, max=2)
                        elif lab["result_value"] < 20000:
                            plt_units = fake.random_int(min=0, max=1)
                    plt = plt_units

                    # CRYO if Fibrinogen < 150 mg/dL in bleeding patient
                    cryo_units = 0
                    if lab["result_desc"] == "Fibrinogen":
                        if lab["result_value"] < 150:
                            cryo_units = fake.random_int(min=1, max=2)
                        elif lab["result_value"] < 200:
                            cryo_units = fake.random_int(min=0, max=1)
                    cryo = cryo_units

                    # Whole Blood if HGB < 7
                    whole_units = 0
                    if lab["result_desc"] in ["HGB", "Hemoglobin"]:
                        if lab["result_value"] < 7:
                            whole_units = fake.random_int(min=0, max=2)
                    whole = whole_units
                    mode = fake.random_element(elements=("unit", "vol"))

                    total_transfused = sum((x if x is not None else 0) for x in (rbcs, cell_saver, ffp, plt, cryo, whole))
                    if total_transfused > 0:
                        yield {
                            "id": transfusion_id_counter,
                            "visit_no": surg["visit_no"],
                            "trnsfsn_dtm": make_aware(
                                fake.date_time_between(
                                    start_date=datetime.strptime(surg["surgery_start_dtm"], DATE_FORMAT),
                                    end_date=datetime.strptime(surg["surgery_end_dtm"], DATE_FORMAT),
                                )
                            ).strftime(DATE_FORMAT),
                            "transfusion_rank": rank,
                            "blood_unit_number": fake.unique.random_number(digits=10),
                            "rbc_units": rbcs if mode == "unit" else None,
                            "ffp_units": ffp if mode == "unit" else None,
                            "plt_units": plt if mode == "unit" else None,
                            "cryo_units": cryo if mode == "unit" else None,
                            "whole_units": whole if mode == "unit" else None,
                            "rbc_vol": rbcs * 250 if mode == "vol" else None,
                            "ffp_vol": ffp * 220 if mode == "vol" else None,
                            "plt_vol": plt * 300 if mode == "vol" else None,
                            "cryo_vol": cryo * 75 if mode == "vol" else None,
                            "whole_vol": whole * 450 if mode == "vol" else None,
                            "cell_saver_ml": cell_saver
                        }
                        transfusion_id_counter += 1
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
            provider_pool = surgeons + anests
            for pat, bad_pat, visit in visits:
                # Parse base dates
                adm_time = datetime.strptime(visit["adm_dtm"], DATE_FORMAT)
                dsch_time = datetime.strptime(visit["dsch_dtm"], DATE_FORMAT)
                visit_duration = (dsch_time - adm_time).total_seconds()
                
                # Determine number of provider lines (provider attending instances during visit)
                is_long_visit = visit_duration > 2 * 24 * 3600
                if is_long_visit and random.random() < 0.01:
                    num_provider_lines = random.randint(5, 60)
                else:
                    r = random.random()
                    if r < 0.70:
                        num_provider_lines = 1
                    elif r < 0.90:
                        num_provider_lines = 2
                    else:
                        num_provider_lines = 3

                # Select providers for this visit (target ~70% unique, ~30% repeat)
                # Number of unique providers
                num_unique = max(1, int(num_provider_lines * 0.7))
                num_unique = min(num_unique, len(provider_pool))
                
                unique_pool = random.sample(provider_pool, k=num_unique)
                
                # Ensure all unique providers are used at least once, then fill remainder with repeats
                segment_providers = unique_pool[:]
                while len(segment_providers) < num_provider_lines:
                    segment_providers.append(random.choice(unique_pool))
                
                # Shuffle so the repeats/uniques are distributed randomly
                random.shuffle(segment_providers)

                current_start = adm_time
                
                for i in range(num_provider_lines):
                    # Pick a provider from prepared list
                    prov_id, prov_name = segment_providers[i]
                    
                    is_last = (i == num_provider_lines - 1)
                    if is_last:
                        # 10% chance of gap at end (1h to 24h)
                        gap = random.uniform(3600, 86400) if random.random() > 0.9 else 0
                        raw_end = dsch_time - timedelta(seconds=gap)
                    else:
                        remaining = (dsch_time - current_start).total_seconds()
                        chunk = (remaining / (num_provider_lines - i)) * random.uniform(0.5, 1.5)
                        raw_end = current_start + timedelta(seconds=chunk)
                    
                    # Clamp constraints: >= start+15m, <= dsch_time
                    prov_line_end = min(dsch_time, max(raw_end, current_start + timedelta(minutes=15)))

                    yield {
                        "visit_no": visit["visit_no"],
                        "prov_id": prov_id,
                        "prov_name": prov_name,
                        "attend_start_dtm": current_start.strftime(DATE_FORMAT),
                        "attend_end_dtm": prov_line_end.strftime(DATE_FORMAT),
                        "attend_prov_line": i + 1,
                    }

                    if is_last:
                        break

                    # Prepare start time for NEXT provider line transition                    
                    rand_trans = random.random()
                    if rand_trans < 0.70:
                        # 70% Sequential (next starts exactly when prev ends)
                        next_start = prov_line_end
                    elif rand_trans < 0.85:
                        # 15% Gap (next starts later)
                        gap = random.uniform(3600, 24 * 3600)
                        next_start = prov_line_end + timedelta(seconds=gap)
                    else:
                        # 15% Overlap (next starts earlier)
                        overlap = random.uniform(900, 4 * 3600)
                        next_start = prov_line_end - timedelta(seconds=overlap)
                        # Don't overlap before current segment start (sanity check)
                        if next_start < current_start:
                            next_start = current_start + timedelta(minutes=5)

                    # Ensure next_start doesn't exceed discharge
                    if next_start >= dsch_time - timedelta(minutes=15):
                        break # Stop if no time left
                    
                    current_start = next_start
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

        # Expanded department list with realistic weights for blood-management cohort
        dept_choices = [
            # (name, weight, dept_id, service_code, service_desc)
            ("Emergency Department",       0.08, "DEPT101", "ED",   "Emergency Medicine"),
            ("Radiology",                  0.05, "DEPT102", "RAD",  "Diagnostic Radiology"),
            ("Hematology/Oncology",        0.06, "DEPT103", "HON",  "Hematology/Oncology"),
            ("Cardiology",                 0.10, "DEPT104", "CAR",  "Cardiology"),
            ("Orthopedics",                0.08, "DEPT105", "ORT",  "Orthopedic Surgery"),
            ("Surgical ICU (SICU)",        0.10, "DEPT106", "SIC",  "Surgical Critical Care"),
            ("Medical ICU (MICU)",         0.06, "DEPT107", "MIC",  "Medical Critical Care"),
            ("Operating Room",             0.12, "DEPT108", "OR",   "Surgery"),
            ("PACU",                       0.08, "DEPT109", "PAC",  "Post-Anesthesia Care"),
            ("General Surgery Floor",      0.10, "DEPT110", "SUR",  "General Surgery"),
            ("Labor & Delivery",           0.07, "DEPT111", "OBG",  "Obstetrics/Gynecology"),
            ("Medical/Surgical Floor",     0.10, "DEPT112", "MED",  "General Medicine"),
        ]
        dept_names = [d[0] for d in dept_choices]
        dept_weights = [d[1] for d in dept_choices]
        dept_info = {d[0]: {"id": d[2], "svc_code": d[3], "svc_desc": d[4]} for d in dept_choices}

        # Build a lookup from visit_no -> (adm_dtm, dsch_dtm) for RoomTrace timestamps
        visit_dates = {}
        for _, _, v in visits:
            visit_dates[v["visit_no"]] = (
                datetime.strptime(v["adm_dtm"], DATE_FORMAT),
                datetime.strptime(v["dsch_dtm"], DATE_FORMAT),
            )

        def gen_room_traces():
            for i in range(int(target_roomtraces_count)):
                dept_name = random.choices(dept_names, weights=dept_weights, k=1)[0]
                info = dept_info[dept_name]
                v_no = i % int(target_visits_count + 1)
                if v_no in visit_dates:
                    adm, dsch = visit_dates[v_no]
                    los_hours = max(1, (dsch - adm).total_seconds() / 3600)
                    # Place the room trace somewhere within the visit
                    offset_hours = random.uniform(0, max(0, los_hours - 1))
                    in_dtm = adm + timedelta(hours=offset_hours)
                    duration = random.uniform(0.25, min(3.0, (dsch - in_dtm).total_seconds() / 86400))
                    out_dtm = in_dtm + timedelta(days=duration)
                    if out_dtm > dsch:
                        out_dtm = dsch
                    duration_days = (out_dtm - in_dtm).total_seconds() / 86400
                else:
                    # Fallback for visit_no that wasn't generated
                    in_dtm = datetime(2020, 1, 1, 9, 0, 0)
                    out_dtm = datetime(2020, 1, 2, 9, 0, 0)
                    duration_days = 1.0
                yield {
                    "visit_no": v_no,
                    "department_id": info["id"],
                    "department_name": dept_name,
                    "room_id": f"ROOM{200 + (i % 20)}",
                    "bed_id": f"BED{300 + (i % 30)}",
                    "service_in_c": info["svc_code"],
                    "service_in_desc": info["svc_desc"],
                    "in_dtm": make_aware(in_dtm).strftime(DATE_FORMAT),
                    "out_dtm": make_aware(out_dtm).strftime(DATE_FORMAT),
                    "duration_days": round(duration_days, 2),
                    "bed_room_dept_line": float(i),
                }
        self.send_csv_to_db(gen_room_traces(), fieldnames=room_trace_fieldnames, table_name="RoomTrace")

        self._report_counts()