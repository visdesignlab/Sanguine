# Generated by Django 5.0.8 on 2024-09-13 18:19

import api.models
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='BILLING_CODES',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('CODE_TYPE_DESC', models.CharField(max_length=2000)),
                ('CODE', models.CharField(max_length=80)),
                ('CODE_DESC', models.CharField(max_length=2000)),
                ('PROC_DTM', models.DateField()),
                ('PROV_ID', models.CharField(max_length=25)),
                ('PROV_NAME', models.CharField(max_length=100)),
                ('PRESENT_ON_ADM_F', models.CharField(max_length=1)),
                ('CODE_RANK', models.FloatField()),
                ('LOAD_DTM', models.DateField()),
            ],
            options={
                'db_table': 'SANG_BILLING_CODES',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='EXTRAOP_MEDS',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ORDER_MED_ID', models.DecimalField(decimal_places=0, max_digits=18)),
                ('ORDER_DTM', models.DateField()),
                ('MEDICATION_ID', models.DecimalField(decimal_places=0, max_digits=18)),
                ('MEDICATION_NAME', models.CharField(max_length=510)),
                ('MED_ADMIN_LINE', models.DecimalField(decimal_places=0, max_digits=38)),
                ('ADMIN_DTM', models.DateField()),
                ('ADMIN_DOSE', models.CharField(max_length=184)),
                ('MED_FORM', models.CharField(max_length=50)),
                ('ADMIN_ROUTE_DESC', models.CharField(max_length=254)),
                ('DOSE_UNIT_DESC', models.CharField(max_length=254)),
                ('MED_START_DTM', models.DateField()),
                ('MED_END_DTM', models.DateField()),
                ('LOAD_DTM', models.DateField()),
            ],
            options={
                'db_table': 'SANG_EXTRAOP_MEDS',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='INTRAOP_MEDS',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ORDER_MED_ID', models.DecimalField(decimal_places=0, max_digits=18)),
                ('MED_ADMIN_LINE', models.DecimalField(decimal_places=0, max_digits=38)),
                ('ORDER_DTM', models.DateField()),
                ('MEDICATION_ID', models.DecimalField(decimal_places=0, max_digits=18)),
                ('MEDICATION_NAME', models.CharField(max_length=510)),
                ('ADMIN_DTM', models.DateField()),
                ('ADMIN_DOSE', models.CharField(max_length=184)),
                ('MED_FORM', models.CharField(max_length=50)),
                ('ADMIN_ROUTE_DESC', models.CharField(max_length=254)),
                ('DOSE_UNIT_DESC', models.CharField(max_length=254)),
                ('MED_START_DTM', models.DateField()),
                ('MED_END_DTM', models.DateField()),
                ('LOAD_DTM', models.DateField()),
            ],
            options={
                'db_table': 'SANG_INTRAOP_MEDS',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='INTRAOP_TRANSFUSION',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('TRNSFSN_DTM', models.DateField()),
                ('BLOOD_UNIT_NUMBER', models.CharField(max_length=600)),
                ('PRBC_UNITS', models.FloatField(null=True)),
                ('FFP_UNITS', models.FloatField(null=True)),
                ('PLT_UNITS', models.FloatField(null=True)),
                ('CRYO_UNITS', models.FloatField(null=True)),
                ('CELL_SAVER_ML', models.FloatField(null=True)),
                ('RBC_VOL', models.FloatField(null=True)),
                ('FFP_VOL', models.FloatField(null=True)),
                ('PLT_VOL', models.FloatField(null=True)),
                ('CRYO_VOL', models.FloatField(null=True)),
                ('TRANSFUSION_RANK', models.FloatField()),
                ('LOAD_DTM', models.DateField()),
            ],
            options={
                'db_table': 'SANG_INTRAOP_TRANSFUSION',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='PATIENT',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('MRN', models.CharField(max_length=20)),
                ('PAT_FAMILY', models.CharField(max_length=30)),
                ('PAT_GIVEN', models.CharField(max_length=30)),
                ('PAT_BIRTHDATE', models.DateField()),
                ('GENDER_CODE', models.CharField(max_length=80)),
                ('RACE_CODE', models.CharField(max_length=80)),
                ('RACE_DESC', models.CharField(max_length=2000)),
                ('ETHNICITY_CODE', models.CharField(max_length=80)),
                ('ETHNICITY_DESC', models.CharField(max_length=2000)),
                ('DEATH_DATE', models.DateField(null=True)),
                ('LOAD_DTM', models.DateField()),
            ],
            options={
                'db_table': 'SANG_PATIENT',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='SURGERY_CASE',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('CASE_ID', models.FloatField()),
                ('CASE_DATE', models.DateField()),
                ('SURGERY_START_DTM', models.DateField()),
                ('SURGERY_END_DTM', models.DateField()),
                ('SURGERY_ELAP', models.FloatField()),
                ('SURGERY_TYPE_DESC', models.CharField(max_length=2000)),
                ('SURGEON_PROV_ID', models.CharField(max_length=25)),
                ('SURGEON_PROV_NAME', models.CharField(max_length=100)),
                ('ANESTH_PROV_ID', models.CharField(max_length=25)),
                ('ANESTH_PROV_NAME', models.CharField(max_length=100)),
                ('PRIM_PROC_DESC', models.CharField(max_length=2000)),
                ('POSTOP_ICU_LOS', models.FloatField()),
                ('SCHED_SITE_DESC', models.CharField(max_length=2000)),
                ('ASA_CODE', models.CharField(max_length=80)),
                ('LOAD_DTM', models.DateField()),
            ],
            options={
                'db_table': 'SANG_SURGERY_CASE',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='VISIT',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('VISIT_NO', models.DecimalField(decimal_places=0, max_digits=18)),
                ('ADM_DTM', models.DateField()),
                ('DSCH_DTM', models.DateField()),
                ('AGE_AT_ADM', models.FloatField()),
                ('PAT_CLASS_DESC', models.CharField(max_length=2000)),
                ('PAT_TYPE_DESC', models.CharField(max_length=2000)),
                ('PAT_EXPIRED', models.CharField(max_length=1)),
                ('INVASIVE_VENT_F', models.CharField(max_length=1)),
                ('TOTAL_VENT_MINS', models.FloatField()),
                ('TOTAL_VENT_DAYS', models.FloatField()),
                ('APR_DRG_CODE', models.CharField(max_length=254)),
                ('APR_DRG_ROM', models.CharField(max_length=80)),
                ('APR_DRG_SOI', models.CharField(max_length=80)),
                ('APR_DRG_DESC', models.CharField(max_length=2000)),
                ('APR_DRG_WEIGHT', models.FloatField()),
                ('CCI_MI', models.FloatField(null=True)),
                ('CCI_CHF', models.FloatField(null=True)),
                ('CCI_PVD', models.FloatField(null=True)),
                ('CCI_CVD', models.FloatField(null=True)),
                ('CCI_DEMENTIA', models.FloatField(null=True)),
                ('CCI_COPD', models.FloatField(null=True)),
                ('CCI_RHEUM_DZ', models.FloatField(null=True)),
                ('CCI_PUD', models.FloatField(null=True)),
                ('CCI_LIVER_DZ_MILD', models.FloatField(null=True)),
                ('CCI_DM_WO_COMPL', models.FloatField(null=True)),
                ('CCI_DM_W_COMPL', models.FloatField(null=True)),
                ('CCI_PARAPLEGIA', models.FloatField(null=True)),
                ('CCI_RENAL_DZ', models.FloatField(null=True)),
                ('CCI_MALIGN_WO_METS', models.FloatField(null=True)),
                ('CCI_LIVER_DZ_SEVERE', models.FloatField(null=True)),
                ('CCI_MALIGN_W_METS', models.FloatField(null=True)),
                ('CCI_HIV_AIDS', models.FloatField(null=True)),
                ('CCI_SCORE', models.FloatField(null=True)),
                ('LOAD_DTM', models.DateField()),
            ],
            options={
                'db_table': 'SANG_VISIT',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='VISIT_LABS',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('LAB_ID', models.CharField(max_length=16)),
                ('LAB_DRAW_DTM', models.DateField()),
                ('LAB_PANEL_CODE', models.CharField(max_length=30)),
                ('LAB_PANEL_DESC', models.CharField(max_length=256)),
                ('RESULT_DTM', models.DateField()),
                ('RESULT_CODE', models.CharField(max_length=30)),
                ('RESULT_LOINC', models.CharField(max_length=30)),
                ('RESULT_DESC', models.CharField(max_length=256)),
                ('RESULT_VALUE', models.CharField(max_length=1000)),
                ('UOM_CODE', models.CharField(max_length=30)),
                ('LOWER_LIMIT', models.FloatField()),
                ('UPPER_LIMIT', models.FloatField()),
                ('LOAD_DTM', models.DateField()),
            ],
            options={
                'db_table': 'SANG_VISIT_LABS',
                'managed': False,
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
            name='StateAccess',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user', models.CharField(max_length=128)),
                ('role', models.CharField(choices=[('READER', 'RE'), ('WRITER', 'WR')], default=api.models.AccessLevel['READER'], max_length=6)),
                ('state', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.state')),
            ],
            options={
                'unique_together': {('state', 'user')},
            },
        ),
    ]
