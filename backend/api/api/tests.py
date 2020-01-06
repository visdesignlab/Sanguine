from django.test import TestCase, Client

class APITestCase(TestCase):
    def sanity_check(self):
        self.assertEqual(1, 1)

    def test_get_api_root(self):
        c = Client()
        response = c.get("/api/")
        self.assertEqual(response.status_code, 200)

    def test_get_attributes(self):
        c = Client()
        response = c.get("/api/get_attributes")
        self.assertEqual(response.status_code, 200)

    def test_summarize_with_year(self):
        c = Client()
        response = c.get("/api/summarize_with_year?x_axis=YEAR&y_axis=PRBC_UNITS&year_range=2016,2017")
        self.assertEqual(response.status_code, 200)
    
    def test_hemoglobin(self):
        c = Client()
        response = c.get("/api/hemoglobin")
        self.assertEqual(response.status_code, 200)
