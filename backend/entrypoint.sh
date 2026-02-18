#!/bin/bash
set -euo pipefail

# Run the migrations to configure django / administrator
poetry run python manage.py migrate admin
poetry run python manage.py migrate auth
poetry run python manage.py migrate contenttypes
poetry run python manage.py migrate django_cas_ng
poetry run python manage.py migrate sessions

# If a command is provided (e.g. dev runserver), run it instead of gunicorn.
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

# Default production server.
exec poetry run gunicorn api.wsgi:application --bind 0.0.0.0:8000 --timeout 60
