from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_providerdepartmentmapping'),
    ]

    operations = [
        migrations.CreateModel(
            name='DataExclusion',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('record_type', models.CharField(
                    choices=[('visit', 'Visit'), ('surgery_case', 'Surgery Case')],
                    max_length=20,
                )),
                ('record_id', models.CharField(max_length=100)),
                ('flag_key', models.CharField(max_length=100)),
                ('excluded_by', models.CharField(max_length=128)),
                ('excluded_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'DataExclusion',
                'unique_together': {('record_type', 'record_id')},
            },
        ),
    ]
