from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0007_surgerycaseattributes"),
    ]

    operations = [
        migrations.AlterField(
            model_name="visit",
            name="epic_pat_id",
            field=models.CharField(max_length=80, null=True),
        ),
        migrations.AlterField(
            model_name="visit",
            name="hsp_account_id",
            field=models.CharField(max_length=80, null=True),
        ),
        migrations.AlterField(
            model_name="visit",
            name="adm_dtm",
            field=models.DateField(null=True),
        ),
        migrations.AlterField(
            model_name="visit",
            name="dsch_dtm",
            field=models.DateField(null=True),
        ),
        migrations.AlterField(
            model_name="visit",
            name="age_at_adm",
            field=models.FloatField(null=True),
        ),
        migrations.AlterField(
            model_name="visit",
            name="pat_class_desc",
            field=models.CharField(max_length=2000, null=True),
        ),
        migrations.AlterField(
            model_name="visit",
            name="total_vent_mins",
            field=models.FloatField(null=True),
        ),
        migrations.AlterField(
            model_name="visit",
            name="total_vent_days",
            field=models.FloatField(null=True),
        ),
        migrations.AlterField(
            model_name="visit",
            name="apr_drg_code",
            field=models.CharField(max_length=254, null=True),
        ),
        migrations.AlterField(
            model_name="visit",
            name="apr_drg_desc",
            field=models.CharField(max_length=2000, null=True),
        ),
        migrations.AlterField(
            model_name="visit",
            name="apr_drg_weight",
            field=models.FloatField(null=True),
        ),
        migrations.AlterField(
            model_name="visit",
            name="ms_drg_weight",
            field=models.FloatField(null=True),
        ),
        migrations.AlterField(
            model_name="surgerycase",
            name="case_date",
            field=models.DateField(null=True),
        ),
        migrations.AlterField(
            model_name="surgerycase",
            name="surgery_start_dtm",
            field=models.DateTimeField(null=True),
        ),
        migrations.AlterField(
            model_name="surgerycase",
            name="surgery_end_dtm",
            field=models.DateTimeField(null=True),
        ),
        migrations.AlterField(
            model_name="surgerycase",
            name="surgery_elap",
            field=models.FloatField(null=True),
        ),
        migrations.AlterField(
            model_name="surgerycase",
            name="surgery_type_desc",
            field=models.CharField(max_length=2000, null=True),
        ),
        migrations.AlterField(
            model_name="surgerycase",
            name="surgeon_prov_id",
            field=models.CharField(max_length=25, null=True),
        ),
        migrations.AlterField(
            model_name="surgerycase",
            name="surgeon_prov_name",
            field=models.CharField(max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name="surgerycase",
            name="anesth_prov_id",
            field=models.CharField(max_length=25, null=True),
        ),
        migrations.AlterField(
            model_name="surgerycase",
            name="anesth_prov_name",
            field=models.CharField(max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name="surgerycase",
            name="prim_proc_desc",
            field=models.CharField(max_length=2000, null=True),
        ),
        migrations.AlterField(
            model_name="surgerycase",
            name="sched_site_desc",
            field=models.CharField(max_length=2000, null=True),
        ),
        migrations.AlterField(
            model_name="surgerycase",
            name="asa_code",
            field=models.CharField(max_length=80, null=True),
        ),
        migrations.AlterField(
            model_name="billingcode",
            name="cpt_code",
            field=models.CharField(max_length=80, null=True),
        ),
        migrations.AlterField(
            model_name="billingcode",
            name="cpt_code_desc",
            field=models.CharField(max_length=2000, null=True),
        ),
        migrations.AlterField(
            model_name="billingcode",
            name="proc_dtm",
            field=models.DateTimeField(null=True),
        ),
        migrations.AlterField(
            model_name="billingcode",
            name="prov_id",
            field=models.CharField(max_length=25, null=True),
        ),
        migrations.AlterField(
            model_name="billingcode",
            name="prov_name",
            field=models.CharField(max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name="billingcode",
            name="code_rank",
            field=models.FloatField(null=True),
        ),
        migrations.AlterField(
            model_name="medication",
            name="order_med_id",
            field=models.DecimalField(decimal_places=0, max_digits=18, null=True),
        ),
        migrations.AlterField(
            model_name="medication",
            name="order_dtm",
            field=models.DateTimeField(null=True),
        ),
        migrations.AlterField(
            model_name="medication",
            name="medication_id",
            field=models.DecimalField(decimal_places=0, max_digits=18, null=True),
        ),
        migrations.AlterField(
            model_name="medication",
            name="medication_name",
            field=models.CharField(max_length=510, null=True),
        ),
        migrations.AlterField(
            model_name="medication",
            name="med_admin_line",
            field=models.DecimalField(decimal_places=0, max_digits=38, null=True),
        ),
        migrations.AlterField(
            model_name="medication",
            name="admin_dtm",
            field=models.DateTimeField(null=True),
        ),
        migrations.AlterField(
            model_name="medication",
            name="admin_dose",
            field=models.CharField(max_length=184, null=True),
        ),
        migrations.AlterField(
            model_name="medication",
            name="med_form",
            field=models.CharField(max_length=50, null=True),
        ),
        migrations.AlterField(
            model_name="medication",
            name="admin_route_desc",
            field=models.CharField(max_length=254, null=True),
        ),
        migrations.AlterField(
            model_name="medication",
            name="dose_unit_desc",
            field=models.CharField(max_length=254, null=True),
        ),
        migrations.AlterField(
            model_name="medication",
            name="med_start_dtm",
            field=models.DateTimeField(null=True),
        ),
        migrations.AlterField(
            model_name="medication",
            name="med_end_dtm",
            field=models.DateTimeField(null=True),
        ),
        migrations.AlterField(
            model_name="lab",
            name="lab_id",
            field=models.BigIntegerField(null=True),
        ),
        migrations.AlterField(
            model_name="lab",
            name="lab_draw_dtm",
            field=models.DateTimeField(null=True),
        ),
        migrations.AlterField(
            model_name="lab",
            name="lab_panel_code",
            field=models.CharField(max_length=30, null=True),
        ),
        migrations.AlterField(
            model_name="lab",
            name="lab_panel_desc",
            field=models.CharField(max_length=256, null=True),
        ),
        migrations.AlterField(
            model_name="lab",
            name="result_dtm",
            field=models.DateTimeField(null=True),
        ),
        migrations.AlterField(
            model_name="lab",
            name="result_code",
            field=models.CharField(max_length=30, null=True),
        ),
        migrations.AlterField(
            model_name="lab",
            name="result_loinc",
            field=models.CharField(max_length=30, null=True),
        ),
        migrations.AlterField(
            model_name="lab",
            name="result_desc",
            field=models.CharField(max_length=256, null=True),
        ),
        migrations.AlterField(
            model_name="lab",
            name="uom_code",
            field=models.CharField(max_length=30, null=True),
        ),
        migrations.AlterField(
            model_name="transfusion",
            name="trnsfsn_dtm",
            field=models.DateTimeField(null=True),
        ),
        migrations.AlterField(
            model_name="transfusion",
            name="transfusion_rank",
            field=models.FloatField(null=True),
        ),
        migrations.AlterField(
            model_name="transfusion",
            name="blood_unit_number",
            field=models.CharField(max_length=600, null=True),
        ),
        migrations.AlterField(
            model_name="attendingprovider",
            name="prov_id",
            field=models.CharField(max_length=25, null=True),
        ),
        migrations.AlterField(
            model_name="attendingprovider",
            name="prov_name",
            field=models.CharField(max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name="attendingprovider",
            name="attend_start_dtm",
            field=models.DateTimeField(null=True),
        ),
        migrations.AlterField(
            model_name="attendingprovider",
            name="attend_end_dtm",
            field=models.DateTimeField(null=True),
        ),
        migrations.AlterField(
            model_name="attendingprovider",
            name="attend_prov_line",
            field=models.DecimalField(decimal_places=0, max_digits=38, null=True),
        ),
    ]
