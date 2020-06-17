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
    - aggregated_by: One of YEAR, SURGEON_ID, ANESTHESIOLOGIST_ID.
    - transfusion_type: A blood product to look up. Must be one of: PRBC_UNITS, FFP_UNITS, PLT_UNITS, CRYO_UNITS, CELL_SAVER_ML, or ALL_UNITS.
    - patient_ids: A comma separated list of patient ids.
    - case_ids: A comma separated list of case ids.
    - date_range: A comma separated list of 2 dates in oracle db date format (e.g. 13-JAN-2020)
    - filter_selection: A comma separated list of procedures to filter by.
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    # Minimal example
    curl '127.0.0.1:8000/api/request_transfused_units?transfusion_type=PRBC_UNITS&date_range=01-JAN-2016,31-DEC-2017'
    
    # Full example
    curl '127.0.0.1:8000/api/request_transfused_units?
      aggregated_by=YEAR&
      transfusion_type=PRBC_UNITS&
      patient_ids=68175619,14711172,35383429,632559101&
      case_ids=85103152&
      date_range=01-JAN-2016,31-DEC-2017&
      filter_selection=Musculoskeletal Thoracic Procedure,Thoracotomy/Lung Procedure'
    ```

- Name: `/api/fetch_surgery`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api/fetch_surgery'
    ```

- Name: `/api/fetch_patient`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api/fetch_patient'
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


TEMPORARY TEMPLATE. TODO: REMOVE
- Name:`/api/file-upload`
  - Allowed Methods: `POST`
  - Parameters:
      - `metadata`: a json serializable object containing the following required fields:  
          `model_name`: Model name, used in visualization.  
          `author`  
          `description`  
          `model_type`: One of: "ideal_staffing", "ideal_staffing_current", or "service_allocation".  
          `start_year`: Currently, one of: 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024.  
          `end_year`: Currently, one of: 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024.  
          `step_size`: The step size for the model in years.  
          `removed_professions`: List of removed professions or [].
      - `file`: The data file that the model will use to compute supply and needs.
  - Description:
  - Return: Either "File uploaded successfully" and 201 if the upload succeeded, a 400 with a reason (usually missing parameters or file), or 500 for a model issue.
  - Example (must be run from the project root directory):
    ```
    curl \
      -X POST \
      -F 'metadata={"model_name": "new_model", "author": "me", "description": "a model", "model_type": "ideal_staffing", "start_year": 2019, "end_year": 2020, "step_size": 1, "removed_professions": []}' \
      -F 'file=@server/uploads/Workforce_Optimization_Tool_-_Input_Data.xlsx' \
      '127.0.0.1:8000/api/file-upload'
    ```
## Testing

We supply tests for all of the endpoints we provide using coverage.py. If you are updating the code and want to maintain the same functionality, our tests should help you do that. You can run the tests with `pipenv run test`.