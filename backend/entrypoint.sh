#!/bin/bash

# Trap SIGINT and SIGTERM signals and forward them to the child process
trap 'kill -SIGINT $PID' SIGINT
trap 'kill -SIGTERM $PID' SIGTERM

# Run the migrations to configure django / administrator
poetry run python manage.py migrate admin
poetry run python manage.py migrate auth
poetry run python manage.py migrate contenttypes
AUTH_PROVIDER="${DJANGO_AUTH_PROVIDER:-cas}"
AUTH_PROVIDER="${AUTH_PROVIDER,,}"

if [[ "$AUTH_PROVIDER" == "cas" ]]; then
  poetry run python manage.py migrate django_cas_ng
fi

poetry run python manage.py migrate sessions

# Start the server with 
poetry run gunicorn api.wsgi:application --bind 0.0.0.0:8000 --timeout 300 --workers 4 &

# Get the PID of the background process
PID=$!

# Wait for the background process to finish
wait $PID
