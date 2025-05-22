# Bloodvis API Server

An API server for the Bloodvis application.

## API

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

- Name: `/api/get_procedure_counts`
  - Allowed Methods: `GET`
  - Parameters: `None`
  - Description: Gets all the procedure names, their frequency, and how the co-occur with other procedures.
  - Example:
    ```
    curl '127.0.0.1:8000/api/get_procedure_counts'
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
    curl -X GET '127.0.0.1:8000/api/state_unids' \ 
      -F "state_name=example_state" 
    ```
