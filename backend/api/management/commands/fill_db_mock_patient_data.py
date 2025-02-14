from datetime import datetime, timedelta
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
from api.views.utils.utils import get_all_cpt_code_filters


def create_model_table(unmanaged_models, drop_tables):
    connection = connections["hospital"]
    with connection.schema_editor() as schema_editor:
        if drop_tables:
            for model in unmanaged_models:
                try:
                    model.objects.all().delete()
                    schema_editor.delete_model(model)
                except Exception as e:
                    print(f"Error dropping table for {model._meta.db_table}: {e}")

        for model in unmanaged_models:
            try:
                schema_editor.create_model(model)
            except Exception as e:
                print(f"Error creating table for {model._meta.db_table}: {e}")

            table_names_in_db = [x.lower() for x in connection.introspection.table_names()]
            if (
                model._meta.db_table.lower()
                not in table_names_in_db
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
            BILLING_CODES,
            VISIT_LABS,
            EXTRAOP_MEDS,
            INTRAOP_MEDS,
            INTRAOP_TRANSFUSION,
            SURGERY_CASE,
            VISIT,
            PATIENT,
        ], drop_tables)

        # Initialize the Faker object
        Faker.seed(42)
        fake = Faker()
        fake.add_provider(date_time)

        # Initialize the lists to store the generated data
        pats = []
        visits = []
        surgeries = []
        surgeons = [(fake.unique.random_number(digits=10), fake.name()) for _ in range(50)]
        anests = [(fake.unique.random_number(digits=10), fake.name()) for _ in range(50)]

        # Constants for options that must be chosen together
        race_codes = ['B', 'C', 'I', 'O', 'R', 'U', 'V', 'X']
        race_descs = [
            'Black or African American',
            'White or Caucasian',
            'American Indian and Alaska Native',
            'Hispanic/Latino/a/x-Other Hispanic/Latino/a/x',
            'Choose not to disclose',
            'Unreported/Refused to Report',
            'Native Hawaiian and Other Pacific Islander',
            'Asian',
        ]
        eth_codes = ['H', 'R', 'U', 'W']
        eth_descs = [
            'Hispanic/Latino',
            'Choose not to disclose',
            'Unknown/Information Not Available',
            'Not Hispanic/Latino',
        ]

        # Generate mock data for PATIENT
        for _ in range(100):
            mrn = fake.unique.random_number(digits=10)
            race_idx = random.randint(0, 7)
            eth_idx = random.randint(0, 3)
            birthdate = fake.date_of_birth()
            death_date = birthdate + timedelta(days=fake.random_int(min=7500, max=35000))
            death_date = death_date if fake.random_element(elements=(True, False)) else None
            patient = PATIENT.objects.create(
                MRN=mrn,
                PAT_FAMILY=fake.last_name(),
                PAT_GIVEN=fake.first_name(),
                PAT_BIRTHDATE=birthdate,
                GENDER_CODE=fake.random_element(elements=('F', 'M', 'NB', 'U', 'X')),
                RACE_CODE=race_codes[race_idx],
                RACE_DESC=race_descs[race_idx],
                ETHNICITY_CODE=eth_codes[eth_idx],
                ETHNICITY_DESC=eth_descs[eth_idx],
                DEATH_DATE=death_date,
                LOAD_DTM=fake.date_this_century(),
            )
            pats.append(patient)
        self.stdout.write(self.style.SUCCESS('Successfully generated patient data'))

        # Generate mock data for VISIT
        for pat in pats:
            for _ in range(5):
                visit_no = fake.unique.random_number(digits=10)
                end_date = pat.DEATH_DATE if pat.DEATH_DATE else datetime.now().date()
                admit_date = fake.date_time_between(start_date=pat.PAT_BIRTHDATE, end_date=min(end_date, datetime(2025, 1, 1).date()))
                discharge_date = fake.date_time_between(start_date=admit_date, end_date=min(end_date, (admit_date + timedelta(days=10)).date()))
                age_at_adm = (admit_date.date() - pat.PAT_BIRTHDATE).days // 365
                visit = VISIT.objects.create(
                    VISIT_NO=visit_no,
                    ADM_DTM=admit_date,
                    DSCH_DTM=discharge_date,
                    AGE_AT_ADM=age_at_adm,
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
                surg_start = fake.date_time_between(start_date=visit.ADM_DTM, end_date=visit.ADM_DTM + timedelta(days=1))
                surg_end = fake.date_time_between(start_date=surg_start, end_date=surg_start + timedelta(hours=16))

                surgeon = fake.random_element(elements=surgeons)
                anesth = fake.random_element(elements=anests)

                surgery = SURGERY_CASE.objects.create(
                    VISIT_NO=visit,
                    MRN=pat,
                    CASE_ID=fake.unique.random_number(digits=10),
                    CASE_DATE=surg_start.date(),
                    SURGERY_START_DTM=surg_start,
                    SURGERY_END_DTM=surg_end,
                    SURGERY_ELAP=(surg_end - surg_start).total_seconds() / 60,
                    SURGERY_TYPE_DESC=fake.random_element(elements=('Elective', 'Emergent', 'Trauma Emergent', 'Trauma Urgent', 'Urgent')),
                    SURGEON_PROV_ID=surgeon[0],
                    SURGEON_PROV_NAME=surgeon[1],
                    ANESTH_PROV_ID=anesth[0],
                    ANESTH_PROV_NAME=anesth[1],
                    PRIM_PROC_DESC=fake.sentence(),
                    POSTOP_ICU_LOS=fake.random_int(min=0, max=10),
                    SCHED_SITE_DESC=fake.sentence(),
                    ASA_CODE=fake.random_element(elements=('1', '2', '3', '4', '5', '6')),
                    LOAD_DTM=fake.date_this_century(),
                )
                surgeries.append(surgery)
        self.stdout.write(self.style.SUCCESS('Successfully generated surgery case data'))

        # Generate mock data for BILLING_CODES
        codes, _, _ = get_all_cpt_code_filters()
        for surg in surgeries:
            for rank in range(random.randint(1, 5)):
                BILLING_CODES.objects.create(
                    VISIT_NO=surg.VISIT_NO,
                    CODE_TYPE_DESC=fake.sentence(),
                    CODE=fake.random_element(elements=codes),
                    CODE_DESC=fake.sentence(),
                    PROC_DTM=surg.SURGERY_START_DTM,
                    PROV_ID=surg.SURGEON_PROV_ID,
                    PROV_NAME=surg.SURGEON_PROV_NAME,
                    PRESENT_ON_ADM_F=fake.random_element(elements=('Y', None)),
                    CODE_RANK=rank,
                    LOAD_DTM=fake.date_this_century(),
                )
        self.stdout.write(self.style.SUCCESS('Successfully generated billing codes data'))

        # Generate mock data for VISIT_LABS
        result_desc_options = ['HGB', 'Hemoglobin']
        for pat, visit in visits:
            for _ in range(random.randint(1, 5)):
                draw_dtm = fake.date_time_between(start_date=visit.ADM_DTM, end_date=visit.DSCH_DTM)
                VISIT_LABS.objects.create(
                    VISIT_NO=visit,
                    LAB_ID=fake.unique.random_number(digits=10),
                    LAB_DRAW_DTM=draw_dtm,
                    LAB_PANEL_CODE=fake.unique.random_number(digits=10),
                    LAB_PANEL_DESC=fake.sentence(),
                    RESULT_DTM=draw_dtm + timedelta(hours=random.randint(1, 12)),
                    RESULT_CODE=fake.unique.random_number(digits=10),
                    RESULT_LOINC=fake.unique.random_number(digits=10),
                    RESULT_DESC=fake.random_element(elements=result_desc_options),
                    RESULT_VALUE=fake.pydecimal(left_digits=2, right_digits=1, positive=True, min_value=5, max_value=20),
                    UOM_CODE=fake.random_element(elements=('g/dL', 'g/L')),
                    LOWER_LIMIT=12,
                    UPPER_LIMIT=18,
                    LOAD_DTM=fake.date_this_century(),
                )
        self.stdout.write(self.style.SUCCESS('Successfully generated visit labs data'))

        # Generate mock data for EXTRAOP_MEDS
        med_types = ['TXA', 'B12', 'AMICAR', 'tranexamic acid', 'vitamin B12', 'aminocaproic acid', 'iron', 'ferrous sulfate', 'ferric carboxymaltose']
        for surg in surgeries:
            order_dtm = fake.date_time_between(start_date=surg.VISIT_NO.ADM_DTM, end_date=surg.VISIT_NO.DSCH_DTM)
            admin_dtm = order_dtm + timedelta(minutes=fake.random_int(min=1, max=120))
            for i in range(random.randint(1, 5)):
                EXTRAOP_MEDS.objects.create(
                    VISIT_NO=surg.VISIT_NO,
                    ORDER_MED_ID=fake.unique.random_number(digits=10),
                    ORDER_DTM=fake.date_time_between(start_date=surg.VISIT_NO.ADM_DTM, end_date=surg.VISIT_NO.DSCH_DTM),
                    MEDICATION_ID=fake.unique.random_number(digits=10),
                    MEDICATION_NAME=fake.random_element(elements=med_types),
                    MED_ADMIN_LINE=fake.random_int(min=1, max=4),
                    ADMIN_DTM=admin_dtm,
                    ADMIN_DOSE=fake.pydecimal(left_digits=2, right_digits=1, positive=True, min_value=0.1, max_value=10),
                    MED_FORM=fake.random_element(elements=('tablet', 'capsule', 'injection', 'syrup')),
                    ADMIN_ROUTE_DESC=fake.random_element(elements=('oral', 'intravenous', 'intramuscular', 'subcutaneous')),
                    DOSE_UNIT_DESC=fake.random_element(elements=('mg', 'g', 'mL', 'unit')),
                    MED_START_DTM=admin_dtm,
                    MED_END_DTM=admin_dtm + timedelta(hours=fake.random_int(min=1, max=12)),
                    LOAD_DTM=fake.date_this_century(),
                )
        self.stdout.write(self.style.SUCCESS('Successfully generated extraop meds data'))

        # Generate mock data for INTRAOP_MEDS
        for surg in surgeries:
            order_dtm = fake.date_time_between(start_date=surg.VISIT_NO.ADM_DTM, end_date=surg.VISIT_NO.DSCH_DTM)
            admin_dtm = order_dtm + timedelta(minutes=fake.random_int(min=1, max=120))
            INTRAOP_MEDS.objects.create(
                VISIT_NO=surg.VISIT_NO,
                CASE_ID=surg,
                ORDER_MED_ID=fake.unique.random_number(digits=10),
                ORDER_DTM=fake.date_time_between(start_date=surg.VISIT_NO.ADM_DTM, end_date=surg.VISIT_NO.DSCH_DTM),
                MEDICATION_ID=fake.unique.random_number(digits=10),
                MEDICATION_NAME=fake.random_element(elements=med_types),
                MED_ADMIN_LINE=fake.random_int(min=1, max=4),
                ADMIN_DTM=admin_dtm,
                ADMIN_DOSE=fake.pydecimal(left_digits=2, right_digits=1, positive=True, min_value=0.1, max_value=10),
                MED_FORM=fake.random_element(elements=('tablet', 'capsule', 'injection', 'syrup')),
                ADMIN_ROUTE_DESC=fake.random_element(elements=('oral', 'intravenous', 'intramuscular', 'subcutaneous')),
                DOSE_UNIT_DESC=fake.random_element(elements=('mg', 'g', 'mL', 'unit')),
                MED_START_DTM=admin_dtm,
                MED_END_DTM=admin_dtm + timedelta(hours=fake.random_int(min=1, max=12)),
                LOAD_DTM=fake.date_this_century(),
            )
        self.stdout.write(self.style.SUCCESS('Successfully generated intraop meds data'))

        # Generate mock data for INTRAOP_TRANSFUSION
        for surg in surgeries:
            for rank in range(random.randint(1, 5)):
                rbcs = fake.random_element(elements=(0, fake.random_int(min=0, max=7)))
                ffp = fake.random_element(elements=(0, fake.random_int(min=0, max=7)))
                plt = fake.random_element(elements=(0, fake.random_int(min=0, max=7)))
                cryo = fake.random_element(elements=(0, fake.random_int(min=0, max=12)))
                type = fake.random_element(elements=('unit', 'vol'))

                INTRAOP_TRANSFUSION.objects.create(
                    CASE_ID=surg,
                    VISIT_NO=surg.VISIT_NO,
                    TRNSFSN_DTM=fake.date_time_between(start_date=surg.SURGERY_START_DTM, end_date=surg.SURGERY_END_DTM),
                    BLOOD_UNIT_NUMBER=fake.unique.random_number(digits=10),
                    PRBC_UNITS=rbcs if type == 'unit' else None,
                    FFP_UNITS=ffp if type == 'unit' else None,
                    PLT_UNITS=plt if type == 'unit' else None,
                    CRYO_UNITS=cryo if type == 'unit' else None,
                    CELL_SAVER_ML=fake.random_int(min=0, max=1000),
                    RBC_VOL=rbcs * 250 if type == 'vol' else None,
                    FFP_VOL=ffp * 220 if type == 'vol' else None,
                    PLT_VOL=plt * 300 if type == 'vol' else None,
                    CRYO_VOL=cryo * 75 if type == 'vol' else None,
                    TRANSFUSION_RANK=rank,
                    LOAD_DTM=fake.date_this_century(),
                )
        self.stdout.write(self.style.SUCCESS('Successfully generated intraop transfusion data'))
