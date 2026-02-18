# A Dockerfile for the backend service
# This installs all the necessary dependencies for the backend service (from pip and apt)
# The backend needs packages for mariadb
FROM python:3.13-slim

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    POETRY_VIRTUALENVS_CREATE=false

# Install apt dependencies
RUN apt-get update && apt-get install -y \
    python3-dev \
    default-libmysqlclient-dev \
    build-essential \
    pkg-config \
    mariadb-client \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN pip install poetry

WORKDIR /app
COPY pyproject.toml poetry.lock* /app/

RUN poetry install --no-interaction --no-ansi --only main

# Copy the backend code into the container
COPY . /app

# Expose the port the app runs on
EXPOSE 8000

# Serve the app
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
