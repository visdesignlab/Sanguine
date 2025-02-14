from django.conf import settings
from django.db import models
from enum import Enum


# Helper Enum classes
class AccessLevel(Enum):
    READER = 'RE'
    WRITER = 'WR'

    @classmethod
    def choices(self):
        return tuple((i.name, i.value) for i in self)


class SanguineManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().using('hospital')


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


class PATIENT(models.Model):
    MRN = models.BigIntegerField(primary_key=True)
    PAT_FAMILY = models.CharField(max_length=30)
    PAT_GIVEN = models.CharField(max_length=30)
    PAT_BIRTHDATE = models.DateField()
    GENDER_CODE = models.CharField(max_length=80)
    RACE_CODE = models.CharField(max_length=80)
    RACE_DESC = models.CharField(max_length=2000)
    ETHNICITY_CODE = models.CharField(max_length=80)
    ETHNICITY_DESC = models.CharField(max_length=2000)
    DEATH_DATE = models.DateField(null=True)
    LOAD_DTM = models.DateField()

    objects = SanguineManager()
    use_hospital_db = True

    class Meta:
        managed = False
        db_table = 'SANG_PATIENT' if settings.IS_TESTING else 'BLOOD_PRODUCTS_DM.BLPD_SANGUINE_PATIENT'


class VISIT(models.Model):
    VISIT_NO = models.BigIntegerField(primary_key=True)
    ADM_DTM = models.DateField()
    DSCH_DTM = models.DateField()
    AGE_AT_ADM = models.FloatField()
    PAT_CLASS_DESC = models.CharField(max_length=2000)
    PAT_TYPE_DESC = models.CharField(max_length=2000)
    PAT_EXPIRED = models.CharField(max_length=1)
    INVASIVE_VENT_F = models.CharField(max_length=1, null=True)
    TOTAL_VENT_MINS = models.FloatField()
    TOTAL_VENT_DAYS = models.FloatField()
    APR_DRG_CODE = models.CharField(max_length=254)
    APR_DRG_ROM = models.CharField(max_length=80)
    APR_DRG_SOI = models.CharField(max_length=80)
    APR_DRG_DESC = models.CharField(max_length=2000)
    APR_DRG_WEIGHT = models.FloatField()
    CCI_MI = models.FloatField(null=True)
    CCI_CHF = models.FloatField(null=True)
    CCI_PVD = models.FloatField(null=True)
    CCI_CVD = models.FloatField(null=True)
    CCI_DEMENTIA = models.FloatField(null=True)
    CCI_COPD = models.FloatField(null=True)
    CCI_RHEUM_DZ = models.FloatField(null=True)
    CCI_PUD = models.FloatField(null=True)
    CCI_LIVER_DZ_MILD = models.FloatField(null=True)
    CCI_DM_WO_COMPL = models.FloatField(null=True)
    CCI_DM_W_COMPL = models.FloatField(null=True)
    CCI_PARAPLEGIA = models.FloatField(null=True)
    CCI_RENAL_DZ = models.FloatField(null=True)
    CCI_MALIGN_WO_METS = models.FloatField(null=True)
    CCI_LIVER_DZ_SEVERE = models.FloatField(null=True)
    CCI_MALIGN_W_METS = models.FloatField(null=True)
    CCI_HIV_AIDS = models.FloatField(null=True)
    CCI_SCORE = models.FloatField(null=True)
    LOAD_DTM = models.DateField()

    objects = SanguineManager()
    use_hospital_db = True

    class Meta:
        managed = False
        db_table = 'SANG_VISIT' if settings.IS_TESTING else 'BLOOD_PRODUCTS_DM.BLPD_SANGUINE_VISIT'


class SURGERY_CASE(models.Model):
    VISIT_NO = models.ForeignKey(VISIT, on_delete=models.CASCADE, db_column='VISIT_NO')
    MRN = models.ForeignKey(PATIENT, on_delete=models.CASCADE, db_column='MRN')
    CASE_ID = models.BigIntegerField(primary_key=True)
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

    objects = SanguineManager()
    use_hospital_db = True

    class Meta:
        managed = False
        db_table = 'SANG_SURGERY_CASE' if settings.IS_TESTING else 'BLOOD_PRODUCTS_DM.BLPD_SANGUINE_SURGERY_CASE'


