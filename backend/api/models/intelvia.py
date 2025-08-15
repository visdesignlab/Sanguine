from django.db import models


#added for oracle
class SanguineManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().using('hospital')


class Patient(models.Model):
    mrn = models.CharField(max_length=20, primary_key=True)
    last_name = models.CharField(max_length=30)
    first_name = models.CharField(max_length=30)
    birth_date = models.DateField()
    sex_code = models.CharField(max_length=80)
    race_desc = models.CharField(max_length=80)
    ethnicity_desc = models.CharField(max_length=2000)
    death_date = models.DateField(null=True)

    objects = SanguineManager()
    use_hospital_db = True
    class Meta:
        db_table = "BLOOD_PRODUCTS_DM.INTELVIA_CL_PATIENT"


class Visit(models.Model):
    visit_no = models.BigIntegerField(primary_key=True)
    mrn = models.ForeignKey(Patient, on_delete=models.CASCADE, db_column="mrn")
    epic_pat_id = models.CharField(max_length=80)
    hsp_account_id = models.CharField(max_length=80)
    adm_dtm = models.DateField()
    dsch_dtm = models.DateField()
    clinical_los = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    age_at_adm = models.FloatField()
    pat_class_desc = models.CharField(max_length=2000)
    pat_type_desc = models.CharField(max_length=2000)
    pat_expired_f = models.CharField(max_length=1, null=True)
    invasive_vent_f = models.CharField(max_length=1, null=True)
    total_vent_mins = models.FloatField()
    total_vent_days = models.FloatField()
    apr_drg_code = models.CharField(max_length=254)
    apr_drg_rom = models.CharField(max_length=80, null=True)
    apr_drg_soi = models.CharField(max_length=80, null=True)
    apr_drg_desc = models.CharField(max_length=2000)
    apr_drg_weight = models.FloatField()
    ms_drg_weight = models.FloatField()
    cci_mi = models.FloatField(null=True)
    cci_chf = models.FloatField(null=True)
    cci_pvd = models.FloatField(null=True)
    cci_cvd = models.FloatField(null=True)
    cci_dementia = models.FloatField(null=True)
    cci_copd = models.FloatField(null=True)
    cci_rheum_dz = models.FloatField(null=True)
    cci_pud = models.FloatField(null=True)
    cci_liver_dz_mild = models.FloatField(null=True)
    cci_dm_wo_compl = models.FloatField(null=True)
    cci_dm_w_compl = models.FloatField(null=True)
    cci_paraplegia = models.FloatField(null=True)
    cci_renal_dz = models.FloatField(null=True)
    cci_malign_wo_mets = models.FloatField(null=True)
    cci_liver_dz_severe = models.FloatField(null=True)
    cci_malign_w_mets = models.FloatField(null=True)
    cci_hiv_aids = models.FloatField(null=True)
    cci_score = models.FloatField(null=True)

    objects = SanguineManager()
    use_hospital_db = True
    class Meta:
        db_table = "BLOOD_PRODUCTS_DM.INTELVIA_CL_VISIT"


class SurgeryCase(models.Model):
    visit_no = models.ForeignKey(Visit, on_delete=models.CASCADE, db_column="visit_no")
    mrn = models.ForeignKey(Patient, on_delete=models.CASCADE, db_column="mrn")
    case_id = models.BigIntegerField(primary_key=True)
    case_date = models.DateField()
    surgery_start_dtm = models.DateTimeField()
    surgery_end_dtm = models.DateTimeField()
    surgery_elap = models.FloatField()
    surgery_type_desc = models.CharField(max_length=2000)
    surgeon_prov_id = models.CharField(max_length=25)
    surgeon_prov_name = models.CharField(max_length=100)
    anesth_prov_id = models.CharField(max_length=25)
    anesth_prov_name = models.CharField(max_length=100)
    prim_proc_desc = models.CharField(max_length=2000)
    postop_icu_los = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    sched_site_desc = models.CharField(max_length=2000)
    asa_code = models.CharField(max_length=80)

    objects = SanguineManager()
    use_hospital_db = True
    class Meta:
        db_table = "BLOOD_PRODUCTS_DM.INTELVIA_CL_SURGERY_CASE"


class BillingCode(models.Model):
    visit_no = models.ForeignKey(Visit, on_delete=models.CASCADE, db_column="visit_no")
    cpt_code = models.CharField(max_length=80)
    cpt_code_desc = models.CharField(max_length=2000)
    proc_dtm = models.DateTimeField()
    prov_id = models.CharField(max_length=25)
    prov_name = models.CharField(max_length=100)
    code_rank = models.FloatField()

    objects = SanguineManager()
    use_hospital_db = True
    class Meta:
        db_table = "BLOOD_PRODUCTS_DM.INTELVIA_CL_BILLING_CODES"


