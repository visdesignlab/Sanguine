from django.db import models


class Patient(models.Model):
    mrn = models.CharField(max_length=20, primary_key=True)
    last_name = models.CharField(max_length=30, null=True)
    first_name = models.CharField(max_length=30, null=True)
    birth_date = models.DateField(null=True)
    sex_code = models.CharField(max_length=80, null=True)
    race_desc = models.CharField(max_length=80, null=True)
    ethnicity_desc = models.CharField(max_length=2000, null=True)
    death_date = models.DateField(null=True)

    class Meta:
        db_table = "Patient"


class Visit(models.Model):
    visit_no = models.BigIntegerField(primary_key=True)
    mrn = models.ForeignKey(Patient, on_delete=models.CASCADE, db_column="mrn")
    epic_pat_id = models.CharField(max_length=80, null=True)
    hsp_account_id = models.CharField(max_length=80, null=True)
    adm_dtm = models.DateField(null=True)
    dsch_dtm = models.DateField(null=True)
    clinical_los = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    age_at_adm = models.FloatField(null=True)
    pat_class_desc = models.CharField(max_length=2000)
    pat_expired_f = models.CharField(max_length=1, null=True)
    invasive_vent_f = models.CharField(max_length=1, null=True)
    total_vent_mins = models.FloatField(null=True)
    total_vent_days = models.FloatField(null=True)
    apr_drg_code = models.CharField(max_length=254, null=True)
    apr_drg_rom = models.CharField(max_length=80, null=True)
    apr_drg_soi = models.CharField(max_length=80, null=True)
    apr_drg_desc = models.CharField(max_length=2000, null=True)
    apr_drg_weight = models.FloatField(null=True)
    ms_drg_weight = models.FloatField(null=True)
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

    class Meta:
        db_table = "Visit"


class VisitAttributes(models.Model):
    # all visit attributes
    visit_no = models.OneToOneField(Visit, on_delete=models.CASCADE, db_column="visit_no", primary_key=True, related_name="attributes")
    mrn = models.ForeignKey(Patient, on_delete=models.CASCADE, db_column="mrn")
    adm_dtm = models.DateField()
    dsch_dtm = models.DateField()
    age_at_adm = models.IntegerField()
    pat_class_desc = models.CharField(max_length=100)
    apr_drg_weight = models.FloatField()
    ms_drg_weight = models.FloatField()

    month = models.CharField(max_length=8)  # YYYY-mmm
    quarter = models.CharField(max_length=7)  # YYYY-Qn
    year = models.CharField(max_length=4)  # YYYY

    rbc_units = models.IntegerField()
    ffp_units = models.IntegerField()
    plt_units = models.IntegerField()
    cryo_units = models.IntegerField()
    whole_units = models.IntegerField()

    los = models.DecimalField(max_digits=6, decimal_places=2, null=True)
    death = models.BooleanField()
    vent = models.BooleanField()
    stroke = models.BooleanField()
    ecmo = models.BooleanField()

    b12 = models.BooleanField()
    iron = models.BooleanField()
    antifibrinolytic = models.BooleanField()

    rbc_adherent = models.IntegerField()
    ffp_adherent = models.IntegerField()
    plt_adherent = models.IntegerField()
    cryo_adherent = models.IntegerField()
    overall_adherent = models.IntegerField()

    rbc_units_cost = models.DecimalField(max_digits=6, decimal_places=2)
    ffp_units_cost = models.DecimalField(max_digits=6, decimal_places=2)
    plt_units_cost = models.DecimalField(max_digits=6, decimal_places=2)
    cryo_units_cost = models.DecimalField(max_digits=6, decimal_places=2)
    overall_cost = models.DecimalField(max_digits=6, decimal_places=2)

    class Meta:
        db_table = "VisitAttributes"
        managed = False


class GuidelineAdherence(models.Model):
    visit_no = models.OneToOneField(Visit, on_delete=models.CASCADE, db_column="visit_no", primary_key=True, related_name="guideline_adherence")
    rbc_adherent = models.IntegerField()
    ffp_adherent = models.IntegerField()
    plt_adherent = models.IntegerField()
    cryo_adherent = models.IntegerField()

    class Meta:
        db_table = "GuidelineAdherence"
        managed = False


class SurgeryCase(models.Model):
    visit_no = models.ForeignKey(Visit, on_delete=models.CASCADE, db_column="visit_no")
    mrn = models.ForeignKey(Patient, on_delete=models.CASCADE, db_column="mrn")
    case_id = models.BigIntegerField(primary_key=True)
    case_date = models.DateField(null=True)
    surgery_start_dtm = models.DateTimeField(null=True)
    surgery_end_dtm = models.DateTimeField(null=True)
    surgery_elap = models.FloatField(null=True)
    surgery_type_desc = models.CharField(max_length=2000, null=True)
    surgeon_prov_id = models.CharField(max_length=25, null=True)
    surgeon_prov_name = models.CharField(max_length=100, null=True)
    anesth_prov_id = models.CharField(max_length=25, null=True)
    anesth_prov_name = models.CharField(max_length=100, null=True)
    prim_proc_desc = models.CharField(max_length=2000, null=True)
    postop_icu_los = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    sched_site_desc = models.CharField(max_length=2000)
    asa_code = models.CharField(max_length=80, null=True)

    class Meta:
        db_table = "SurgeryCase"


