from django.test import TestCase, Client
import api.utils as utils


class UtilUnitTestCase(TestCase):
    def sanity_check(self):
        self.assertEqual(1, 1)

    def test_make_connection(self):
        con = utils.make_connection()
        self.assertIsNotNone(con)

    def test_data_dictionary(self):
        data_dict = utils.data_dictionary()
        self.assertIsNotNone(data_dict)
        self.assertIsTrue(len(data_dict) > 0)

    def test_cpt(self):
        cpt_codes = utils.cpt()
        self.assertIsNotNone(cpt_codes)
        self.assertIsTrue(len(cpt_codes) > 0)

    def test_execute_sql(self):
        queries = [
            ("SELECT * FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE", None),
            ("SELECT * FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE WHERE DI_PAT_ID = :bind", {"bind": 123}),
            ("SELECT * FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE WHERE DI_PAT_ID = :bind", 123),
        ]
    
        for q, params in queries:
            result = utils.execute_sql(q, params)
            self.assertIsNotNone(result)
            self.assertIsTrue(len(result) > 0)

    def test_get_all_by_agg(self):
        pass

    def test_get_bind_names_valid_inputs(self):
        valid_inputs = [
            [""],
            ["1", "2"],
        ]
        for valid_input in valid_inputs:
            bind_names = utils.get_bind_names(valid_inputs)
            self.assertIsNotNone(bind_names)
            self.assertIsInstanceOf(bind_names, list)
            self.assertIsTrue(len(bind_names) == len(valid_input))

    def test_get_bind_names_invalid_inputs(self):
        invalid_inputs = [
            "",
            123,
            {},
        ]
        for invalid_input in invalid_inputs:
            with self.assertRaises(TypeError):
                bind_names = utils.get_bind_names(invalid_inputs)

    def test_get_filters_valid_inputs(self):
        valid_inputs = [
            [""],
            ["1", "2"],
        ]
        for valid_input in valid_inputs:
            filters, bind_names, filters_safe_sql = utils.get_bind_names(valid_inputs)
            self.assertIsNotNone(filters)
            self.assertIsNotNone(bind_names)
            self.assertIsNotNone(filters_safe_sql)
            self.assertIsInstanceOf(filters, list)
            self.assertIsInstanceOf(bind_names, list)
            self.assertIsInstanceOf(filters_safe_sql, str)
            self.assertIsTrue(len(filters) == len(bind_names))
            self.assertIsTrue(len(filters_safe_sql) != 0)

    def test_get_filters_invalid_inputs(self):
        invalid_inputs = [
            "",
            123,
            {},
        ]
        for invalid_input in invalid_inputs:
            with self.assertRaises(TypeError):
                filters, bind_names, filters_safe_sql = utils.get_bind_names(valid_inputs)
        

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
