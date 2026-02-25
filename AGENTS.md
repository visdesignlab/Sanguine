Tech Stack
Frontend:
  - Yarn
  - React 19
  - TypeScript
  - Vite
  - Mantine UI
  - DuckDB WASM for in-browser data processing at 1,000,000 patient scale
  - mobx-react-lite
  - react-grid-layout
  - Mantine Charts
  - Mantine Datatable
  - Eslint and airbnb style guide for code quality

Backend:
  - MariaDB for data storage
  - Python 3.12
  - Django 5.2
  - Django REST Framework
  - django-cas-ng for authentication
  - pytest for testing
  - gunicorn for production server
  - pyarrow for parquet file generation

Background
Patient Blood Management (PBM) is a patient-centered, evidence-based, systematic approach to optimizing care by managing and preserving a patient's own blood. The four key pillars are: 1) Anemia Management (detecting/treating anemia), 2) Multidisciplinary Blood Conservation (minimizing blood loss/sampling), 3) Coagulation Optimization (managing coagulopathies), and 4) Patient-Centered Decision-Making (informed, appropriate transfusion). 

Purpose
The Intelvia project is a platform for understanding PBM (Patient Blood Management) data. It provides tools for visualizing and analyzing patient data, with a focus on blood management. The goal of the tool is to help healthcare professionals make informed decisions about blood management by providing insights into patient data leading to lower blood product utilization. We provide this information in the form of visualizations, reports, and recommendations based on the data. The platform is intended to be a valuable resource for healthcare professionals looking to improve patient outcomes through better blood management practices.

Data, database, and data sources
The data used in the Intelvia project is sourced from electronic health records (EHRs) and other healthcare databases, typically EPIC Clarity. The data includes patient demographics, medical history, laboratory results, medication records, and transfusion records. The data is cold stored in a MariaDB database, which allows for efficient querying and analysis of large datasets. The database is designed to handle data on the order of 1,000,000 patients, ensuring that the platform can scale to meet the needs of healthcare professionals working with large patient populations. The database schema is most clearly defined in the Django models, which are used to create the database tables and manage the data.

On top of the data we're provided with, we also generate additional features and metrics that are relevant to PBM. For example, we may calculate transfusion rates, anemia management practices, and blood conservation techniques based on the raw data. These additional features are stored in materialized views in the database, allowing for fast access and efficient querying when generating visualizations and reports.

Django API
Our backend is built using Django. Since the scale of our data is so large, it's impossible to enable real-time querying of the MariaDB database. Instead, we have a set of materialized views that are pre-computed and updated on a regular basis, that are read and save from our Django server into parquet files. These parquet files are then served to the frontend, where we use DuckDB WASM to query and process the data in the browser. This architecture allows us to provide a responsive user experience while still working with large datasets.

Another key aspect of our backend is authentication. We use the django-cas-ng library to handle authentication, which allows us to integrate with existing authentication systems used by healthcare institutions. This ensures that only authorized users can access the platform and view sensitive patient data.

Finally, we need to ensure that our backend handle user roles and permissions appropriately. For example, some users may only have access to data for their own department, while others may have access to hospital-wide data. We implement this using Django's built-in permissions system, which allows us to define custom permissions and assign them to different user roles. this also impacts the parquet files we serve to the frontend, as we need to ensure that users only receive data that they are authorized to access.

How you should interact with the codebase
When working with this codebase, work only with the source code files available to you. If you need an external library, please ask for approval first (and include how well used the library is). Make sure to follow best practices for React and TypeScript development, including proper state management, component structuring, and code documentation. Pay extra attention to lifecycle methods and hooks to ensure optimal performance and avoid memory leaks, including any updates to existing code. If you encounter any issues or have suggestions for improvements, feel free to bring them up for discussion. Don't interact with git and GitHub directly; instead, focus on the code itself. I'll handle version control and repository management. Always check package.json for the scripts available to you for building, testing, and running the project. Your goal should be to reduce complexity, improve readability, and ensure that the code is maintainable and scalable for future development. That means when fixing a bug, first consider what code can be removed or simplified, rather than just adding more code to patch the issue. When adding a new feature, consider how it fits into the existing architecture and whether it can be implemented in a way that minimizes disruption to the existing codebase. When you modify models schema, make sure to also update the corresponding database migrations and materialized view definitions, and ensure that any changes are reflected in the tests as well (including the test data).

Views we provide
- Dashboard: A hospital-wide view of PBM data, including key metrics and trends. Charts here are intended to show entire hospital trends, and department-level trends.
- Providers: A view of individual providers and their PBM-related metrics, such as transfusion rates, anemia management practices, and blood conservation techniques. Charts here are intended to show provider-level trends vs. their department.
- Explore: The explore shows data across a department in the hospital allowing for our PBM experts to explore the data and find trends that may not be visible in the other views. Charts here are intended to show patient-level trends, and surgery-level trends.
- Settings: A view for managing application wide settings, such as blood product costs, and thresholds for various PBM metrics. This view is intended for administrators of the platform to customize the application to their institution's needs.

Common items across views
- Filters: There is a global filter panel that allows users to filter data based on various criteria, such as date range, department, provider, and patient demographics. This panel is accessible from all views and allows users to customize the data they see in the visualizations.
- Selections: Users can select specific data points in the visualizations to drill down into more detailed information. For example, clicking on a bar in a chart might show a list of patients associated with that data point, along with their relevant PBM metrics and outcomes. This allows users to explore the data in more depth and identify specific cases or trends that may be of interest.

Deployment
We will deploy this at many different hospitals on different domains. We expect that servers we run on will have their own nginx to handle SSL termination and route all traffic to our frontend nginx container, which will then route API requests to our Django backend.

Development Environment
Our development environment also uses docker containers and should match the production environment as closely as possible. We have a docker-compose file that defines the services we need to run the application, including the frontend, backend, and database. When running in development mode, we use volumes to mount the source code into the containers, allowing for hot reloading and easy development. We also have a set of scripts defined in package.json that make it easy to start the development environment, run tests, and build the application for production. You can tell me to run commands prefixed with `docker compose -f docker-compose.devcontainer.yml` to interact with the development environment.

CI
We have a CI pipeline set up using GitHub Actions that runs tests and builds the application whenever code is pushed to the repository. Our CI tests the database, the Django backend, and the React frontend. For the database, we run tests to ensure that our migrations work correctly and that our materialized views are being generated as expected. For the Django backend, we run unit tests to ensure that our API endpoints are working correctly and that our authentication and permissions are set up properly. For the React frontend, we run tests to ensure that our components are rendering correctly and that our state management is working as expected. We also have a step in our CI pipeline that builds the application for production, ensuring that any issues with the build process are caught early on.
