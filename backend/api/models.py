from django.db import models
from enum import Enum


# Helper Enum classes
class AccessLevel(Enum):
    READER = 'RE'
    WRITER = 'WR'

    @classmethod
    def choices(self):
        return tuple((i.name, i.value) for i in self)


# Actual models
class State(models.Model):
    name = models.CharField(max_length=128, unique=True, default="New State")
    definition = models.TextField()
    owner = models.CharField(max_length=128, default="NA")
    public = models.BooleanField(default=False)


class StateAccess(models.Model):
    state = models.ForeignKey(State, on_delete=models.CASCADE)
    user = models.CharField(max_length=128)
    role = models.CharField(
        max_length=6,
        choices=AccessLevel.choices(),
        default=AccessLevel.READER,
    )

    class Meta:
        unique_together = ['state', 'user']


# Hospital models - not currently used in the app
class BLPD_SANGUINE_PATIENT(models.Model):
    MRN = models.CharField(max_length=20)
    PAT_FAMILY = models.CharField(max_length=30)
    PAT_GIVEN = models.CharField(max_length=30)
    PAT_BIRTHDATE = models.DateField()
    GENDER_CODE = models.CharField(max_length=80)
    RACE_CODE = models.CharField(max_length=80)
    RACE_DESC = models.CharField(max_length=2000)
    ETHNICITY_CODE = models.CharField(max_length=80)
    ETHNICITY_DESC = models.CharField(max_length=2000)
    DEATH_DATE = models.DateField()
    LOAD_DTM = models.DateField()

    class Meta:
        managed = False
        db_table = 'BLOOD_PRODUCTS_DM.BLPD_SANGUINE_PATIENT'


class BLPD_SANGUINE_VISIT(models.Model):
    VISIT_NO = models.DecimalField(max_digits=18, decimal_places=0)
    ADM_DTM = models.DateField()
    DSCH_DTM = models.DateField()
    AGE_AT_ADM = models.FloatField()
    PAT_CLASS_DESC = models.CharField(max_length=2000)
    PAT_TYPE_DESC = models.CharField(max_length=2000)
    PAT_EXPIRED = models.CharField(max_length=1)
    INVASIVE_VENT_F = models.CharField(max_length=1)
    TOTAL_VENT_MINS = models.FloatField()
    TOTAL_VENT_DAYS = models.FloatField()
    APR_DRG_CODE = models.CharField(max_length=254)
    APR_DRG_ROM = models.CharField(max_length=80)
    APR_DRG_SOI = models.CharField(max_length=80)
    APR_DRG_DESC = models.CharField(max_length=2000)
    APR_DRG_WEIGHT = models.FloatField()
    CCI_MI = models.FloatField()
    CCI_CHF = models.FloatField()
    CCI_PVD = models.FloatField()
    CCI_CVD = models.FloatField()
    CCI_DEMENTIA = models.FloatField()
    CCI_COPD = models.FloatField()
    CCI_RHEUM_DZ = models.FloatField()
    CCI_PUD = models.FloatField()
    CCI_LIVER_DZ_MILD = models.FloatField()
    CCI_DM_WO_COMPL = models.FloatField()
    CCI_DM_W_COMPL = models.FloatField()
    CCI_PARAPLEGIA = models.FloatField()
    CCI_RENAL_DZ = models.FloatField()
    CCI_MALIGN_WO_METS = models.FloatField()
    CCI_LIVER_DZ_SEVERE = models.FloatField()
    CCI_MALIGN_W_METS = models.FloatField()
    CCI_HIV_AIDS = models.FloatField()
    CCI_SCORE = models.FloatField()
    LOAD_DTM = models.DateField()

    class Meta:
        managed = False
        db_table = 'BLOOD_PRODUCTS_DM.BLPD_SANGUINE_VISIT'


class BLPD_SANGUINE_BILLING_CODES(models.Model):
    VISIT_NO = models.ForeignKey(BLPD_SANGUINE_VISIT, on_delete=models.CASCADE)
    CODE_TYPE_DESC = models.CharField(max_length=2000)
    CODE = models.CharField(max_length=80)
    CODE_DESC = models.CharField(max_length=2000)
    PROC_DTM = models.DateField()
    PROV_ID = models.CharField(max_length=25)
    PROV_NAME = models.CharField(max_length=100)
    PRESENT_ON_ADM_F = models.CharField(max_length=1)
    CODE_RANK = models.FloatField()
    LOAD_DTM = models.DateField()

    class Meta:
        managed = False
        db_table = 'BLOOD_PRODUCTS_DM.BLPD_SANGUINE_BILLING_CODES'