class Medication(models.Model):
    visit_no = models.ForeignKey(Visit, on_delete=models.CASCADE, db_column="visit_no")
    order_med_id = models.DecimalField(max_digits=18, decimal_places=0)
    order_dtm = models.DateTimeField()
    medication_id = models.DecimalField(max_digits=18, decimal_places=0)
    medication_name = models.CharField(max_length=510)
    med_admin_line = models.DecimalField(max_digits=38, decimal_places=0)
    admin_dtm = models.DateTimeField()
    admin_dose = models.CharField(max_length=184)
    med_form = models.CharField(max_length=50)
    admin_route_desc = models.CharField(max_length=254)
    dose_unit_desc = models.CharField(max_length=254)
    med_start_dtm = models.DateTimeField()
    med_end_dtm = models.DateTimeField()

    objects = SanguineManager()
    use_hospital_db = True
    class Meta:
        db_table = "BLOOD_PRODUCTS_DM.INTELVIA_CL_MEDS"


class Lab(models.Model):
    visit_no = models.ForeignKey(Visit, on_delete=models.CASCADE, db_column="visit_no")
    mrn = models.ForeignKey(Patient, on_delete=models.CASCADE, db_column="mrn")
    lab_id = models.BigIntegerField()
    lab_draw_dtm = models.DateTimeField()
    lab_panel_code = models.CharField(max_length=30)
    lab_panel_desc = models.CharField(max_length=256)
    result_dtm = models.DateTimeField()
    result_code = models.CharField(max_length=30)
    result_loinc = models.CharField(max_length=30)
    result_desc = models.CharField(max_length=256)
    result_value = models.DecimalField(max_digits=20, decimal_places=4, null=True)
    uom_code = models.CharField(max_length=30)
    lower_limit = models.DecimalField(max_digits=20, decimal_places=4, null=True)
    upper_limit = models.DecimalField(max_digits=20, decimal_places=4, null=True)

    objects = SanguineManager()
    use_hospital_db = True
    class Meta:
        db_table = "BLOOD_PRODUCTS_DM.INTELVIA_CL_VISIT_LABS"


class Transfusion(models.Model):
    visit_no = models.ForeignKey(Visit, on_delete=models.CASCADE, db_column="visit_no")
    trnsfsn_dtm = models.DateTimeField()
    transfusion_rank = models.FloatField()
    blood_unit_number = models.CharField(max_length=600)
    rbc_units = models.FloatField(null=True)
    ffp_units = models.FloatField(null=True)
    plt_units = models.FloatField(null=True)
    cryo_units = models.FloatField(null=True)
    whole_units = models.FloatField(null=True)
    rbc_vol = models.FloatField(null=True)
    ffp_vol = models.FloatField(null=True)
    plt_vol = models.FloatField(null=True)
    cryo_vol = models.FloatField(null=True)
    whole_vol = models.FloatField(null=True)
    cell_saver_ml = models.FloatField(null=True)

    objects = SanguineManager()
    use_hospital_db = True
    class Meta:
        db_table = "BLOOD_PRODUCTS_DM.INTELVIA_CL_TRANSFUSION"


class AttendingProvider(models.Model):
    visit_no = models.ForeignKey(Visit, on_delete=models.CASCADE, db_column="visit_no")
    prov_id = models.CharField(max_length=25)
    prov_name = models.CharField(max_length=100)
    attend_start_dtm = models.DateTimeField()
    attend_end_dtm = models.DateTimeField()
    attend_prov_line = models.DecimalField(max_digits=38, decimal_places=0)

    objects = SanguineManager()
    use_hospital_db = True
    class Meta:
        db_table = "BLOOD_PRODUCTS_DM.INTELVIA_CL_ATTENDING_PROVIDERS"


class RoomTrace(models.Model):
    visit_no = models.ForeignKey(Visit, on_delete=models.CASCADE, db_column="visit_no")
    department_id = models.CharField(max_length=30)
    department_name = models.CharField(max_length=100)
    room_id = models.CharField(max_length=30)
    bed_id = models.CharField(max_length=30)
    service_in_c = models.CharField(max_length=10)
    service_in_desc = models.CharField(max_length=100)
    in_dtm = models.DateTimeField()
    out_dtm = models.DateTimeField()
    duration_days = models.FloatField()
    bed_room_dept_line = models.FloatField()

    objects = SanguineManager()
    use_hospital_db = True
    class Meta:
        db_table = "BLOOD_PRODUCTS_DM.INTELVIA_CL_DEPT_SERV"
