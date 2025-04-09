from datetime import datetime, timedelta
from django.utils.timezone import make_aware
from django.core.management.base import BaseCommand
from faker import Faker
from faker.providers import date_time
import random

from api.models import (
    Patient,
    Visit,
    SurgeryCase,
    BillingCode,
    Medication,
    Lab,
    Transfusion,
    # AttendingProvider,
    # RoomTrace,
)
from api.views.utils.utils import get_all_cpt_code_filters


class Command(BaseCommand):
    help = "Generate mock data for the database"

    def handle(self, *args, **kwargs):
        # Initialize the Faker object
        Faker.seed(42)
        fake = Faker()
        fake.add_provider(date_time)

        # Initialize the lists to store the generated data
        pats = []
        visits = []
        surgeries = []
        surgeons = [
            (fake.unique.random_number(digits=10), fake.name()) for _ in range(50)
        ]
        anests = [
            (fake.unique.random_number(digits=10), fake.name()) for _ in range(50)
        ]

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

        # Generate mock data for PATIENT
        for _ in range(100):
            mrn = fake.unique.random_number(digits=10)
            race_idx = random.randint(0, 7)
            eth_idx = random.randint(0, 3)
            birthdate = fake.date_of_birth()
            death_date = birthdate + timedelta(
                days=fake.random_int(min=7500, max=35000)
            )
            death_date = (
                death_date if fake.random_element(elements=(True, False)) else None
            )

            patient = Patient.objects.create(
                mrn=mrn,
                last_name=fake.last_name(),
                first_name=fake.first_name(),
                birth_date=birthdate,
                sex_code=fake.random_element(elements=("F", "M", "NB", "U", "X")),
                race_desc=race_descs[race_idx],
                ethnicity_desc=eth_descs[eth_idx],
                death_date=death_date,
            )
            pats.append(patient)
        self.stdout.write(self.style.SUCCESS("Successfully generated patient data"))

        # Generate mock data for VISIT
        for pat in pats:
            for _ in range(5):
                visit_no = fake.unique.random_number(digits=10)
                end_date = pat.death_date if pat.death_date else datetime.now().date()
                admit_date = make_aware(
                    fake.date_time_between(
                        start_date=pat.birth_date,
                        end_date=min(end_date, datetime(2025, 1, 1).date()),
                    )
                )
                discharge_date = make_aware(
                    fake.date_time_between(
                        start_date=admit_date,
                        end_date=min(
                            end_date, (admit_date + timedelta(days=10)).date()
                        ),
                    )
                )
                clinical_los = (
                    discharge_date.date() - admit_date.date()
                ).days
                age_at_adm = (admit_date.date() - pat.birth_date).days // 365
                visit = Visit.objects.create(
                    visit_no=visit_no,
                    mrn=pat,
                    epic_pat_id=fake.unique.random_number(digits=10),
                    hsp_account_id=fake.unique.random_number(digits=10),
                    adm_dtm=admit_date,
                    dsch_dtm=discharge_date,
                    clinical_los=clinical_los,
                    age_at_adm=age_at_adm,
                    pat_class_desc=fake.random_element(
                        elements=("EMERGENCY", "INPATIENT", "OUTPATIENT")
                    ),
                    pat_type_desc=fake.random_element(
                        elements=(
                            "BEDDED OUTPATIENT",
                            "DAY SURGERY",
                            "EMERGENCY",
                            "INPATIENT",
                            "NEWBORN",
                            "OBSERVATION",
                            "OUTPATIENT",
                            "TO BE ADMITTED",
                            "UNI INPATIENT",
                        )
                    ),
                    pat_expired_f=fake.random_element(elements=("Y", None)),
                    invasive_vent_f=fake.random_element(elements=("Y", None)),
                    total_vent_mins=fake.random_int(min=0, max=10000),
                    total_vent_days=fake.random_int(min=0, max=50),
                    apr_drg_code=fake.random_element(elements=("001", "002", "003")),
                    apr_drg_rom=fake.random_element(elements=(1, 2, 3, 4, None)),
                    apr_drg_soi=fake.random_element(elements=(1, 2, 3, 4, None)),
                    apr_drg_desc=fake.sentence(),
                    apr_drg_weight=str(fake.random_int(1, 999)).zfill(3),
                    ms_drg_weight=str(fake.random_int(1, 999)).zfill(3),
                    cci_mi=fake.random_element(elements=(0, 1, None)),
                    cci_chf=fake.random_element(elements=(0, 1, None)),
                    cci_pvd=fake.random_element(elements=(0, 1, None)),
                    cci_cvd=fake.random_element(elements=(0, 1, None)),
                    cci_dementia=fake.random_element(elements=(0, 1, None)),
                    cci_copd=fake.random_element(elements=(0, 1, None)),
                    cci_rheum_dz=fake.random_element(elements=(0, 1, None)),
                    cci_pud=fake.random_element(elements=(0, 1, None)),
                    cci_liver_dz_mild=fake.random_element(elements=(0, 1, None)),
                    cci_dm_wo_compl=fake.random_element(elements=(0, 1, None)),
                    cci_dm_w_compl=fake.random_element(elements=(0, 2, None)),
                    cci_paraplegia=fake.random_element(elements=(0, 2, None)),
                    cci_renal_dz=fake.random_element(elements=(0, 2, None)),
                    cci_malign_wo_mets=fake.random_element(elements=(0, 2, None)),
                    cci_liver_dz_severe=fake.random_element(elements=(0, 3, None)),
                    cci_malign_w_mets=fake.random_element(elements=(0, 6, None)),
                    cci_hiv_aids=fake.random_element(elements=(0, 6, None)),
                    cci_score=fake.random_int(min=0, max=25),
                )
                visits.append((pat, visit))
        self.stdout.write(self.style.SUCCESS("Successfully generated visit data"))

        # Generate mock data for SURGERY_CASE
        for pat, visit in visits:
            surg1_start = visit.adm_dtm + timedelta(hours=2)
            surg2_start = visit.adm_dtm + timedelta(days=1)
            for start_time in [surg1_start, surg2_start]:
                surg_end = make_aware(
                    fake.date_time_between(
                        start_date=start_time, end_date=start_time + timedelta(hours=5)
                    )
                )

                surgeon = fake.random_element(elements=surgeons)
                anesth = fake.random_element(elements=anests)

                surgery = SurgeryCase.objects.create(
                    visit_no=visit,
                    mrn=pat,
                    case_id=fake.unique.random_number(digits=10),
                    case_date=start_time.date(),
                    surgery_start_dtm=start_time,
                    surgery_end_dtm=surg_end,
                    surgery_elap=(surg_end - start_time).total_seconds() / 60,
                    surgery_type_desc=fake.random_element(
                        elements=(
                            "Elective",
                            "Emergent",
                            "Trauma Emergent",
                            "Trauma Urgent",
                            "Urgent",
                        )
                    ),
                    surgeon_prov_id=surgeon[0],
                    surgeon_prov_name=surgeon[1],
                    anesth_prov_id=anesth[0],
                    anesth_prov_name=anesth[1],
                    prim_proc_desc=fake.sentence(),
                    postop_icu_los=fake.random_int(min=0, max=10),
                    sched_site_desc=fake.sentence(),
                    asa_code=fake.random_element(
                        elements=("1", "2", "3", "4", "5", "6")
                    ),
                )
                surgeries.append(surgery)
        self.stdout.write(
            self.style.SUCCESS("Successfully generated surgery case data")
        )

        # Generate mock data for BILLING_CODES
        codes, _, _ = get_all_cpt_code_filters()
        for surg in surgeries:
            for rank in range(random.randint(1, 5)):
                BillingCode.objects.create(
                    visit_no=surg.visit_no,
                    cpt_code=fake.random_element(elements=codes),
                    cpt_code_desc=fake.sentence(),
                    proc_dtm=surg.surgery_start_dtm,
                    prov_id=surg.surgeon_prov_id,
                    prov_name=surg.surgeon_prov_name,
                    code_rank=rank,
                )
        self.stdout.write(
            self.style.SUCCESS("Successfully generated billing codes data")
        )

        # Generate mock data for VISIT_LABS
        result_desc_options = ["HGB", "Hemoglobin"]
        for pat, visit in visits:
            for _ in range(random.randint(1, 5)):
                draw_dtm = make_aware(
                    fake.date_time_between(
                        start_date=visit.adm_dtm, end_date=visit.dsch_dtm,
                    )
                )
                Lab.objects.create(
                    visit_no=visit,
                    mrn=pat,
                    lab_id=fake.unique.random_number(digits=10),
                    lab_draw_dtm=draw_dtm,
                    lab_panel_code=fake.unique.random_number(digits=10),
                    lab_panel_desc=fake.sentence(),
                    result_dtm=draw_dtm + timedelta(hours=random.randint(1, 12)),
                    result_code=fake.unique.random_number(digits=10),
                    result_loinc=fake.unique.random_number(digits=10),
                    result_desc=fake.random_element(elements=result_desc_options),
                    result_value=fake.pydecimal(
                        left_digits=2,
                        right_digits=1,
                        positive=True,
                        min_value=5,
                        max_value=20,
                    ),
                    uom_code=fake.random_element(elements=("g/dL", "g/L")),
                    lower_limit=12,
                    upper_limit=18,
                )
        for surg in surgeries:
            ten_min_before_surg = surg.surgery_start_dtm - timedelta(minutes=10)
            five_min_before_surg = surg.surgery_start_dtm - timedelta(minutes=5)
            five_min_after_surg = surg.surgery_end_dtm + timedelta(minutes=5)
            ten_min_before_surg = surg.surgery_end_dtm + timedelta(minutes=10)
            for time in [
                ten_min_before_surg,
                five_min_before_surg,
                five_min_after_surg,
                ten_min_before_surg,
            ]:
                Lab.objects.create(
                    visit_no=surg.visit_no,
                    mrn=pat,
                    lab_id=fake.unique.random_number(digits=10),
                    lab_draw_dtm=time,
                    lab_panel_code=fake.unique.random_number(digits=10),
                    lab_panel_desc=fake.sentence(),
                    result_dtm=time + timedelta(minutes=random.randint(1, 15)),
                    result_code=fake.unique.random_number(digits=10),
                    result_loinc=fake.unique.random_number(digits=10),
                    result_desc=fake.random_element(elements=result_desc_options),
                    result_value=fake.pydecimal(
                        left_digits=2,
                        right_digits=1,
                        positive=True,
                        min_value=5,
                        max_value=20,
                    ),
                    uom_code=fake.random_element(elements=("g/dL", "g/L")),
                    lower_limit=12,
                    upper_limit=18,
                )
        self.stdout.write(self.style.SUCCESS("Successfully generated visit labs data"))

        # Generate mock data for EXTRAOP_MEDS
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
        for surg in surgeries:
            order_dtm = make_aware(
                fake.date_time_between(
                    start_date=surg.visit_no.adm_dtm, end_date=surg.visit_no.dsch_dtm
                )
            )
            admin_dtm = order_dtm + timedelta(minutes=fake.random_int(min=1, max=120))
            for i in range(random.randint(1, 5)):
                Medication.objects.create(
                    visit_no=surg.visit_no,
                    order_med_id=fake.unique.random_number(digits=10),
                    order_dtm=order_dtm,
                    medication_id=fake.unique.random_number(digits=10),
                    medication_name=fake.random_element(elements=med_types),
                    med_admin_line=fake.random_int(min=1, max=4),
                    admin_dtm=admin_dtm,
                    admin_dose=fake.pydecimal(
                        left_digits=2,
                        right_digits=1,
                        positive=True,
                        min_value=0.1,
                        max_value=10,
                    ),
                    med_form=fake.random_element(
                        elements=("tablet", "capsule", "injection", "syrup")
                    ),
                    admin_route_desc=fake.random_element(
                        elements=(
                            "oral",
                            "intravenous",
                            "intramuscular",
                            "subcutaneous",
                        )
                    ),
                    dose_unit_desc=fake.random_element(
                        elements=("mg", "g", "mL", "unit")
                    ),
                    med_start_dtm=admin_dtm,
                    med_end_dtm=admin_dtm + timedelta(hours=fake.random_int(min=1, max=12)),
                )
        self.stdout.write(
            self.style.SUCCESS("Successfully generated extraop meds data")
        )

        # Generate mock data for INTRAOP_MEDS
        for surg in surgeries:
            order_dtm = make_aware(
                fake.date_time_between(
                    start_date=surg.visit_no.adm_dtm, end_date=surg.visit_no.dsch_dtm
                )
            )
            admin_dtm = order_dtm + timedelta(minutes=fake.random_int(min=1, max=120))
            Medication.objects.create(
                visit_no=surg.visit_no,
                order_med_id=fake.unique.random_number(digits=10),
                order_dtm=order_dtm,
                medication_id=fake.unique.random_number(digits=10),
                medication_name=fake.random_element(elements=med_types),
                med_admin_line=fake.random_int(min=1, max=4),
                admin_dtm=admin_dtm,
                admin_dose=fake.pydecimal(
                    left_digits=2,
                    right_digits=1,
                    positive=True,
                    min_value=0.1,
                    max_value=10,
                ),
                med_form=fake.random_element(
                    elements=("tablet", "capsule", "injection", "syrup")
                ),
                admin_route_desc=fake.random_element(
                    elements=("oral", "intravenous", "intramuscular", "subcutaneous")
                ),
                dose_unit_desc=fake.random_element(elements=("mg", "g", "mL", "unit")),
                med_start_dtm=admin_dtm,
                med_end_dtm=admin_dtm + timedelta(hours=fake.random_int(min=1, max=12)),
            )
        self.stdout.write(
            self.style.SUCCESS("Successfully generated intraop meds data")
        )

        # Generate mock data for INTRAOP_TRANSFUSION
        for surg in surgeries:
            for rank in range(random.randint(1, 5)):
                rbcs = fake.random_element(elements=(0, fake.random_int(min=0, max=7)))
                ffp = fake.random_element(elements=(0, fake.random_int(min=0, max=7)))
                plt = fake.random_element(elements=(0, fake.random_int(min=0, max=7)))
                cryo = fake.random_element(elements=(0, fake.random_int(min=0, max=12)))
                whole = fake.random_element(elements=(0, fake.random_int(min=0, max=7)))
                type = fake.random_element(elements=("unit", "vol"))

                Transfusion.objects.create(
                    visit_no=surg.visit_no,
                    trnsfsn_dtm=make_aware(
                        fake.date_time_between(
                            start_date=surg.surgery_start_dtm,
                            end_date=surg.surgery_end_dtm,
                        )
                    ),
                    transfusion_rank=rank,
                    blood_unit_number=fake.unique.random_number(digits=10),
                    rbc_units=rbcs if type == "unit" else None,
                    ffp_units=ffp if type == "unit" else None,
                    plt_units=plt if type == "unit" else None,
                    cryo_units=cryo if type == "unit" else None,
                    whole_units=whole if type == "unit" else None,
                    rbc_vol=rbcs * 250 if type == "vol" else None,
                    ffp_vol=ffp * 220 if type == "vol" else None,
                    plt_vol=plt * 300 if type == "vol" else None,
                    cryo_vol=cryo * 75 if type == "vol" else None,
                    whole_vol=whole * 450 if type == "vol" else None,
                    cell_saver_ml=fake.random_int(min=0, max=1000),
                )
        self.stdout.write(
            self.style.SUCCESS("Successfully generated intraop transfusion data")
        )
