# Generated by Django 5.2 on 2025-04-09 20:25

import api.models.state_management
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Patient',
            fields=[
                ('mrn', models.CharField(max_length=20, primary_key=True, serialize=False)),
                ('last_name', models.CharField(max_length=30)),
                ('first_name', models.CharField(max_length=30)),
                ('birth_date', models.DateField()),
                ('sex_code', models.CharField(max_length=80)),
                ('race_desc', models.CharField(max_length=80)),
                ('ethnicity_desc', models.CharField(max_length=2000)),
                ('death_date', models.DateField(null=True)),
            ],
            options={
                'db_table': 'Patient',
            },
        ),
        migrations.CreateModel(
            name='State',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(default='New State', max_length=128, unique=True)),
                ('definition', models.TextField()),
                ('owner', models.CharField(default='NA', max_length=128)),
                ('public', models.BooleanField(default=False)),
            ],
        ),
        migrations.CreateModel(
            name='Visit',
            fields=[
                ('visit_no', models.BigIntegerField(primary_key=True, serialize=False)),
                ('epic_pat_id', models.CharField(max_length=80)),
                ('hsp_account_id', models.CharField(max_length=80)),
                ('adm_dtm', models.DateField()),
                ('dsch_dtm', models.DateField()),
                ('clinical_los', models.DecimalField(decimal_places=2, max_digits=10, null=True)),
                ('age_at_adm', models.FloatField()),
                ('pat_class_desc', models.CharField(max_length=2000)),
                ('pat_type_desc', models.CharField(max_length=2000)),
                ('pat_expired_f', models.CharField(max_length=1, null=True)),
                ('invasive_vent_f', models.CharField(max_length=1, null=True)),
                ('total_vent_mins', models.FloatField()),
                ('total_vent_days', models.FloatField()),
                ('apr_drg_code', models.CharField(max_length=254)),
                ('apr_drg_rom', models.CharField(max_length=80, null=True)),
                ('apr_drg_soi', models.CharField(max_length=80, null=True)),
                ('apr_drg_desc', models.CharField(max_length=2000)),
                ('apr_drg_weight', models.FloatField()),
                ('ms_drg_weight', models.FloatField()),
                ('cci_mi', models.FloatField(null=True)),
                ('cci_chf', models.FloatField(null=True)),
                ('cci_pvd', models.FloatField(null=True)),
                ('cci_cvd', models.FloatField(null=True)),
                ('cci_dementia', models.FloatField(null=True)),
                ('cci_copd', models.FloatField(null=True)),
                ('cci_rheum_dz', models.FloatField(null=True)),
                ('cci_pud', models.FloatField(null=True)),
                ('cci_liver_dz_mild', models.FloatField(null=True)),
                ('cci_dm_wo_compl', models.FloatField(null=True)),
                ('cci_dm_w_compl', models.FloatField(null=True)),
                ('cci_paraplegia', models.FloatField(null=True)),
                ('cci_renal_dz', models.FloatField(null=True)),
                ('cci_malign_wo_mets', models.FloatField(null=True)),
                ('cci_liver_dz_severe', models.FloatField(null=True)),
                ('cci_malign_w_mets', models.FloatField(null=True)),
                ('cci_hiv_aids', models.FloatField(null=True)),
                ('cci_score', models.FloatField(null=True)),
                ('mrn', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.patient')),
            ],
            options={
                'db_table': 'Visit',
            },
        ),
        migrations.CreateModel(
            name='Transfusion',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('trnsfsn_dtm', models.DateTimeField()),
                ('transfusion_rank', models.FloatField()),
                ('blood_unit_number', models.CharField(max_length=600)),
                ('rbc_units', models.FloatField(null=True)),
                ('ffp_units', models.FloatField(null=True)),
                ('plt_units', models.FloatField(null=True)),
                ('cryo_units', models.FloatField(null=True)),
                ('whole_units', models.FloatField(null=True)),
                ('rbc_vol', models.FloatField(null=True)),
                ('ffp_vol', models.FloatField(null=True)),
                ('plt_vol', models.FloatField(null=True)),
                ('cryo_vol', models.FloatField(null=True)),
                ('whole_vol', models.FloatField(null=True)),
                ('cell_saver_ml', models.FloatField(null=True)),
                ('visit_no', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.visit')),
            ],
            options={
                'db_table': 'Transfusion',
            },
        ),
        migrations.CreateModel(
            name='SurgeryCase',
            fields=[
                ('case_id', models.BigIntegerField(primary_key=True, serialize=False)),
                ('case_date', models.DateField()),
                ('surgery_start_dtm', models.DateTimeField()),
                ('surgery_end_dtm', models.DateTimeField()),
                ('surgery_elap', models.FloatField()),
                ('surgery_type_desc', models.CharField(max_length=2000)),
                ('surgeon_prov_id', models.CharField(max_length=25)),
                ('surgeon_prov_name', models.CharField(max_length=100)),
                ('anesth_prov_id', models.CharField(max_length=25)),
                ('anesth_prov_name', models.CharField(max_length=100)),
                ('prim_proc_desc', models.CharField(max_length=2000)),
                ('postop_icu_los', models.DecimalField(decimal_places=2, max_digits=10, null=True)),
                ('sched_site_desc', models.CharField(max_length=2000)),
                ('asa_code', models.CharField(max_length=80)),
                ('mrn', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.patient')),
                ('visit_no', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.visit')),
            ],
            options={
                'db_table': 'SurgeryCase',
            },
        ),
        migrations.CreateModel(
            name='RoomTrace',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('department_id', models.CharField(max_length=30)),
                ('department_name', models.CharField(max_length=100)),
                ('room_id', models.CharField(max_length=30)),
                ('bed_id', models.CharField(max_length=30)),
                ('service_in_c', models.CharField(max_length=10)),
                ('service_in_desc', models.CharField(max_length=100)),
                ('in_dtm', models.DateTimeField()),
                ('out_dtm', models.DateTimeField()),
                ('duration_days', models.FloatField()),
                ('bed_room_dept_line', models.FloatField()),
                ('visit_no', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.visit')),
            ],
            options={
                'db_table': 'RoomTrace',
            },
        ),
        migrations.CreateModel(
            name='Medication',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order_med_id', models.DecimalField(decimal_places=0, max_digits=18)),
                ('order_dtm', models.DateTimeField()),
                ('medication_id', models.DecimalField(decimal_places=0, max_digits=18)),
                ('medication_name', models.CharField(max_length=510)),
                ('med_admin_line', models.DecimalField(decimal_places=0, max_digits=38)),
                ('admin_dtm', models.DateTimeField()),
                ('admin_dose', models.CharField(max_length=184)),
                ('med_form', models.CharField(max_length=50)),
                ('admin_route_desc', models.CharField(max_length=254)),
                ('dose_unit_desc', models.CharField(max_length=254)),
                ('med_start_dtm', models.DateTimeField()),
                ('med_end_dtm', models.DateTimeField()),
                ('visit_no', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.visit')),
            ],
            options={
                'db_table': 'Medication',
            },
        ),
        migrations.CreateModel(
            name='Lab',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('lab_id', models.CharField(max_length=16)),
                ('lab_draw_dtm', models.DateTimeField()),
                ('lab_panel_code', models.CharField(max_length=30)),
                ('lab_panel_desc', models.CharField(max_length=256)),
                ('result_dtm', models.DateTimeField()),
                ('result_code', models.CharField(max_length=30)),
                ('result_loinc', models.CharField(max_length=30)),
                ('result_desc', models.CharField(max_length=256)),
                ('result_value', models.CharField(max_length=1000)),
                ('uom_code', models.CharField(max_length=30)),
                ('lower_limit', models.FloatField()),
                ('upper_limit', models.FloatField()),
                ('mrn', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.patient')),
                ('visit_no', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.visit')),
            ],
            options={
                'db_table': 'Lab',
            },
        ),
        migrations.CreateModel(
            name='BillingCode',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cpt_code', models.CharField(max_length=80)),
                ('cpt_code_desc', models.CharField(max_length=2000)),
                ('proc_dtm', models.DateTimeField()),
                ('prov_id', models.CharField(max_length=25)),
                ('prov_name', models.CharField(max_length=100)),
                ('code_rank', models.FloatField()),
                ('visit_no', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.visit')),
            ],
            options={
                'db_table': 'BillingCode',
            },
        ),
        migrations.CreateModel(
            name='AttendingProvider',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('prov_id', models.CharField(max_length=25)),
                ('prov_name', models.CharField(max_length=100)),
                ('attend_start_dtm', models.DateTimeField()),
                ('attend_end_dtm', models.DateTimeField()),
                ('attend_prov_line', models.DecimalField(decimal_places=0, max_digits=38)),
                ('visit_no', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.visit')),
            ],
            options={
                'db_table': 'AttendingProvider',
            },
        ),
        migrations.CreateModel(
            name='StateAccess',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user', models.CharField(max_length=128)),
                ('role', models.CharField(choices=[('READER', 'RE'), ('WRITER', 'WR')], default=api.models.state_management.AccessLevel['READER'], max_length=6)),
                ('state', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.state')),
            ],
            options={
                'unique_together': {('state', 'user')},
            },
        ),
    ]
