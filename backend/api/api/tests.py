# Util unit tests and API integration tests

from django.test import TransactionTestCase, TestCase, Client
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
        self.assertTrue(len(data_dict) > 0)

    def test_cpt(self):
        cpt_codes = utils.cpt()
        self.assertIsNotNone(cpt_codes)
        self.assertTrue(len(cpt_codes) > 0)

    def test_execute_sql(self):
        # Test with no args
        result = utils.execute_sql("SELECT * FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE")
        self.assertIsNotNone(result)
        self.assertTrue(len(result.description) > 0)

        # Test with args dict
        queries = [
            ("SELECT * FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE WHERE DI_PAT_ID = :bind", {"bind": 123}),
        ]
    
        for q, params in queries:
            result = utils.execute_sql(q, params)
            self.assertIsNotNone(result)
            self.assertTrue(len(result.description) > 0)

        # Test with positional kwargs
        result = utils.execute_sql("SELECT * FROM CLIN_DM.BPU_CTS_DI_SURGERY_CASE WHERE DI_PAT_ID = :bind", bind = 123)
        self.assertIsNotNone(result)
        self.assertTrue(len(result.description) > 0)

    def test_get_all_by_agg(self):
        pass

    def test_get_bind_names_valid_inputs(self):
        valid_inputs = [
            [""],
            ["1", "2"],
        ]
        for valid_input in valid_inputs:
            bind_names = utils.get_bind_names(valid_input)
            self.assertIsNotNone(bind_names)
            self.assertIsInstance(bind_names, list)
            self.assertTrue(len(bind_names) == len(valid_input))

    def test_get_bind_names_invalid_inputs(self):
        invalid_inputs = [
            "",
            123,
            {},
        ]
        for invalid_input in invalid_inputs:
            with self.assertRaises(TypeError):
                bind_names = utils.get_bind_names(invalid_input)

    def test_get_filters_valid_inputs(self):
        valid_inputs = [
            [""],
            ["1", "2"],
        ]
        for valid_input in valid_inputs:
            filters, bind_names, filters_safe_sql = utils.get_filters(valid_input)
            self.assertIsNotNone(filters)
            self.assertIsNotNone(bind_names)
            self.assertIsNotNone(filters_safe_sql)
            self.assertIsInstance(filters, list)
            self.assertIsInstance(bind_names, list)
            self.assertIsInstance(filters_safe_sql, str)
            self.assertTrue(len(filters) == len(bind_names))
            self.assertTrue(len(filters_safe_sql) != 0)

    def test_get_filters_invalid_inputs(self):
        invalid_inputs = [
            "",
            123,
            {},
        ]
        for invalid_input in invalid_inputs:
            with self.assertRaises(TypeError):
                filters, bind_names, filters_safe_sql = utils.get_filters(invalid_input)
        

class APIIntegrationTestCase(TransactionTestCase):
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