class BLPD_SANGUINE_SURGERY_CASE(models.Model):
    VISIT_NO = models.ForeignKey(BLPD_SANGUINE_VISIT, on_delete=models.CASCADE)
    MRN = models.ForeignKey(BLPD_SANGUINE_PATIENT, on_delete=models.CASCADE)
    CASE_ID = models.FloatField()
    CASE_DATE = models.DateField()
    SURGERY_START_DTM = models.DateField()
    SURGERY_END_DTM = models.DateField()
    SURGERY_ELAP = models.FloatField()
    SURGERY_TYPE_DESC = models.CharField(max_length=2000)
    SURGEON_PROV_ID = models.CharField(max_length=25)
    SURGEON_PROV_NAME = models.CharField(max_length=100)
    ANESTH_PROV_ID = models.CharField(max_length=25)
    ANESTH_PROV_NAME = models.CharField(max_length=100)
    PRIM_PROC_DESC = models.CharField(max_length=2000)
    POSTOP_ICU_LOS = models.FloatField()
    SCHED_SITE_DESC = models.CharField(max_length=2000)
    ASA_CODE = models.CharField(max_length=80)
    LOAD_DTM = models.DateField()

    class Meta:
        managed = False
        db_table = 'BLOOD_PRODUCTS_DM.BLPD_SANGUINE_SURGERY_CASE'


class BLPD_SANGUINE_VISIT_LABS(models.Model):
    VISIT_NO = models.ForeignKey(BLPD_SANGUINE_VISIT, on_delete=models.CASCADE)
    LAB_ID = models.CharField(max_length=16)
    LAB_DRAW_DTM = models.DateField()
    LAB_PANEL_CODE = models.CharField(max_length=30)
    LAB_PANEL_DESC = models.CharField(max_length=256)
    RESULT_DTM = models.DateField()
    RESULT_CODE = models.CharField(max_length=30)
    RESULT_LOINC = models.CharField(max_length=30)
    RESULT_DESC = models.CharField(max_length=256)
    RESULT_VALUE = models.CharField(max_length=1000)
    UOM_CODE = models.CharField(max_length=30)
    LOWER_LIMIT = models.FloatField()
    UPPER_LIMIT = models.FloatField()
    LOAD_DTM = models.DateField()

    class Meta:
        managed = False
        db_table = 'BLOOD_PRODUCTS_DM.BLPD_SANGUINE_VISIT_LABS'


class BLPD_SANGUINE_INTRAOP_TRANSFUSION(models.Model):
    VISIT_NO = models.ForeignKey(BLPD_SANGUINE_VISIT, on_delete=models.CASCADE)
    TRNSFSN_DTM = models.DateField()
    BLOOD_UNIT_NUMBER = models.CharField(max_length=600)
    PRBC_UNITS = models.FloatField()
    FFP_UNITS = models.FloatField()
    PLT_UNITS = models.FloatField()
    CRYO_UNITS = models.FloatField()
    CELL_SAVER_ML = models.FloatField()
    RBC_VOL = models.FloatField()
    FFP_VOL = models.FloatField()
    PLT_VOL = models.FloatField()
    CRYO_VOL = models.FloatField()
    TRANSFUSION_RANK = models.FloatField()
    LOAD_DTM = models.DateField()

    class Meta:
        managed = False
        db_table = 'BLOOD_PRODUCTS_DM.BLPD_SANGUINE_INTRAOP_TRANSFUSION'


class BLPD_SANGUINE_INTRAOP_MEDS(models.Model):
    VISIT_NO = models.DecimalField(max_digits=18, decimal_places=0)
    CASE_ID = models.ForeignKey(BLPD_SANGUINE_SURGERY_CASE, on_delete=models.CASCADE)
    ORDER_MED_ID = models.DecimalField(max_digits=18, decimal_places=0)
    MED_ADMIN_LINE = models.DecimalField(max_digits=38, decimal_places=0)
    ORDER_DTM = models.DateField()
    MEDICATION_ID = models.DecimalField(max_digits=18, decimal_places=0)
    MEDICATION_NAME = models.CharField(max_length=510)
    ADMIN_DTM = models.DateField()
    ADMIN_DOSE = models.CharField(max_length=184)
    MED_FORM = models.CharField(max_length=50)
    ADMIN_ROUTE_DESC = models.CharField(max_length=254)
    DOSE_UNIT_DESC = models.CharField(max_length=254)
    MED_START_DTM = models.DateField()
    MED_END_DTM = models.DateField()
    LOAD_DTM = models.DateField()

    class Meta:
        managed = False
        db_table = 'BLOOD_PRODUCTS_DM.BLPD_SANGUINE_INTRAOP_MEDS'


class BLPD_SANGUINE_EXTRAOP_MEDS(models.Model):
    VISIT_NO = models.ForeignKey(BLPD_SANGUINE_VISIT, on_delete=models.CASCADE)
    ORDER_MED_ID = models.DecimalField(max_digits=18, decimal_places=0)
    ORDER_DTM = models.DateField()
    MEDICATION_ID = models.DecimalField(max_digits=18, decimal_places=0)
    MEDICATION_NAME = models.CharField(max_length=510)
    MED_ADMIN_LINE = models.DecimalField(max_digits=38, decimal_places=0)
    ADMIN_DTM = models.DateField()
    ADMIN_DOSE = models.CharField(max_length=184)
    MED_FORM = models.CharField(max_length=50)
    ADMIN_ROUTE_DESC = models.CharField(max_length=254)
    DOSE_UNIT_DESC = models.CharField(max_length=254)
    MED_START_DTM = models.DateField()
    MED_END_DTM = models.DateField()
    LOAD_DTM = models.DateField()

    class Meta:
        managed = False
        db_table = 'BLOOD_PRODUCTS_DM.BLPD_SANGUINE_EXTRAOP_MEDS'
