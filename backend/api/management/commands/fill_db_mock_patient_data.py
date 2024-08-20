from datetime import timedelta
from django.core.management.base import BaseCommand
from django.db import connections
from faker import Faker
from faker.providers import date_time
import random

from api.models import (
    PATIENT,
    VISIT,
    SURGERY_CASE,
    BILLING_CODES,
    VISIT_LABS,
    EXTRAOP_MEDS,
    INTRAOP_MEDS,
    INTRAOP_TRANSFUSION,
)


def create_model_table(unmanaged_models, drop_tables):
    connection = connections["hospital"]
    with connection.schema_editor() as schema_editor:
        if drop_tables:
            for model in unmanaged_models:
                try:
                    schema_editor.delete_model(model)
                except Exception as e:
                    print(f"Error dropping table for {model._meta.db_table}: {e}")

        for model in unmanaged_models:
            try:
                schema_editor.create_model(model)
            except Exception as e:
                print(f"Error creating table for {model._meta.db_table}: {e}")

            if (
                model._meta.db_table.lower()
                not in connection.introspection.table_names()
            ):
                raise ValueError(
                    f"Table {model._meta.db_table} is missing in test database. If you meant to drop the table, run the with --drop option."
                )


class Command(BaseCommand):
    help = 'Generate mock data for the database'

    def add_arguments(self, parser):
        parser.add_argument('--drop', action='store_true', help='Drop tables before creating them')

    def handle(self, *args, **kwargs):
        drop_tables = kwargs.get('drop', False)

        # Create the tables for the unmanaged models
        create_model_table([
            PATIENT,
            VISIT,
            SURGERY_CASE,
            BILLING_CODES,
            VISIT_LABS,
            EXTRAOP_MEDS,
            INTRAOP_MEDS,
            INTRAOP_TRANSFUSION
        ], drop_tables)

        # Initialize the Faker object
        Faker.seed(42)
        fake = Faker()
        fake.add_provider(date_time)

        # Initialize the lists to store the generated data
        pats = []
        visits = []
        surgeries = []
        surgeons = [fake.unique.random_number(digits=10) for _ in range(50)]
        anests = [fake.unique.random_number(digits=10) for _ in range(50)]

        # Constants for options that must be chosen together
        race_codes = ['B', 'C', 'I', 'O', 'R', 'U', 'V', 'X']
        race_descs = [
            'American Indian and Alaska Native',
            'Asian',
            'Black or African American',
            'Choose not to disclose',
            'Hispanic/Latino/a/x-Other Hispanic/Latino/a/x',
            'Native Hawaiian and Other Pacific Islander',
            'Unreported/Refused to Report',
            'White or Caucasian',
        ]
        eth_codes = ['H', 'R', 'U', 'W']
        eth_descs = [
            'Choose not to disclose',
            'Hispanic/Latino',
            'Not Hispanic/Latino',
            'Unknown/Information Not Available',
        ]

        # Generate mock data for PATIENT
        for _ in range(100):
            mrn = fake.unique.random_number(digits=10)
            race_idx = random.randint(0, 7)
            eth_idx = random.randint(0, 3)
            patient = PATIENT.objects.create(
                MRN=mrn,
                PAT_FAMILY=fake.last_name(),
                PAT_GIVEN=fake.first_name(),
                PAT_BIRTHDATE=fake.date_of_birth(),
                GENDER_CODE=fake.random_element(elements=('F', 'M', 'NB', 'U', 'X')),
                RACE_CODE=race_codes[race_idx],
                RACE_DESC=race_descs[race_idx],
                ETHNICITY_CODE=eth_codes[eth_idx],
                ETHNICITY_DESC=eth_descs[eth_idx],
                DEATH_DATE=fake.random_element(elements=(fake.date_this_century(), None)),
                LOAD_DTM=fake.date_this_century(),
            )
            pats.append(patient)
        self.stdout.write(self.style.SUCCESS('Successfully generated patient data'))

        # Generate mock data for VISIT
        for pat in pats:
            for _ in range(5):
                visit_no = fake.unique.random_number(digits=10)
                admit_date = fake.date_this_century()
                discharge_date = fake.date_time_between(start_date=admit_date, end_date=admit_date + timedelta(days=10))
                visit = VISIT.objects.create(
                    VISIT_NO=visit_no,
                    ADM_DTM=admit_date,
                    DSCH_DTM=discharge_date,
                    AGE_AT_ADM=fake.random_int(min=5, max=100),
                    PAT_CLASS_DESC=fake.random_element(elements=('EMERGENCY', 'INPATIENT', 'OUTPATIENT')),
                    PAT_TYPE_DESC=fake.random_element(elements=('BEDDED OUTPATIENT', 'DAY SURGERY', 'EMERGENCY', 'INPATIENT', 'NEWBORN', 'OBSERVATION', 'OUTPATIENT', 'TO BE ADMITTED', 'UNI INPATIENT')),
                    PAT_EXPIRED=fake.random_element(elements=('Y', None)),
                    INVASIVE_VENT_F=fake.random_element(elements=('Y', None)),
                    TOTAL_VENT_MINS=fake.random_int(min=0, max=10000),
                    TOTAL_VENT_DAYS=fake.random_int(min=0, max=50),
                    APR_DRG_CODE=fake.random_element(elements=('001', '002', '003')),
                    APR_DRG_ROM=fake.random_element(elements=(1, 2, 3, 4, None)),
                    APR_DRG_SOI=fake.random_element(elements=(1, 2, 3, 4, None)),
                    APR_DRG_DESC=fake.sentence(),
                    APR_DRG_WEIGHT=str(fake.random_int(1, 999)).zfill(3),
                    CCI_MI=fake.random_element(elements=(0, 1, None)),
                    CCI_CHF=fake.random_element(elements=(0, 1, None)),
                    CCI_PVD=fake.random_element(elements=(0, 1, None)),
                    CCI_CVD=fake.random_element(elements=(0, 1, None)),
                    CCI_DEMENTIA=fake.random_element(elements=(0, 1, None)),
                    CCI_COPD=fake.random_element(elements=(0, 1, None)),
                    CCI_RHEUM_DZ=fake.random_element(elements=(0, 1, None)),
                    CCI_PUD=fake.random_element(elements=(0, 1, None)),
                    CCI_LIVER_DZ_MILD=fake.random_element(elements=(0, 1, None)),
                    CCI_DM_WO_COMPL=fake.random_element(elements=(0, 1, None)),
                    CCI_DM_W_COMPL=fake.random_element(elements=(0, 2, None)),
                    CCI_PARAPLEGIA=fake.random_element(elements=(0, 2, None)),
                    CCI_RENAL_DZ=fake.random_element(elements=(0, 2, None)),
                    CCI_MALIGN_WO_METS=fake.random_element(elements=(0, 2, None)),
                    CCI_LIVER_DZ_SEVERE=fake.random_element(elements=(0, 3, None)),
                    CCI_MALIGN_W_METS=fake.random_element(elements=(0, 6, None)),
                    CCI_HIV_AIDS=fake.random_element(elements=(0, 6, None)),
                    CCI_SCORE=fake.random_int(min=0, max=25),
                    LOAD_DTM=fake.date_this_century(),
                )
                visits.append((pat, visit))
        self.stdout.write(self.style.SUCCESS('Successfully generated visit data'))

        # Generate mock data for SURGERY_CASE
        for pat, visit in visits:
            for _ in range(random.randint(1, 5)):
                surg_time = fake.date_between(start_date='-10y', end_date='today')
                surg_start = fake.date_time_between(start_date=surg_time, end_date=surg_time + timedelta(days=1))
                surg_end = fake.date_time_between(start_date=surg_start, end_date=surg_start + timedelta(hours=16))
                surgeries.append((pat, visit, surg_time, surg_start, surg_end))

                SURGERY_CASE.objects.create(
                    VISIT_NO=visit,
                    MRN=pat,
                    CASE_ID=fake.unique.random_number(digits=10),
                    CASE_DATE=surg_time,
                    SURGERY_START_DTM=surg_start,
                    SURGERY_END_DTM=surg_end,
                    SURGERY_ELAP=(surg_end - surg_start).total_seconds() / 60,
                    SURGERY_TYPE_DESC=fake.random_element(elements=('Elective', 'Emergent', 'Trauma Emergent', 'Trauma Urgent', 'Urgent')),
                    SURGEON_PROV_ID=fake.random_element(elements=surgeons),
                    SURGEON_PROV_NAME=fake.name(),
                    ANESTH_PROV_ID=fake.random_element(elements=anests),
                    ANESTH_PROV_NAME=fake.name(),
                    PRIM_PROC_DESC=fake.sentence(),
                    POSTOP_ICU_LOS=fake.random_int(min=0, max=10),
                    SCHED_SITE_DESC=fake.sentence(),
                    ASA_CODE=fake.random_element(elements=('1', '2', '3', '4', '5', '6')),
                    LOAD_DTM=fake.date_this_century(),
                )
        self.stdout.write(self.style.SUCCESS('Successfully generated surgery case data'))

        # Generate mock data for BILLING_CODES
        for surg in surgeries:
            pass

        # Generate mock data for VISIT_LABS
        for visit in visits:
            pass

        # Generate mock data for EXTRAOP_MEDS
        for surg in surgeries:
            pass

        # Generate mock data for INTRAOP_MEDS
        for surg in surgeries:
            pass

        # Generate mock data for INTRAOP_TRANSFUSION
        for surg in surgeries:
            pass

