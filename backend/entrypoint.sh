#!/bin/bash

# Trap SIGINT and SIGTERM signals and forward them to the child process
trap 'kill -SIGINT $PID' SIGINT
trap 'kill -SIGTERM $PID' SIGTERM

# Run the migrations to configure django / administrator
poetry run python manage.py migrate admin
poetry run python manage.py migrate auth
poetry run python manage.py migrate contenttypes
poetry run python manage.py migrate django_cas_ng
poetry run python manage.py migrate sessions

# Start the server with 
poetry run gunicorn api.wsgi:application --bind 0.0.0.0:8000 --timeout 60 &

# Get the PID of the background process
PID=$!

# Wait for the background process to finish
wait $PID
