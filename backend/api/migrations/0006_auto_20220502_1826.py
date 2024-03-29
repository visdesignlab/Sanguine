# Generated by Django 3.2.13 on 2022-05-02 18:26

import api.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_auto_20210716_1905'),
    ]

    operations = [
        migrations.AlterField(
            model_name='state',
            name='owner',
            field=models.CharField(default='NA', max_length=128),
        ),
        migrations.AlterField(
            model_name='stateaccess',
            name='role',
            field=models.CharField(choices=[('READER', 'RE'), ('WRITER', 'WR')], default=api.models.AccessLevel['READER'], max_length=6),
        ),
    ]
