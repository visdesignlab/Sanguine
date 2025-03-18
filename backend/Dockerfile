 # A Dockerfile for the backend service
# This installs all the necessary dependencies for the backend service (from pip and apt)
# The backend needs packages for mariadb
FROM python:3.13-slim

# Copy the backend code into the container
COPY . /app
WORKDIR /app

# Install apt dependencies
RUN apt-get update && apt-get install -y \
    python3-dev \
    default-libmysqlclient-dev \
    build-essential \
    pkg-config

RUN pip install poetry
RUN poetry config virtualenvs.create false
RUN poetry install

# Expose the port the app runs on
EXPOSE 8000

# Serve the app
CMD ["poetry", "run", "gunicorn", "api.wsgi:application", "--bind", "0.0.0.0:8000", "--timeout", "60"]