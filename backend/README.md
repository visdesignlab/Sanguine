# Bloodvis API Server

An API server for the Bloodvis application.

## Table of Contents

1. [Development Environment Quick Start](#development-environment-quick-start)
1. [Deploying In Production](#deploying-in-production)
1. [Route Documentation](#route-documentation)
1. [Testing](#testing)

## Development Environment Quick Start

This API uses pipenv and django to serve up the dynamically queried data. To install all the needed packages please make sure you have pipenv installed globally.  If you need instructions for setting it up, check [here](https://pipenv.pypa.io/en/latest/install/#installing-pipenv). Once  `pipenv` is installed, you can set up a virtual environment and install all python dependencies with `pipenv install`.

Once `pipenv` is set up and the .env file is set correctly, run `pipenv serve` to run a local development server at http://127.0.0.1:8000/.

**NOTE**: You will need access to the University of Utah health records database with a VPN

## Deploying In Production

Not yet applicable.

## Route Documentation 

There are several routes set up for accessing the model data. Here are the names, allowed methods, parameters, and descriptions:

- Name: `/admin`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Access through a browser to manage users.
  - Example:
    ```
    curl '127.0.0.1:8000/admin'
    ```

- Name: `/accounts/*`
  - Allowed Methods: `POST, GET`
  - Parameters: `None`
  - Description: Manage your own account, reset passwords, login, logout, etc.s
  - Example:
    ```
    curl '127.0.0.1:8000/accounts/{login,logout,etc.}'
    ```

- Name: `/api`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api'
    ```

- Name: `/api/get_attributes`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Gets all the procedure names and their frequency.
  - Example:
    ```
    curl '127.0.0.1:8000/api/get_attributes'
    ```

- Name: `/api/hemoglobin`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Returns pre and post operative hemoglobin values for all patients.
  - Example:
    ```
    curl '127.0.0.1:8000/api/hemoglobin'
    ```

- Name: `/api/request_transfused_units`
  - Allowed Methods: `GET`
  - Parameters:
    - Required:  
        `transfusion_type`: A blood product to look up. Must be one of: PRBC_UNITS, FFP_UNITS, PLT_UNITS, CRYO_UNITS, CELL_SAVER_ML, or ALL_UNITS.  
        `date_range`: A comma separated list of 2 dates in oracle db date format (e.g. 13-JAN-2020)
    - Optional:  
        `aggregated_by`: One of YEAR, SURGEON_ID, ANESTHESIOLOGIST_ID.  
        `patient_ids`: A comma separated list of patient ids.  
        `case_ids`: A comma separated list of case ids.  
        `filter_selection`: A comma separated list of procedures to filter by.
  - Description: Returns the number of transfused units in several different ways. 1) the transfused units for each case or 2), if it's aggregated, returns the different values for the aggregation along with the transfused units grouped by it and the case ids for that aggregated value.
  - Example:
    ```
    # Minimal example
    curl '127.0.0.1:8000/api/request_transfused_units?transfusion_type=PRBC_UNITS&date_range=01-JAN-2016,31-DEC-2017'
    
    # Full example
    curl '127.0.0.1:8000/api/request_transfused_units?
      transfusion_type=PRBC_UNITS&
      date_range=01-JAN-2016,31-DEC-2017&
      aggregated_by=YEAR&
      patient_ids=68175619,14711172,35383429,632559101&
      case_ids=85103152,123&
      filter_selection=Musculoskeletal Thoracic Procedure,Thoracotomy/Lung Procedure'
    ```

- Name: `/api/fetch_surgery`
  - Allowed Methods: `GET`
  - Parameters:
    `case_id`: A case id.  
  - Description: Returns a lot of information for one surgery case. This route gives case date, case start time, case end time, case elapsed time, case type description, surgeon id, anesthesiologist id, case procedure description, and ICU length of stay.
  - Example:
    ```
    curl '127.0.0.1:8000/api/fetch_surgery?case_id=85103152'
    ```

- Name: `/api/fetch_patient`
  - Allowed Methods: `GET`
  - Parameters:
    `patient_id`: A case id.  
  - Description: Returns a lot of information for one patient. This route gives birth date, gender code, gender description, race code, race description, ethnicity code, ethnicity description, and death date.
  - Example:
    ```
    curl '127.0.0.1:8000/api/fetch_patient?patient_id=68175619'
    ```

- Name: `/api/request_individual_specific`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api/request_individual_specific'
    ```

- Name: `/api/request_fetch_professional_set`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api/request_fetch_professional_set'
    ```

- Name: `/api/risk_score`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api/risk_score'
    ```

- Name: `/api/patient_outcomes`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api/patient_outcomes'
    ```

- Name: `/api/state`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api/state'
    ```

## Testing

We supply tests for all of the endpoints we provide using coverage.py. If you are updating the code and want to maintain the same functionality, our tests should help you do that. You can run the tests with `pipenv run test`.