class BillingCode(models.Model):
    visit_no = models.ForeignKey(Visit, on_delete=models.CASCADE, db_column="visit_no")
    cpt_code = models.CharField(max_length=80, null=True)
    cpt_code_desc = models.CharField(max_length=2000, null=True)
    proc_dtm = models.DateTimeField(null=True)
    prov_id = models.CharField(max_length=25, null=True)
    prov_name = models.CharField(max_length=100, null=True)
    code_rank = models.FloatField(null=True)

    class Meta:
        db_table = "BillingCode"
        primary_key = ["visit_no", "code_rank"]


class Medication(models.Model):
    visit_no = models.ForeignKey(Visit, on_delete=models.CASCADE, db_column="visit_no")
    order_med_id = models.DecimalField(max_digits=18, decimal_places=0, primary_key=True)
    order_dtm = models.DateTimeField(null=True)
    medication_id = models.DecimalField(max_digits=18, decimal_places=0, null=True)
    medication_name = models.CharField(max_length=510, null=True)
    med_admin_line = models.DecimalField(max_digits=38, decimal_places=0, null=True)
    admin_dtm = models.DateTimeField(null=True)
    admin_dose = models.CharField(max_length=184, null=True)
    med_form = models.CharField(max_length=50, null=True)
    admin_route_desc = models.CharField(max_length=254, null=True)
    dose_unit_desc = models.CharField(max_length=254, null=True)
    med_start_dtm = models.DateTimeField(null=True)
    med_end_dtm = models.DateTimeField(null=True)
 
    class Meta:
        db_table = "Medication"


class Lab(models.Model):
    visit_no = models.ForeignKey(Visit, on_delete=models.CASCADE, db_column="visit_no")
    mrn = models.ForeignKey(Patient, on_delete=models.CASCADE, db_column="mrn")
    lab_id = models.CharField(max_length=50, primary_key=True)
    lab_draw_dtm = models.DateTimeField(null=True, null=True)
    lab_panel_code = models.CharField(max_length=30, null=True)
    lab_panel_desc = models.CharField(max_length=256, null=True)
    result_dtm = models.DateTimeField(null=True)
    result_code = models.CharField(max_length=30, null=True)
    result_loinc = models.CharField(max_length=30, null=True)
    result_desc = models.CharField(max_length=256, null=True)
    result_value = models.DecimalField(max_digits=20, decimal_places=4, null=True)
    uom_code = models.CharField(max_length=30, null=True)
    lower_limit = models.DecimalField(max_digits=20, decimal_places=4, null=True)
    upper_limit = models.DecimalField(max_digits=20, decimal_places=4, null=True)

    class Meta:
        db_table = "Lab"


class Transfusion(models.Model):
    visit_no = models.ForeignKey(Visit, on_delete=models.CASCADE, db_column="visit_no")
    trnsfsn_dtm = models.DateTimeField(null=True)
    transfusion_rank = models.FloatField(null=True)
    blood_unit_number = models.CharField(max_length=600, null=True)
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

    class Meta:
        db_table = "Transfusion"
        primary_key = ["visit_no", "transfusion_rank"]


class AttendingProvider(models.Model):
    visit_no = models.ForeignKey(Visit, on_delete=models.CASCADE, db_column="visit_no")
    prov_id = models.CharField(max_length=25, null=True)
    prov_name = models.CharField(max_length=100, null=True)
    attend_start_dtm = models.DateTimeField(null=True)
    attend_end_dtm = models.DateTimeField(null=True)
    attend_prov_line = models.DecimalField(max_digits=38, decimal_places=0, null=True)

    class Meta:
        db_table = "AttendingProvider"
        primary_key = ["visit_no", "attend_prov_line"]


class RoomTrace(models.Model):
    visit_no = models.ForeignKey(Visit, on_delete=models.CASCADE, db_column="visit_no")
    department_id = models.CharField(max_length=30, null=True)
    department_name = models.CharField(max_length=100, null=True)
    room_id = models.CharField(max_length=30, null=True)
    bed_id = models.CharField(max_length=30, null=True)
    service_in_c = models.CharField(max_length=10, null=True)
    service_in_desc = models.CharField(max_length=100, null=True)
    in_dtm = models.DateTimeField(null=True)
    out_dtm = models.DateTimeField(null=True)
    duration_days = models.FloatField(null=True)
    bed_room_dept_line = models.FloatField(null=True)

    class Meta:
        db_table = "RoomTrace"
        primary_key = ["visit_no", "bed_room_dept_line"]
