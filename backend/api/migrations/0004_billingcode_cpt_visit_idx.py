from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0003_manual_view"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="billingcode",
            index=models.Index(
                fields=["cpt_code", "visit_no"],
                name="billingcode_cpt_visit_idx",
            ),
        ),
    ]