class RequestTransfusedUnitsTestCase(TransactionTestCase):
    endpoint = "/api/request_transfused_units"

    def setUp(self):
        # Setup run before every test method.
        c = Client()

    def tearDown(self):
        # Clean up run after every test method.
        pass

    def test_request_transfused_units_no_params(self):
        response = c.get(self.endpoint)
        self.assertEqual(response.status_code, 400)

    def test_risk_score_unsupported_methods(self):
        response = c.post(self.endpoint)
        self.assertEqual(response.status_code, 405)
        
        response = c.head(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = c.options(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = c.put(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = c.patch(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = c.delete(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = c.trace(self.endpoint)
        self.assertEqual(response.status_code, 405)

    def test_request_transfused_units_missing_transfusion_type(self):
        response = c.get(
            self.endpoint,
            { "year_range": "2016,2017" },
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.content.decode(),
            "transfusion_type and year_range must be supplied."
        )

    def test_request_transfused_units_missing_year_range(self):
        response = c.get(
            self.endpoint,
            { "transfusion_type": "PRBC_UNITS" },
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.content.decode(),
            "transfusion_type and year_range must be supplied.",
        )

    def test_request_transfused_units_invalid_year_ranges(self):
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
            response = c.get(
                self.endpoint,
                {
                    "transfusion_type": "PRBC_UNITS", 
                    "year_range": invalid_option,
                },
            )
            self.assertEqual(response.status_code, 400)
            self.assertEqual(
                response.content.decode(),
                "transfusion_type and year_range must be supplied.",
            )

    def test_request_transfused_units_invalid_transfusion_types(self):
        invalid_options = [
            "'PRBC_UNITS'"
            "invalid",
            None,
        ]

        for invalid_option in invalid_options:
            response = c.get(
                self.endpoint,
                {
                    "transfusion_type": invalid_option, 
                    "year_range": "2016,2017",
                },
            )
            self.assertEqual(response.status_code, 400)
            self.assertEqual(
                response.content.decode(),
                "transfusion_type must be one of the following: ['PRBC_UNITS', 'FFP_UNITS', 'PLT_UNITS', 'CRYO_UNITS', 'CELL_SAVER_ML', 'ALL_UNITS']",
            )

    def test_request_transfused_units_invalid_aggregate_types(self):
        invalid_options = [
            "'YEAR'"
            "invalid",
            None,
        ]

        for invalid_option in invalid_options:
            response = c.get(
                self.endpoint,
                {
                    "transfusion_type": "PRBC_UNITS", 
                    "year_range": "2016,2017", 
                    "aggregated_by": invalid_option,
                },
            )
            self.assertEqual(response.status_code, 400)
            self.assertEqual(
                response.content.decode(),
                "If you use aggregated_by, it must be one of the following: ['YEAR', 'SURGEON_ID', 'ANESTHESIOLOGIST_ID']",
            )

    def test_request_transfused_units_invalid_all_units_with_agg(self):
        response = c.get(
            self.endpoint,
            {
                "transfusion_type": "ALL_UNITS", 
                "year_range": "2016,2017", 
                "aggregated_by": "YEAR",
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.content.decode(),
            "Requesting ALL_UNITS with an aggregation is unsupported, please query each unit type individually."
        )

    def test_request_transfused_units_valid_types(self):
        valid_options = [
            { # Minimum viable
                "transfusion_type": "PRBC_UNITS", 
                "year_range": "2016,2017", 
            },
            { # Different year_range
                "transfusion_type": "PRBC_UNITS", 
                "year_range": "2017,2018", 
            },
            { # Different transfusion_type (should test them all)
                "transfusion_type": "ALL_UNITS", 
                "year_range": "2016,2017", 
            },
            { # Add aggregation
                "transfusion_type": "PRBC_UNITS", 
                "year_range": "2016,2017", 
                "aggregated_by": "YEAR",
            },
            { # Different aggregation
                "transfusion_type": "PRBC_UNITS", 
                "year_range": "2016,2017", 
                "aggregated_by": "SURGEON_ID",
            },
            { # One patient ID
                "transfusion_type": "PRBC_UNITS", 
                "year_range": "2016,2017", 
                "patient_ids": "585148403",
            },
            { # Multiple pats
                "transfusion_type": "PRBC_UNITS", 
                "year_range": "2016,2017", 
                "patient_ids": "585148403,81015617,632559101",
            },
            { # One patient ID
                "transfusion_type": "PRBC_UNITS", 
                "year_range": "2016,2017", 
                "case_ids": "85103152",
            },
            { # One multiple pats
                "transfusion_type": "PRBC_UNITS", 
                "year_range": "2016,2017", 
                "case_ids": "85103152,74712769",
            },
            { # One filter_selection
                "transfusion_type": "PRBC_UNITS", 
                "year_range": "2016,2017", 
                "filter_selection": "REPLACE AORTIC VALVE PERQ FEMORAL ARTRY APPROACH",
            },
            { # Multiple filter_selection
                "transfusion_type": "PRBC_UNITS", 
                "year_range": "2016,2017", 
                "filter_selection": "REPLACE AORTIC VALVE PERQ FEMORAL ARTRY APPROACH,CORONARY ARTERY BYPASS 1 CORONARY VENOUS GRAFT",
            },
            { # Full example
                "transfusion_type": "PRBC_UNITS", 
                "year_range": "2016,2017", 
                "patient_ids": "68175619,14711172,35383429,632559101",
                "case_ids": "85103152",
                "filter_selection": "REPLACE AORTIC VALVE PERQ FEMORAL ARTRY APPROACH,CORONARY ARTERY BYPASS 1 CORONARY VENOUS GRAFT",
                "aggregated_by": "YEAR",
            },
            { # Full example ALL_UNITS - no agg
                "transfusion_type": "ALL_UNITS", 
                "year_range": "2016,2017", 
                "patient_ids": "68175619,14711172,35383429,632559101",
                "case_ids": "85103152",
                "filter_selection": "REPLACE AORTIC VALVE PERQ FEMORAL ARTRY APPROACH,CORONARY ARTERY BYPASS 1 CORONARY VENOUS GRAFT",
            },
        ]

        for valid_option in valid_options:
            response = c.get(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 200)

class RiskScoreTestCase(TransactionTestCase):
    endpoint = "/api/risk_score"

    def setUp(self):
        # Setup run before every test method.
        c = Client()

    def tearDown(self):
        # Clean up run after every test method.
        pass

    def test_risk_score_unsupported_methods(self):
        response = c.post(self.endpoint)
        self.assertEqual(response.status_code, 405)
        
        response = c.head(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = c.options(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = c.put(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = c.patch(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = c.delete(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = c.trace(self.endpoint)
        self.assertEqual(response.status_code, 405)

    def test_risk_score_no_params(self):
        response = c.get(self.endpoint)
        self.assertEqual(response.status_code, 400)

    def test_risk_score_valid_types(self):
        valid_options = [
            {"patient_ids": "880078673"},
            {"patient_ids": "880078673,865124568"},
        ]

        for valid_option in valid_options:
            response = c.get(
                "/api/risk_score",
                valid_option,
            )
            self.assertEqual(response.status_code, 200)
