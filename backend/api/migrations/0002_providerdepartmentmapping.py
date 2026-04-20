from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProviderDepartmentMapping",
            fields=[
                ("prov_id", models.CharField(max_length=25, primary_key=True, serialize=False)),
                ("department_id", models.CharField(max_length=200)),
                ("department_name", models.CharField(max_length=200)),
                ("prov_name", models.CharField(max_length=100, null=True)),
            ],
            options={
                "db_table": "ProviderDepartmentMapping",
            },
        ),
    ]
