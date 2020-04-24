from django.test import TestCase, Client


class APIIntegrationTestCase(TestCase):
    def sanity_check(self):
        self.assertEqual(1, 1)

    def test_get_api_root(self):
        c = Client()
        response = c.get("/api/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode(),
            "Bloodvis API endpoint. Please use the client application to access the data here.",
        )

    def test_get_attributes(self):
        c = Client()
        response = c.get("/api/get_attributes")
        self.assertEqual(response.status_code, 200)

    def test_hemoglobin(self):
        c = Client()
        response = c.get("/api/hemoglobin")
        self.assertEqual(response.status_code, 200)


class RequestTransfusedUnitsTestCase(TestCase):
    def test_request_transfused_units_no_params(self):
        c = Client()
        response = c.get("/api/request_transfused_units")
        self.assertEqual(response.status_code, 400)

    def test_request_transfused_units_missing_transfusion_type(self):
        c = Client()
        response = c.get("/api/request_transfused_units?year_range=2016,2017")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.content.decode(),
            "transfusion_type and year_range must be supplied."
        )

    def test_request_transfused_units_missing_year_range(self):
        c = Client()
        response = c.get("/api/request_transfused_units?transfusion_type=PRBC_UNITS")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.content.decode(),
            "transfusion_type and year_range must be supplied.",
        )

    def test_request_transfused_units_invalid_year_ranges(self):
        c = Client()

        invalid_options = [
            "2016",
            ",2016",
            "2016,2017,2018",
            ",",
            "a,b",
            "a,",
            ",b",
            None,
        ]

        for invalid_option in invalid_options:
            response = c.get(f"/api/request_transfused_units?transfusion_type=PRBC_UNITS&year_range={invalid_option}")
            self.assertEqual(response.status_code, 400)
            self.assertEqual(
                response.content.decode(),
                "transfusion_type and year_range must be supplied.",
            )

    def test_request_transfused_units_invalid_transfusion_types(self):
        c = Client()

        invalid_options = [
            "invalid",
            None,
        ]

        for invalid_option in invalid_options:
            response = c.get(f"/api/request_transfused_units?transfusion_type={invalid_option}&year_range=2016,2017")
            self.assertEqual(response.status_code, 400)
            self.assertEqual(
                response.content.decode(),
                "transfusion_type must be one of the following: ['PRBC_UNITS', 'FFP_UNITS', 'PLT_UNITS', 'CRYO_UNITS', 'CELL_SAVER_ML', 'ALL_UNITS']",
            )

    def test_request_transfused_units_invalid_aggregate_types(self):
        c = Client()

        invalid_options = [
            "invalid",
            None,
        ]

        for invalid_option in invalid_options:
            response = c.get(
                f"/api/request_transfused_units?transfusion_type=PRBC_UNITS&year_range=2016,2017&aggregatedBy={invalid_option}"
            )
            self.assertEqual(response.status_code, 400)
            self.assertEqual(
                response.content.decode(),
                "aggregatedBy must be one of the following: ['YEAR', 'SURGEON_ID', 'ANESTHOLOGIST_ID']",
            )


class UtilUnitTestCase(TestCase):
    def sanity_check(self):
        self.assertEqual(1, 1)
