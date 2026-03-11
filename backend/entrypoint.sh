#!/bin/bash

# Trap SIGINT and SIGTERM signals and forward them to the child process
trap 'kill -SIGINT $PID' SIGINT
trap 'kill -SIGTERM $PID' SIGTERM

# Apply Django-managed schema and install SQL-managed derived tables.
poetry run python manage.py migrate --noinput
poetry run python manage.py migrate_derived_tables

# Start the server with logs sent to container stdout/stderr.
poetry run gunicorn api.wsgi:application \
  --bind 0.0.0.0:8000 \
  --timeout 60 \
  --error-logfile - \
  --access-logfile - \
  --capture-output \
  --log-level info &

# Get the PID of the background process
PID=$!

# Wait for the background process to finish
wait $PID
