# Bloodvis API Server

An API server for the Bloodvis application.

## Table of Contents

1. [Development Environment Quick Start](#development-environment-quick-start)
1. [Deploying In Production](#deploying-in-production)
1. [Route Documentation](#route-documentation)
1. [Data Dictionary](#data-dictionary)
1. [Testing](#testing)
1. [Logging](#logging)

## Development Environment Quick Start

This API uses pipenv and django to serve up the dynamically queried data. To install all the needed packages, please make sure you have pipenv installed globally.  If you need instructions for setting it up, check [here](https://pipenv.pypa.io/en/latest/install/#installing-pipenv). Once  pipenv is installed, you can set up a virtual environment and install all python dependencies with `pipenv install`.

Once pipenv has finished setting up, run `pipenv run serve` to run a local development server at http://127.0.0.1:8000/.

**NOTE**: You will need access to the University of Utah health records database with a VPN to query any data. You will also need to set the credentials for the data warehouse

## MYSQL

To store sessions data, we're using mysql. There are a couple of commands required to set everything up

```
# Create a user
CREATE USER '<user>'@'<host>' IDENTIFIED BY '<password>';

# Create a db
CREATE DATABASE bloodviswebapp CHARACTER SET utf8 COLLATE utf8_bin;

# Grant privileges
GRANT ALL PRIVILEGES ON bloodviswebapp.* to '<user>'@'<host>';
```

## Deploying In Production

To deploy in production, there are a number of dependencies. Of course, we'll need python3 and pipenv to start. We'll also need mysql running on the backend server with the correct username and password defined in the .env file.

## Route Documentation 

There are several routes set up for accessing the patient and surgery data. Here are the names, allowed methods, parameters, descriptions, and examples:

- Name: `api/admin` (From [django admin module](https://docs.djangoproject.com/en/2.2/ref/contrib/admin/))
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Access through a browser to manage users.
  - Example:
    ```
    curl '127.0.0.1:8000/admin'
    ```

- Name: `api/accounts/*` (From [django auth module](https://docs.djangoproject.com/en/2.2/topics/auth/))
  - Allowed Methods: `POST, GET, PUT, DELETE` 
  - Parameters: `None`
  - Description: Manage your own account, reset passwords, login, logout, etc.
  - Example:
    ```
    curl '127.0.0.1:8000/accounts/{login,logout,etc.}'
    ```

- Name: `/api/whoami` 
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Base API endpoint. Returns user email and 200.
    ```
    curl '127.0.0.1:8000/api/whoami'
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
        `date_range`: A comma separated list of 2 dates in oracle db date format.
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

- Name: `/api/risk_score`
  - Allowed Methods: `GET`
  - Parameters:  
    `patient_ids`: A comma separated list of patient ids.  
  - Description: Takes patient ids and returns a list of APR_DRG values such as overall risk of mortality.
  - Example:
    ```
    curl '127.0.0.1:8000/api/risk_score?patient_ids=68175619,14711172,35383429,632559101'
    ```

- Name: `/api/patient_outcomes`
  - Allowed Methods: `GET`
  - Parameters:  
    `patient_ids`: A comma separated list of patient ids.  
  - Description: WIP. Takes patient ids as input. Currently returns 2 values, whether a patient has died or not and if they spent 1440 minutes on a ventilator (24 hours).
  - Example:
    ```
    curl '127.0.0.1:8000/api/patient_outcomes?patient_ids=68175619,14711172,35383429,632559101'
    ```

- Name: `/api/state`
  - Allowed Methods: `GET, POST, PUT, DELETE`
  - Parameters:  
    `name`: The name of the state object.  
    `definition`: The state definition, usually the string from our provenance library.  
    `public`: true/false indicating whether the state should be public
  - Description: Handles state saving into a database on the backend. A GET will retrieve the state object by name. A POST creates a state object. A PUT updates a state object. Finally, a DELETE will delete a state object. The required parameters for each type of request are documented in the examples.
  - Example:
    ```
    # GET
    curl -X GET '127.0.0.1:8000/api/state?name=example_state'

    # POST
    curl -X POST '127.0.0.1:8000/api/state' \ 
      -F "name=example_state" \
      -F "definition=foo" \
      -F "public=true"
    
    # PUT
    curl -X PUT '127.0.0.1:8000/api/state' \ 
      -H "Content-Type: application/json" \
      -d '{"old_name": "example_state", "new_name": "a_new_state", "new_definition": "foo", "new_public": "false"}'
    
    # DELETE
    curl -X DELETE '127.0.0.1:8000/api/state' \ 
      -H "Content-Type: application/json" \
      -d '{"name": "example_state"}'
    ```

- Name: `/api/share_state`
  - Allowed Methods: `POST`
  - Parameters:  
    `name`: The name of the state object.  
    `role`: Role type. "WR" for writers and "RE" for readers.  
    `user`: uid of person to share with.
  - Description: Shares access of state to another user with reader or writer privileges. Making 2 requests will update the user to the most recent request role.
  - Example:
    ```
    curl -X POST '127.0.0.1:8000/api/share_state' \ 
      -F "name=example_state" \
      -F "user=test1" \
      -F "role=WR"
    ```

- Name: `/api/state_unids`
  - Allowed Methods: `GET`
  - Parameters:  
    `state_name`: The name of the state object. 
  - Description: Returns the owner of the workspace and all users with permissions. For users that are not the owner, this route returns their access level as 'RE' or 'WR'.
  - Example:
    ```
    curl -X POST '127.0.0.1:8000/api/share_state' \ 
      -F "state_name=example_state" 
    ```

## Data Dictionary

For Sanguine to work as expected, the application expects data in a specific format. See [data_dictionary.csv](api/data_dictionary.csv) for column descriptions. We required the following columns:

- ADMINISTERED_DOSE: STRING
- ANESTHESIOLOGIST_ID: NUMBER
- APR_DRG_WEIGHT: NUMBER
- APR_DRG_CODE: STRING
- APR_DRG_DESC: STRING
- APR_DRG_ROM: STRING
- APR_DRG_SOI: STRING
- BIRTH_DATE: DATE
- BILLING_CODE: STRING
- CASE_DATE: DATE
- CASE_ID: NUMBER
- DEATH_DATE: DATE 
- DOSE_UNIT_DESC: STRING
- DRAW_DTM: DATETIME
- ETHNICITY_CODE: NUMBER
- ETHNICITY_DESC: STRING
- GENDER_CODE: NUMBER
- GENDER_DESC: STRING
- MEDICATION_ID: NUMBER
- PATIENT_ID: NUMBER
- PATIENT_EXPIRED: BOOLEAN
- POST_OP_ICU_LOS: NUMBER
- PRESENT_ON_ADMISSION: BOOLEAN
- PRIM_PROC_DESC: STRING
- PROCEDURE_DATETIME: DATETIME
- RACE_CODE: NUMBER
- RACE_DESC: STRING
- RESULT_CODE: STRING
- RESULT_DESC: STRING
- RESULT_DTM: DATETIME
- RESULT_VALUE: STRING 
- SCHED_SITE_DESC: STRING
- SURGEON_ID: NUMBER
- SURGERY_ELAPSED: NUMBER
- SURGERY_END_DATETIME: DATETIME
- SURGERY_START_DATETIME: DATETIME
- SURGERY_TYPE: STRING
- TOTAL_VENT_MINS: NUMBER
- VISIT_NUMBER: NUMBER

Please see the ERD.png in this folder to understand how we expect the data to be related.

## Testing

We supply tests for all of the endpoints we provide using coverage.py. If you are updating the code and want to maintain the same functionality, our tests should help you do that. You can run the tests with `pipenv run test`.

## Logging

As a security measure, we support logging through the standard python logging module. The logs make note of all access to the endpoints, and which parameters were passed through.
