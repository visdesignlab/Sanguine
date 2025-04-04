# Sanguine Blood Usage Visualization

Sanguine is a web-based visualization tool built by the VDL and ARUP that visualizes hospital blood usage and associated patient/surgery attributes. It is designed to be used by clinicians, researchers, and administrators to understand blood usage patterns, identify opportunities to improve patient outcomes, and reduce transfusion expenditures. Sanguine is built using modern web technologies including React, D3, and Django.

![Interface image](https://vdl.sci.utah.edu/assets/images/publications/2021_ivi_sanguine/2021_ivi_sanguine_interface.png)


## Table of Contents

1. [Current and Future Deployments](#current-and-future-deployments)
1. [Developer Documentation](#developer-documentation)
    - [Architecture](#architecture)
    - [Security](#security)
    - [Quick start guide](#quick-start-guide)


## Current and Future Deployments

We currently support 2 deployments of Sanguine, both at the University of Utah. The first deployment was a prototype that was used to gather feedback from clinicians and researchers using de-identified data. The second deployment is a production deployment that is used by clinicians and researchers to analyze blood usage data on the identified patient database.

We're currently working with another hospital outside of Utah to deploy Sanguine in their environment. This deployment will be similar to the production deployment at the University of Utah, but will be customized to meet the needs of the hospital.

If you're interested in deploying Sanguine at your hospital, please contact us at ryan(dot)metcalf(at)path.utah.edu.

## Developer Documentation

### Architecture

The Sanguine application is split into two main components: the frontend and the backend. The frontend is a React application that uses D3 for data visualization. The backend is a Django application that provides the API for the frontend to interact with the database.

At Utah, we use EPIC and OracleSQL to store the data. The backend connects to the database and retrieves the data that the frontend needs to display. The frontend then uses this data to create the visualizations. We provide a data schema that the backend requires to retrieve the data from the database.

We use container technology to deploy the application. The frontend and backend are deployed as separate containers, each running in its own VM. The frontend container is a Node.js application that serves the React application. The backend container is a Django application that serves the API. We use nginx as a reverse proxy to route requests to the correct container.


### Security

Security is a top priority for the Sanguine application. We use a variety of techniques to ensure that the data is secure and that only authorized users can access it. Some of the techniques we use include:

- Limited firewall access: Using modern VPN technology, we limit access to the application to only authorized users.
- Authentication: Once users are connected to the VPN, they must authenticate using their SSO credentials to access the application. The list of authorized users is maintained by hospital IT, and only users on this list can access the application.
- Service accounts: The backend uses a service account to connect to the database. This account has limited permissions and is only used to retrieve the data that the frontend needs to display as defined by the Sanguine schema.
- VM security: VMs are provided and mainted by hospital IT. They are kept up to date with the latest security patches and are monitored for any suspicious activity. Upgrades are performed at the hospital's discretion, in accordance with their security policies.
- Logging: We log all requests to the application and monitor for any unusual activity at backend/sanguine.log.

### Quick start guide

We provide 2 docker-compose files to run the application, docker-compose.yml and docker-compose.devcontainer.yml. The first one is for production and the second one is for development. Our development docker-compose file overrides some of the container specifications to make it easier to develop the application, but uses a similar setup to the production compose file.

#### Development

As you can guess by the filename, we leverage the power of devcontainers to provide a consistent development environment for all developers. To run the devcontainer, you need to have Docker Desktop installed on your machine. Once you have Docker Desktop installed, you can use vscode or the CLI to run the devcontainer. Our preferred method is to use vscode, as it provides a seamless experience for developers.

There are a couple of precursor steps to running the devcontainer using vscode. You will need to make a .env file and build the image for the oracle sql container. To do this, copy the .env.default file to .env and modify the values as needed. Then build the oracle sql container as decribed [here](#setting-up-the-oracle-sql-container) (it's quite an involved process).

Now, to run the devcontainer using vscode, follow these steps:

1. Open the project in vscode.
1. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).
1. Click on the button in the bottom right corner of vscode that says "Reopen in Container".
1. Wait for the devcontainer to build and start. This may take a few minutes the first time you run it. The OravleSQL container will take a while to start up.
1. Once the devcontainer is running, the backend is started automatically. You can start the frontend by running the following command in the terminal:

    ```bash
    cd frontend
    yarn install
    yarn start
    ```

1. The frontend should now be running on http://localhost:3000. You can access the application by navigating to that URL in your browser.
1. To populate the database with data, you will need to connect to the backend container and run the following command:

    ```bash
    docker exec -it sanguine_backend_1 bash
    python manage.py fill_db_mock_patient_data
    ```

1. The database should now be populated with mock data and you should be able to see it in the frontend by adding a chart to the dashboard.

#### Setting up the vscode extensions to connect to the databases

The devcontainer specification contains the necessary extensions to connect to the databases, one for Oracle SQL and one for MariaDB/MySQL. 

To connect to the Oracle SQL database, open the SQL developer menu, click create connection and use the following settings:

- Connection name: Development Oracle SQL
- Role: SYSDBA
- Username: SYS
- Password: Password1
- Host: oracle
- Port: 1521
- SID: ORCLCDB

To query the database and test it's working, right click the database connection, click open sql worksheet, and run the following query:

```sql
SELECT * FROM dual;
```

To connect to the MariaDB/MySQL database, open the database menu, click create connection connection and use the following settings:

- Connection name: Development MariaDB
- Server type: MariaDB
- Hostname: mariadb
- Port: 3306
- Username: intelvia
- Password: test
- Database: intelvia

To query the database and test it's working, open the database and then intelvia. Then next to query, click the book icon and run the following query:

```sql
SELECT * FROM django_migrations;
```

#### Setting up the oracle sql container

NOTE: If you're using an apple silicon machine, you can follow the instructions in this [video](https://www.youtube.com/watch?v=uxvoMhkKUPE) to build the oracle sql container for apple silicon.

Oracle provides images for docker containers, but their images require logging into docker hub to download, and they don't include images for apple silicon. To get around this, we can build the containers from the source files provided by Oracle. To do this, follow these steps:

1. Clone Oracle's docker-images repository:

    ```bash
    git clone https://github.com/oracle/docker-images.git
    ```

1. Traverse to the OracleDatabase/SingleInstance/dockerfiles/19.3.0 directory:

    ```bash
    cd docker-images/OracleDatabase/SingleInstance/dockerfiles/19.3.0
    ```

1. Download the Oracle Database 19c installation files from the [Oracle website](https://www.oracle.com/database/technologies/oracle-database-software-downloads.html). You will need to create an Oracle account to download the database. Once you have the zip file, copy it to the 19.3.0 directory.
1. Build the Oracle Database 19c image:

    ```bash
    ./buildDockerImage.sh -v 19.3.0 -e
    ```

The image should now be built and you can use it to run the Oracle SQL container as described in the [development](#development) section.


#### Production

To run the application in production, use either of the following commands:

```bash
docker-compose up
# or
podman-compose up
```

Running the above command will start the application in production mode. The backend django application will be running using gunicon, and the frontend will build staticly.

To serve the static frontend files using nginx, you will need to move the files to the correct location, and update the permissions. This will vary for each deployment, so we do not provide a script to do this. You can find the static files in the frontend/build directory.

To serve the backend, you will need to ensure that nginx is configured correctly to route requests to the backend container. We provide a sample nginx configuration file in the nginx directory. You can use this file as a starting point to configure nginx for your deployment.
