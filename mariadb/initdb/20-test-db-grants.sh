#!/bin/sh
set -eu

DB_CLIENT="$(command -v mariadb || command -v mysql)"
DB_SOCKET="/run/mysqld/mysqld.sock"

# Ensure client does not inherit an external host from env/defaults.
unset MYSQL_HOST
unset MARIADB_HOST

# Wait for temporary init server to accept socket connections.
i=0
until "${DB_CLIENT}" --host=localhost --protocol=socket --socket="${DB_SOCKET}" -uroot -p"${MARIADB_ROOT_PASSWORD}" -e "SELECT 1" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "${i}" -ge 30 ]; then
    echo "Timed out waiting for MariaDB init socket: ${DB_SOCKET}" >&2
    exit 1
  fi
  sleep 1
done

"${DB_CLIENT}" --host=localhost --protocol=socket --socket="${DB_SOCKET}" -uroot -p"${MARIADB_ROOT_PASSWORD}" <<EOSQL
GRANT ALL PRIVILEGES ON \`test\\_%\`.* TO '${MARIADB_USER}'@'%';
FLUSH PRIVILEGES;
EOSQL
