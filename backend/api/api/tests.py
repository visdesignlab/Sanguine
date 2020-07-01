# Util unit tests and API integration tests
import ast

from django.test import TransactionTestCase, TestCase, Client
from django.contrib.auth.models import User
import api.utils as utils


class UtilUnitTestCase(TestCase):
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
        

class LoginLogoutFlowTestCase(TestCase):
    def setUp(self):
        self.c = Client()

    def test_login_logout(self):
        test_user = User.objects.create_user('test_user', 'myemail@test.com', 'test_password')
        logged_in_test_user = self.c.login(username = 'test_user', password = 'test_password')
        self.assertTrue(logged_in_test_user)

        self.c.logout()


class NoParamRoutesTestCaseLoggedOut(TransactionTestCase):
    def setUp(self):
        self.c = Client()

    def test_get_api_root(self):
        response = self.c.get("/api/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode(),
            "Bloodvis API endpoint. Please use the client application to access the data here.",
        )

    def test_get_attributes(self):
        response = self.c.get("/api/get_attributes")
        self.assertEqual(response.status_code, 302)

    def test_hemoglobin(self):
        response = self.c.get("/api/hemoglobin")
        self.assertEqual(response.status_code, 302)


class NoParamRoutesTestCaseLoggedIn(TransactionTestCase):
    def setUp(self):
        self.c = Client()
        User.objects.create_user('test_user', 'myemail@test.com', 'test_password')
        self.c.login(username = 'test_user', password = 'test_password')

    def test_get_api_root(self):
        response = self.c.get("/api/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode(),
            "Bloodvis API endpoint. Please use the client application to access the data here.",
        )

    def test_get_attributes(self):
        response = self.c.get("/api/get_attributes")
        self.assertEqual(response.status_code, 200)

    def test_hemoglobin(self):
        response = self.c.get("/api/hemoglobin")
        self.assertEqual(response.status_code, 200)


