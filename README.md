# Sanguine Blood Usage Visualization

Sanguine is a web-based visualization tool built by the VDL and ARUP that visualizes hospital blood usage and associated patient/surgery attributes. It is designed to be used by clinicians, researchers, and administrators to understand blood usage patterns, identify opportunities to improve patient outcomes, and reduce transfusion expenditures. Sanguine is built using modern web technologies including React, D3, and Django.

![Interface image](https://vdl.sci.utah.edu/assets/images/publications/2021_ivi_sanguine/2021_ivi_sanguine_interface.png)


## Table of Contents

1. [Current and Future Deployments](#current-and-future-deployments)
1. [Architecture](#architecture)
1. [Security](#security)
1. [Deployment Steps](#deployment-steps)
1. [Developer Documentation](#developer-documentation)


## Current and Future Deployments

We currently support multiple deployments of Sanguine, 2 at the University of Utah, and others at partner institutions.

If you're interested in deploying Sanguine at your hospital, please contact us at contact@intelvia.io.

## Architecture

The Sanguine application is split into two main components: the frontend and the backend. The frontend is a React application that uses D3 for data visualization. The backend is a Django application that provides the API for the frontend to interact with the database.

We use container technology to deploy the application. The frontend and backend are deployed as separate containers. The frontend container is a Nginx application that serves the statically built React application. The backend container is a Django application that serves the API. We use nginx on the VM as a reverse proxy to route requests to the correct container and to terminate SSL.


## Security

Security is a top priority for the Sanguine application. We use a variety of techniques to ensure that the data is secure and that only authorized users can access it. Some of the techniques we use include:

- Limited firewall access: Using modern VPN technology, we limit access to the application to only authorized users.
- Authentication: Once users are connected to the VPN, they must authenticate using their SSO credentials to access the application. The list of authorized users is maintained by hospital IT, and only users on this list can access the application.
- Role based access control: We use role based access control to limit access to certain features of the application. For example, only users on the cardio-thoracic surgery team can access the cardiac surgery data. This is done using Django's built in permissions system.
- Service accounts: The backend uses a service account to connect to the database. This account has limited permissions and is only used to retrieve the data that the frontend needs to display as defined by the Sanguine schema.
- VM security: VMs are provided and maintained by hospital IT. They are kept up to date with the latest security patches and are monitored for any suspicious activity. Upgrades are performed at the hospital's discretion, in accordance with their security policies.
- Logging: We log all requests to the application and monitor for any unusual activity at backend/sanguine.log.
- Data encryption: All data is encrypted in transit using SSL.

#### Deployment Steps

To run the application in production, use either of the following commands:

```bash
docker-compose up
# or
podman-compose up
```

Running the above command will start the application in production mode. The backend django application will be running using gunicorn, and the frontend will build statically and be served by nginx in the frontend container.

The VM will need to be configured with nginx to route requests to the docker containers and to terminate SSL. We provide a sample nginx configuration file at the root of the project, server-nginx.conf. You can use this file as a starting point to configure nginx for your deployment.

## Developer Documentation

We provide 2 docker-compose files to run the application, docker-compose.yml and docker-compose.devcontainer.yml. The first one is for production and the second one is for development. Our development docker-compose file overrides some of the container specifications to make it easier to develop the application, but uses a similar setup to the production compose file.

#### Development Steps

As you can guess by the docker-compose filename, we leverage the power of devcontainers to provide a consistent development environment for all developers. 
To run the devcontainer, you need to have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed on your machine. Once you have Docker Desktop installed, you can use vscode or the CLI to run the devcontainer. Our preferred method is to use vscode, as it provides a seamless experience for developers.

There are a couple of precursor steps to running the devcontainer using vscode. 

You will need to make a .env file, but you should be able to copy the default .env.default file (in the directory) to .env (or make one under the main directory) without modification. Also make sure there is one in `frontend` and one in `backend`, and for `frontend/.env`, update the last line to:
`VITE_QUERY_URL=http://localhost:8000/api/ # Only used in development`

Now, to run the devcontainer using vscode, follow these steps:

1. Open the project in vscode.
1. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).
1. Click on the button in the bottom right corner of vscode that says "Reopen in Container".
1. Wait for the devcontainer to build and start. This may take a few minutes the first time you run it as it will need to build the containers and install all the dependencies.
1. Once the devcontainer is running, the backend is started automatically. You can start the frontend by running the following command in the terminal:

    ```bash
    cd frontend
    yarn install
    yarn serve
    ```

1. The frontend should now be running on http://localhost:3000. You can access the application by navigating to that URL in your browser. Note: On the first run, there is no data entry, so there will be an error on the web page.
1. To populate the database with data, you will need to connect to the backend container and run the following command:

    ```bash
    docker-compose exec -it backend bash
    ```
    (alternatively, you can also go to Docker Desktop, run backend and click backend container -> CLI tool)
   Then the following commands will populate the database. The second line will take a while
   ```bash
    poetry run python manage.py migrate api
    poetry run python manage.py mock50million 
    poetry run python manage.py generate_parquets
    ```
Note: if you cannot run `mock50million` successfully, then you can edit the `MOCK_TOTAL` in `mock50million.py` to make the process faster. 

1. The database should now be populated with mock data and you should be able to see it in the frontend by adding a chart to the dashboard.

#### Setting up the vscode extensions to connect to the databases

The devcontainer specification contains the necessary extensions to connect to the databases, MariaDB/MySQL. 

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
