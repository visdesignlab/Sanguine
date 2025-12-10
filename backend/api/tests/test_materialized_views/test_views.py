from django.test import TransactionTestCase
from django.db import connection
from api.models.intelvia import (
    Patient, Visit, Transfusion, Lab, GuidelineAdherence, VisitAttributes
)
from datetime import date, datetime, timedelta, timezone

class MaterializedViewTests(TransactionTestCase):
    # Use TransactionTestCase because we are testing stored procedures/transactions
    
    def setUp(self):
        # Create a patient
        self.patient = Patient.objects.create(
            mrn="TEST001",
            last_name="Test",
            first_name="User",
            birth_date=date(1980, 1, 1),
            sex_code="M",
            race_desc="Unknown",
            ethnicity_desc="Unknown"
        )

        # Create a visit
        self.visit_date = date(2023, 1, 1)
        self.visit = Visit.objects.create(
            visit_no=1001,
            mrn=self.patient,
            epic_pat_id="EPIC123",
            hsp_account_id="HSP123",
            adm_dtm=self.visit_date,
            dsch_dtm=self.visit_date + timedelta(days=5),
            age_at_adm=43,
            pat_class_desc="Inpatient",
            total_vent_mins=0,
            total_vent_days=0,
            apr_drg_code="123",
            apr_drg_desc="Test DRG",
            apr_drg_weight=1.0,
            ms_drg_weight=1.0
        )

        # Create a transfusion (RBC)
        self.transfusion_dtm = datetime(2023, 1, 2, 12, 0, 0, tzinfo=timezone.utc)
        Transfusion.objects.create(
            visit_no=self.visit,
            trnsfsn_dtm=self.transfusion_dtm,
            transfusion_rank=1,
            blood_unit_number="UNIT001",
            rbc_units=1,
            rbc_vol=300
        )

        # Create a lab result (HGB) within 2 hours prior to transfusion
        # Value 7.0 should be adherent (<= 7.5)
        Lab.objects.create(
            visit_no=self.visit,
            mrn=self.patient,
            lab_id=1,
            lab_draw_dtm=self.transfusion_dtm - timedelta(minutes=30),
            lab_panel_code="CBC",
            lab_panel_desc="CBC",
            result_dtm=self.transfusion_dtm,
            result_code="HGB",
            result_loinc="123-4",
            result_desc="Hemoglobin",
            result_value=7.0,
            uom_code="g/dL"
        )

    def test_materialize_visit_attributes(self):
        # Call the stored procedure
        with connection.cursor() as cursor:
            cursor.execute("CALL materializeVisitAttributes()")

        # Check GuidelineAdherence
        adherence = GuidelineAdherence.objects.get(visit_no=self.visit.visit_no)
        self.assertEqual(adherence.rbc_adherent, 1, "Should be adherent for RBC")
        self.assertEqual(adherence.ffp_adherent, 0, "Should not be adherent for FFP (no transfusion)")

        # Check VisitAttributes
        attributes = VisitAttributes.objects.get(visit_no=self.visit.visit_no)
        self.assertEqual(attributes.rbc_units, 1, "Should have 1 RBC unit")
        self.assertEqual(attributes.rbc_adherent, 1, "Should reflect adherence in attributes")
        self.assertEqual(attributes.los, None, "LOS should be null (clinical_los was null)")
        
        # Verify ranges/constraints
        self.assertGreaterEqual(attributes.age_at_adm, 0)
        self.assertGreaterEqual(attributes.rbc_units, 0)

    def test_materialize_non_adherent(self):
        # Create another visit that is NOT adherent
        visit2 = Visit.objects.create(
            visit_no=1002,
            mrn=self.patient,
            epic_pat_id="EPIC124",
            hsp_account_id="HSP124",
            adm_dtm=self.visit_date,
            dsch_dtm=self.visit_date + timedelta(days=5),
            age_at_adm=43,
            pat_class_desc="Inpatient",
            total_vent_mins=0,
            total_vent_days=0,
            apr_drg_code="123",
            apr_drg_desc="Test DRG",
            apr_drg_weight=1.0,
            ms_drg_weight=1.0
        )

        # Transfusion
        transfusion_dtm = datetime(2023, 1, 3, 12, 0, 0, tzinfo=timezone.utc)
        Transfusion.objects.create(
            visit_no=visit2,
            trnsfsn_dtm=transfusion_dtm,
            transfusion_rank=1,
            blood_unit_number="UNIT002",
            rbc_units=1,
            rbc_vol=300
        )

        # Lab result > 7.5 (e.g., 8.0) -> Not adherent
        Lab.objects.create(
            visit_no=visit2,
            mrn=self.patient,
            lab_id=2,
            lab_draw_dtm=transfusion_dtm - timedelta(minutes=30),
            lab_panel_code="CBC",
            lab_panel_desc="CBC",
            result_dtm=transfusion_dtm,
            result_code="HGB",
            result_loinc="123-4",
            result_desc="Hemoglobin",
            result_value=8.0,
            uom_code="g/dL"
        )

        with connection.cursor() as cursor:
            cursor.execute("CALL materializeVisitAttributes()")

        adherence = GuidelineAdherence.objects.get(visit_no=visit2.visit_no)
        self.assertEqual(adherence.rbc_adherent, 0, "Should NOT be adherent for RBC (HGB > 7.5)")
