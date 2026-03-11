from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0004_billingcode_cpt_visit_idx"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="billingcode",
            index=models.Index(
                fields=["visit_no", "cpt_code"],
                name="billingcode_visit_cpt_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="medication",
            index=models.Index(
                fields=["visit_no", "admin_dtm"],
                name="medication_visit_admin_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="lab",
            index=models.Index(
                fields=["visit_no", "lab_draw_dtm"],
                name="lab_visit_draw_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="transfusion",
            index=models.Index(
                fields=["visit_no", "trnsfsn_dtm"],
                name="transfusion_visit_time_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="attendingprovider",
            index=models.Index(
                fields=["visit_no", "prov_id"],
                name="attprov_visit_prov_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="attendingprovider",
            index=models.Index(
                fields=["visit_no", "attend_start_dtm", "attend_end_dtm", "attend_prov_line"],
                name="attprov_visit_window_idx",
            ),
        ),
    ]
