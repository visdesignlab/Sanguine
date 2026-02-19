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

For local development, run backend and MariaDB in Docker and run the frontend directly on your host for fast HMR.

1. Copy `.env.default` to `.env` in the project root.
1. Start backend + MariaDB:

    ```bash
    docker compose -f docker-compose.devcontainer.yml up
    ```

1. In another terminal, start the frontend locally:

    ```bash
    cd frontend
    yarn install
    yarn serve
    ```

1. Open `http://localhost:8080`. API calls from the frontend use relative `/api/...` paths and are proxied by Vite to the backend at `http://localhost:8000`.
1. If you run `yarn serve` inside the `frontend` devcontainer service, Vite uses `VITE_DEV_PROXY_TARGET=http://backend:8000` automatically (Docker network target). For host-based frontend dev, leave it unset and it defaults to `http://localhost:8000`.
1. To populate the database with mock data, run:

```bash
docker-compose exec -it backend bash
poetry run python manage.py recreatedata
```

To step through each step of the process instead, run these:

```bash
docker-compose exec -it backend bash
poetry run python manage.py destroydata
poetry run python manage.py migrate api
poetry run python manage.py mock50million
poetry run python manage.py generate_parquets
```

To generate only one artifact:

```bash
poetry run python manage.py generate_parquets --generate visit_attributes
poetry run python manage.py generate_parquets --generate procedure_hierarchy
```

If `VisitAttributes` is already fresh and you only need to rebuild cache files, you can skip re-materializing it:

```bash
poetry run python manage.py generate_parquets --skip-materialize
poetry run python manage.py generate_parquets --generate procedure_hierarchy --skip-materialize
```

    
1. The database should now be populated with mock data and you should be able to see it in the frontend by adding a chart to the dashboard.

#### Backend tests

The backend test suite covers Django app behavior end-to-end, including API logic, auth-related behavior, migrations, materialized-view generation, and parquet generation paths.

Run all backend tests from a shell where `.env` is loaded and MariaDB is available:

```bash
docker-compose exec -it backend bash
poetry run python manage.py test api.tests --verbosity 2
```

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