class RequestSurgeryTestCaseLoggedOut(TransactionTestCase):
    endpoint = "/api/fetch_surgery"

    def setUp(self):
        self.c = Client()

    def test_request_surgery_unsupported_methods(self):
        response = self.c.post(self.endpoint)
        self.assertEqual(response.status_code, 302)
        
        response = self.c.head(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.options(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.put(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.patch(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.delete(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.trace(self.endpoint)
        self.assertEqual(response.status_code, 302)

    def test_request_surgery_no_params(self):
        response = self.c.get(self.endpoint)
        self.assertEqual(response.status_code, 302)

    def test_request_surgery_valid_types(self):
        valid_options = [
            {
                "case_id": "56520625",
            },
        ]

        for valid_option in valid_options:
            response = self.c.get(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 302)


class RequestSurgeryTestCaseLoggedIn(TransactionTestCase):
    endpoint = "/api/fetch_surgery"

    def setUp(self):
        self.c = Client()
        User.objects.create_user('test_user', 'myemail@test.com', 'test_password')
        self.c.login(username = 'test_user', password = 'test_password')

    def test_request_surgery_unsupported_methods(self):
        response = self.c.post(self.endpoint)
        self.assertEqual(response.status_code, 405)
        
        response = self.c.head(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.options(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.put(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.patch(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.delete(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.trace(self.endpoint)
        self.assertEqual(response.status_code, 405)

    def test_request_surgery_no_params(self):
        response = self.c.get(self.endpoint)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.content.decode(),
            "case_id must be supplied.",
        )

    def test_request_surgery_valid_types(self):
        valid_options = [
            {
                "case_id": "56520625",
            },
        ]

        for valid_option in valid_options:
            response = self.c.get(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 200)


class RequestPatientTestCaseLoggedOut(TransactionTestCase):
    endpoint = "/api/fetch_patient"

    def setUp(self):
        self.c = Client()

    def test_request_patient_unsupported_methods(self):
        response = self.c.post(self.endpoint)
        self.assertEqual(response.status_code, 302)
        
        response = self.c.head(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.options(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.put(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.patch(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.delete(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.trace(self.endpoint)
        self.assertEqual(response.status_code, 302)

    def test_request_patient_no_params(self):
        response = self.c.get(self.endpoint)
        self.assertEqual(response.status_code, 302)

    def test_request_patient_valid_types(self):
        valid_options = [
            {
                "patient_id": "119801570",
            },
        ]

        for valid_option in valid_options:
            response = self.c.get(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 302)


class RequestPatientTestCaseLoggedIn(TransactionTestCase):
    endpoint = "/api/fetch_patient"

    def setUp(self):
        self.c = Client()
        User.objects.create_user('test_user', 'myemail@test.com', 'test_password')
        self.c.login(username = 'test_user', password = 'test_password')

    def test_request_patient_unsupported_methods(self):
        response = self.c.post(self.endpoint)
        self.assertEqual(response.status_code, 405)
        
        response = self.c.head(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.options(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.put(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.patch(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.delete(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.trace(self.endpoint)
        self.assertEqual(response.status_code, 405)

    def test_request_patient_no_params(self):
        response = self.c.get(self.endpoint)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.content.decode(),
            "patient_id must be supplied.",
        )

    def test_request_patient_valid_types(self):
        valid_options = [
            {
                "patient_id": "119801570",
            },
        ]

        for valid_option in valid_options:
            response = self.c.get(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 200)


class RequestTransfusedUnitsTestCaseLoggedOut(TransactionTestCase):
    endpoint = "/api/request_transfused_units"

    def setUp(self):
        self.c = Client()

    def test_request_transfused_units_no_params(self):
        response = self.c.get(self.endpoint)
        self.assertEqual(response.status_code, 302)

    def test_risk_score_unsupported_methods(self):
        response = self.c.post(self.endpoint)
        self.assertEqual(response.status_code, 302)
        
        response = self.c.head(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.options(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.put(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.patch(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.delete(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.trace(self.endpoint)
        self.assertEqual(response.status_code, 302)

    def test_request_transfused_units_missing_transfusion_type(self):
        response = self.c.get(
            self.endpoint,
            { "date_range": "01-JAN-2016,31-DEC-2017" },
        )
        self.assertEqual(response.status_code, 302)

    def test_request_transfused_units_missing_date_range(self):
        response = self.c.get(
            self.endpoint,
            { "transfusion_type": "PRBC_UNITS" },
        )
        self.assertEqual(response.status_code, 302)

    def test_request_transfused_units_invalid_date_ranges(self):
        invalid_options = [
            "2016",
            "2016,",
            ",2016",
            "2016,2017,2018",
            ",",
            "a,b",
            "a,",
            ",b",
            "",
            "01-MST-2021",
            "1-APR-2020",
            "31-FEB-2020"
        ]

        for invalid_option in invalid_options:
            response = self.c.get(
                self.endpoint,
                {
                    "transfusion_type": "PRBC_UNITS", 
                    "date_range": invalid_option,
                },
            )
            self.assertEqual(response.status_code, 302)

    def test_request_transfused_units_invalid_transfusion_types(self):
        invalid_options = [
            "'PRBC_UNITS'"
            "invalid",
        ]

        for invalid_option in invalid_options:
            response = self.c.get(
                self.endpoint,
                {
                    "transfusion_type": invalid_option, 
                    "date_range": "01-JAN-2016,31-DEC-2017",
                },
            )
            self.assertEqual(response.status_code, 302)

    def test_request_transfused_units_invalid_aggregate_types(self):
        invalid_options = [
            "'YEAR'"
            "invalid",
        ]

        for invalid_option in invalid_options:
            response = self.c.get(
                self.endpoint,
                {
                    "transfusion_type": "PRBC_UNITS", 
                    "date_range": "01-JAN-2016,31-DEC-2017", 
                    "aggregated_by": invalid_option,
                },
            )
            self.assertEqual(response.status_code, 302)

    def test_request_transfused_units_invalid_all_units_with_agg(self):
        response = self.c.get(
            self.endpoint,
            {
                "transfusion_type": "ALL_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "aggregated_by": "YEAR",
            },
        )
        self.assertEqual(response.status_code, 302)

    def test_request_transfused_units_valid_types(self):
        valid_options = [
            { # Minimum viable
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
            },
            { # Different date_range
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2017,31-DEC-2018", 
            },
            { # Different transfusion_type (should test them all)
                "transfusion_type": "ALL_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
            },
            { # Add aggregation
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "aggregated_by": "YEAR",
            },
            { # Different aggregation
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "aggregated_by": "SURGEON_ID",
            },
            { # One patient ID
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "patient_ids": "585148403",
            },
            { # Multiple pats
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "patient_ids": "585148403,81015617,632559101",
            },
            { # One patient ID
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "case_ids": "85103152",
            },
            { # One multiple pats
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "case_ids": "85103152,74712769",
            },
            { # One filter_selection
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "filter_selection": "Musculoskeletal Thoracic Procedure",
            },
            { # Multiple filter_selection
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "filter_selection": "Musculoskeletal Thoracic Procedure,Thoracotomy/Lung Procedure",
            },
            { # Full example
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "patient_ids": "68175619,14711172,35383429,632559101",
                "case_ids": "85103152",
                "filter_selection": "Musculoskeletal Thoracic Procedure,Thoracotomy/Lung Procedure",
                "aggregated_by": "YEAR",
            },
            { # Full example ALL_UNITS - no agg
                "transfusion_type": "ALL_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "patient_ids": "68175619,14711172,35383429,632559101",
                "case_ids": "85103152",
                "filter_selection": "Musculoskeletal Thoracic Procedure,Thoracotomy/Lung Procedure",
            },
        ]

        for valid_option in valid_options:
            response = self.c.get(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 302)


class RequestTransfusedUnitsTestCaseLoggedIn(TransactionTestCase):
    endpoint = "/api/request_transfused_units"

    def setUp(self):
        self.c = Client()
        User.objects.create_user('test_user', 'myemail@test.com', 'test_password')
        self.c.login(username = 'test_user', password = 'test_password')

    def test_request_transfused_units_no_params(self):
        response = self.c.get(self.endpoint)
        self.assertEqual(response.status_code, 400)

    def test_risk_score_unsupported_methods(self):
        response = self.c.post(self.endpoint)
        self.assertEqual(response.status_code, 405)
        
        response = self.c.head(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.options(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.put(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.patch(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.delete(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.trace(self.endpoint)
        self.assertEqual(response.status_code, 405)

    def test_request_transfused_units_missing_transfusion_type(self):
        response = self.c.get(
            self.endpoint,
            { "date_range": "01-JAN-2016,31-DEC-2017" },
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.content.decode(),
            "transfusion_type must be supplied."
        )

    def test_request_transfused_units_missing_date_range(self):
        response = self.c.get(
            self.endpoint,
            { "transfusion_type": "PRBC_UNITS" },
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.content.decode(),
            "date_range is improperly formatted. It must look like: 09-JAN-2019,31-DEC-2020",
        )

    def test_request_transfused_units_invalid_date_ranges(self):
        invalid_options = [
            "2016",
            "2016,",
            ",2016",
            "2016,2017,2018",
            ",",
            "a,b",
            "a,",
            ",b",
            "",
            "01-MST-2021",
            "1-APR-2020",
            "31-FEB-2020"
        ]

        for invalid_option in invalid_options:
            response = self.c.get(
                self.endpoint,
                {
                    "transfusion_type": "PRBC_UNITS", 
                    "date_range": invalid_option,
                },
            )
            self.assertEqual(response.status_code, 400)
            self.assertEqual(
                response.content.decode(),
                "date_range is improperly formatted. It must look like: 09-JAN-2019,31-DEC-2020",
            )

    def test_request_transfused_units_invalid_transfusion_types(self):
        invalid_options = [
            "'PRBC_UNITS'"
            "invalid",
        ]

        for invalid_option in invalid_options:
            response = self.c.get(
                self.endpoint,
                {
                    "transfusion_type": invalid_option, 
                    "date_range": "01-JAN-2016,31-DEC-2017",
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
        ]

        for invalid_option in invalid_options:
            response = self.c.get(
                self.endpoint,
                {
                    "transfusion_type": "PRBC_UNITS", 
                    "date_range": "01-JAN-2016,31-DEC-2017", 
                    "aggregated_by": invalid_option,
                },
            )
            self.assertEqual(response.status_code, 400)
            self.assertEqual(
                response.content.decode(),
                "If you use aggregated_by, it must be one of the following: ['YEAR', 'SURGEON_ID', 'ANESTHESIOLOGIST_ID']",
            )

    def test_request_transfused_units_invalid_all_units_with_agg(self):
        response = self.c.get(
            self.endpoint,
            {
                "transfusion_type": "ALL_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
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
                "date_range": "01-JAN-2016,31-DEC-2017", 
            },
            { # Different date_range
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2017,31-DEC-2018", 
            },
            { # Different transfusion_type (should test them all)
                "transfusion_type": "ALL_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
            },
            { # Add aggregation
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "aggregated_by": "YEAR",
            },
            { # Different aggregation
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "aggregated_by": "SURGEON_ID",
            },
            { # One patient ID
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "patient_ids": "585148403",
            },
            { # Multiple pats
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "patient_ids": "585148403,81015617,632559101",
            },
            { # One patient ID
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "case_ids": "85103152",
            },
            { # One multiple pats
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "case_ids": "85103152,74712769",
            },
            { # One filter_selection
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "filter_selection": "Musculoskeletal Thoracic Procedure",
            },
            { # Multiple filter_selection
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "filter_selection": "Musculoskeletal Thoracic Procedure,Thoracotomy/Lung Procedure",
            },
            { # Full example
                "transfusion_type": "PRBC_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "patient_ids": "68175619,14711172,35383429,632559101",
                "case_ids": "85103152",
                "filter_selection": "Musculoskeletal Thoracic Procedure,Thoracotomy/Lung Procedure",
                "aggregated_by": "YEAR",
            },
            { # Full example ALL_UNITS - no agg
                "transfusion_type": "ALL_UNITS", 
                "date_range": "01-JAN-2016,31-DEC-2017", 
                "patient_ids": "68175619,14711172,35383429,632559101",
                "case_ids": "85103152",
                "filter_selection": "Musculoskeletal Thoracic Procedure,Thoracotomy/Lung Procedure",
            },
        ]

        for valid_option in valid_options:
            response = self.c.get(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 200)


class RiskScoreTestCaseLoggedOut(TransactionTestCase):
    endpoint = "/api/risk_score"

    def setUp(self):
        self.c = Client()

    def test_risk_score_unsupported_methods(self):
        response = self.c.post(self.endpoint)
        self.assertEqual(response.status_code, 302)
        
        response = self.c.head(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.options(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.put(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.patch(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.delete(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.trace(self.endpoint)
        self.assertEqual(response.status_code, 302)

    def test_risk_score_no_params(self):
        response = self.c.get(self.endpoint)
        self.assertEqual(response.status_code, 302)

    def test_risk_score_valid_types(self):
        valid_options = [
            {"patient_ids": "880078673"},
            {"patient_ids": "880078673,865124568"},
        ]

        for valid_option in valid_options:
            response = self.c.get(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 302)


class RiskScoreTestCaseLoggedIn(TransactionTestCase):
    endpoint = "/api/risk_score"

    def setUp(self):
        self.c = Client()
        User.objects.create_user('test_user', 'myemail@test.com', 'test_password')
        self.c.login(username = 'test_user', password = 'test_password')

    def test_risk_score_unsupported_methods(self):
        response = self.c.post(self.endpoint)
        self.assertEqual(response.status_code, 405)
        
        response = self.c.head(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.options(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.put(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.patch(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.delete(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.trace(self.endpoint)
        self.assertEqual(response.status_code, 405)

    def test_risk_score_no_params(self):
        response = self.c.get(self.endpoint)
        self.assertEqual(response.status_code, 200)

    def test_risk_score_valid_types(self):
        valid_options = [
            {"patient_ids": "880078673"},
            {"patient_ids": "880078673,865124568"},
        ]

        for valid_option in valid_options:
            response = self.c.get(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 200)


class PatientOutcomesTestCaseLoggedOut(TransactionTestCase):
    endpoint = "/api/patient_outcomes"

    def setUp(self):
        self.c = Client()

    def test_risk_score_unsupported_methods(self):
        response = self.c.post(self.endpoint)
        self.assertEqual(response.status_code, 302)
        
        response = self.c.head(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.options(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.put(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.patch(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.delete(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.trace(self.endpoint)
        self.assertEqual(response.status_code, 302)

    def test_risk_score_no_params(self):
        response = self.c.get(self.endpoint)
        self.assertEqual(response.status_code, 302)

    def test_risk_score_valid_types(self):
        valid_options = [
            {"patient_ids": "880078673"},
            {"patient_ids": "880078673,865124568"},
        ]

        for valid_option in valid_options:
            response = self.c.get(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 302)


class PatientOutcomesTestCaseLoggedIn(TransactionTestCase):
    endpoint = "/api/patient_outcomes"

    def setUp(self):
        self.c = Client()
        User.objects.create_user('test_user', 'myemail@test.com', 'test_password')
        self.c.login(username = 'test_user', password = 'test_password')

    def test_risk_score_unsupported_methods(self):
        response = self.c.post(self.endpoint)
        self.assertEqual(response.status_code, 405)
        
        response = self.c.head(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.options(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.put(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.patch(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.delete(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.trace(self.endpoint)
        self.assertEqual(response.status_code, 405)

    def test_risk_score_no_params(self):
        response = self.c.get(self.endpoint)
        self.assertEqual(response.status_code, 200)

    def test_risk_score_valid_types(self):
        valid_options = [
            {"patient_ids": "880078673"},
            {"patient_ids": "880078673,865124568"},
        ]

        for valid_option in valid_options:
            response = self.c.get(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 200)


class StateTestCaseLoggedOut(TransactionTestCase):
    endpoint = "/api/state"

    def setUp(self):
        self.c = Client()

    def test_state_unsupported_methods(self):
        response = self.c.head(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.options(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.patch(self.endpoint)
        self.assertEqual(response.status_code, 302)

        response = self.c.trace(self.endpoint)
        self.assertEqual(response.status_code, 302)

    def test_state_post_valid_types(self):
        valid_options = [
            {"name": "test1", "definition": "this is a really long text string. this is a really long text string. "},
            {"name": "test 2", "definition": "{'type': 'example json object', 'prop': 'value', 'list': []}"},
        ]

        for valid_option in valid_options:
            response = self.c.post(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 302)

    def test_state_get_valid_types(self):
        # Post an example
        valid_options = [
            {"name": "test1", "definition": "this is a really long text string. this is a really long text string. "},
        ]

        for valid_option in valid_options:
            response = self.c.post(
                self.endpoint,
                valid_option,
            )

        # Get that data back
        valid_options = [
            {},
            {"name": "test1"},
        ]

        for valid_option in valid_options:
            response = self.c.get(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 302)

    def test_state_update_valid_types(self):
        # Make a valid state
        valid_option = {"name": "test1", "definition": "{'type': 'example json object', 'prop': 'value', 'list': []}"}
        response = self.c.post(self.endpoint, valid_option)

        # Update that state changing definition, and then definition and name
        valid_options = [
            {"old_name": "test1", "new_name": "test1", "new_definition": "update1"},
            {"old_name": "test1", "new_name": "test2", "new_definition": "update2"},
        ]

        for valid_option in valid_options:
            response = self.c.put(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 302)

    def test_state_delete_valid_types(self):
        # Make a valid state
        valid_option = {"name": "test1", "definition": "{'type': 'example json object', 'prop': 'value', 'list': []}"}
        response = self.c.post(self.endpoint, valid_option)

        # Delete that state 
        valid_options = [
            {"name": "test1"}
        ]

        for valid_option in valid_options:
            response = self.c.delete(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 302)


class StateTestCaseLoggedIn(TransactionTestCase):
    endpoint = "/api/state"

    def setUp(self):
        self.c = Client()
        User.objects.create_user('test_user', 'myemail@test.com', 'test_password')
        self.c.login(username = 'test_user', password = 'test_password')

    def test_state_unsupported_methods(self):
        response = self.c.head(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.options(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.patch(self.endpoint)
        self.assertEqual(response.status_code, 405)

        response = self.c.trace(self.endpoint)
        self.assertEqual(response.status_code, 405)

    def test_state_post_valid_types(self):
        valid_options = [
            {"name": "test1", "definition": "this is a really long text string. this is a really long text string. "},
            {"name": "test 2", "definition": "{'type': 'example json object', 'prop': 'value', 'list': []}"},
        ]

        for valid_option in valid_options:
            response = self.c.post(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.content.decode(), "state object created")

    def test_state_get_valid_types(self):
        # Post an example
        valid_options = [
            {"name": "test1", "definition": "this is a really long text string. this is a really long text string. "},
        ]

        for valid_option in valid_options:
            response = self.c.post(
                self.endpoint,
                valid_option,
            )

        # Get that data back
        valid_options = [
            {},
            {"name": "test1"},
        ]

        for valid_option in valid_options:
            response = self.c.get(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 200)

    def test_state_update_valid_types(self):
        # Make a valid state
        valid_option = {"name": "test1", "definition": "{'type': 'example json object', 'prop': 'value', 'list': []}"}
        response = self.c.post(self.endpoint, valid_option)

        # Update that state changing definition, and then definition and name
        valid_options = [
            {"old_name": "test1", "new_name": "test1", "new_definition": "update1"},
            {"old_name": "test1", "new_name": "test2", "new_definition": "update2"},
        ]

        for valid_option in valid_options:
            response = self.c.put(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.content.decode(), "state object updated")

            response = self.c.get(
                self.endpoint,
                {"name": valid_option["new_name"]}
            )
            self.assertEqual(ast.literal_eval(response.content.decode())["definition"], valid_option["new_definition"])
            self.assertEqual(ast.literal_eval(response.content.decode())["name"], valid_option["new_name"])

    def test_state_delete_valid_types(self):
        # Make a valid state
        valid_option = {"name": "test1", "definition": "{'type': 'example json object', 'prop': 'value', 'list': []}"}
        response = self.c.post(self.endpoint, valid_option)

        # Delete that state 
        valid_options = [
            {"name": "test1"}
        ]

        for valid_option in valid_options:
            response = self.c.delete(
                self.endpoint,
                valid_option,
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.content.decode(), "state object deleted")

            response = self.c.get(
                self.endpoint,
                {}
            )
            self.assertEqual(ast.literal_eval(response.content.decode()),[])
