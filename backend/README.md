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
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api/get_attributes'
    ```

- Name: `/api/hemoglobin`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api/get_attributes'
    ```

- Name: `/api/request_transfused_units`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api/get_attributes'
    ```

- Name: `/api/fetch_surgery`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api/get_attributes'
    ```

- Name: `/api/fetch_patient`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api/get_attributes'
    ```

- Name: `/api/request_individual_specific`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api/get_attributes'
    ```

- Name: `/api/request_fetch_professional_set`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api/get_attributes'
    ```

- Name: `/api/risk_score`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api/get_attributes'
    ```

- Name: `/api/patient_outcomes`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api/get_attributes'
    ```

- Name: `/api/state`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns text and a 200 to verify everything is working. Doesn't return data.
  - Example:
    ```
    curl '127.0.0.1:8000/api/get_attributes'
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