class BILLING_CODES(models.Model):
    VISIT_NO = models.ForeignKey(VISIT, on_delete=models.CASCADE, db_column='VISIT_NO')
    CODE_TYPE_DESC = models.CharField(max_length=2000)
    CODE = models.CharField(max_length=80)
    CODE_DESC = models.CharField(max_length=2000)
    PROC_DTM = models.DateField()
    PROV_ID = models.CharField(max_length=25)
    PROV_NAME = models.CharField(max_length=100)
    PRESENT_ON_ADM_F = models.CharField(max_length=1, null=True)
    CODE_RANK = models.FloatField()
    LOAD_DTM = models.DateField()

    objects = SanguineManager()
    use_hospital_db = True

    class Meta:
        managed = False
        db_table = 'SANG_BILLING_CODES' if settings.IS_TESTING else 'BLOOD_PRODUCTS_DM.BLPD_SANGUINE_BILLING_CODES'


class VISIT_LABS(models.Model):
    VISIT_NO = models.ForeignKey(VISIT, on_delete=models.CASCADE, db_column='VISIT_NO')
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

    objects = SanguineManager()
    use_hospital_db = True

    class Meta:
        managed = False
        db_table = 'SANG_VISIT_LABS' if settings.IS_TESTING else 'BLOOD_PRODUCTS_DM.BLPD_SANGUINE_VISIT_LABS'


class INTRAOP_TRANSFUSION(models.Model):
    CASE_ID = models.ForeignKey(SURGERY_CASE, on_delete=models.CASCADE, db_column='CASE_ID')
    VISIT_NO = models.ForeignKey(VISIT, on_delete=models.CASCADE, db_column='VISIT_NO')
    TRNSFSN_DTM = models.DateField()
    BLOOD_UNIT_NUMBER = models.CharField(max_length=600)
    PRBC_UNITS = models.FloatField(null=True)
    FFP_UNITS = models.FloatField(null=True)
    PLT_UNITS = models.FloatField(null=True)
    CRYO_UNITS = models.FloatField(null=True)
    CELL_SAVER_ML = models.FloatField(null=True)
    RBC_VOL = models.FloatField(null=True)
    FFP_VOL = models.FloatField(null=True)
    PLT_VOL = models.FloatField(null=True)
    CRYO_VOL = models.FloatField(null=True)
    TRANSFUSION_RANK = models.FloatField()
    LOAD_DTM = models.DateField()

    objects = SanguineManager()
    use_hospital_db = True

    class Meta:
        managed = False
        db_table = 'SANG_INTRAOP_TRANSFUSION' if settings.IS_TESTING else 'BLOOD_PRODUCTS_DM.BLPD_SANGUINE_INTRAOP_TRANSFUSION'


class INTRAOP_MEDS(models.Model):
    VISIT_NO = models.ForeignKey(VISIT, on_delete=models.CASCADE, db_column='VISIT_NO')
    CASE_ID = models.ForeignKey(SURGERY_CASE, on_delete=models.CASCADE, db_column='CASE_ID')
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

    objects = SanguineManager()
    use_hospital_db = True

    class Meta:
        managed = False
        db_table = 'SANG_INTRAOP_MEDS' if settings.IS_TESTING else 'BLOOD_PRODUCTS_DM.BLPD_SANGUINE_INTRAOP_MEDS'


class EXTRAOP_MEDS(models.Model):
    VISIT_NO = models.ForeignKey(VISIT, on_delete=models.CASCADE, db_column='VISIT_NO')
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

    objects = SanguineManager()
    use_hospital_db = True

    class Meta:
        managed = False
        db_table = 'SANG_EXTRAOP_MEDS' if settings.IS_TESTING else 'BLOOD_PRODUCTS_DM.BLPD_SANGUINE_EXTRAOP_MEDS'
