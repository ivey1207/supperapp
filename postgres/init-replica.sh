#!/bin/bash
set -e

echo "Replica initialization started..."

# Wait for master to be ready
until pg_isready -h postgres-master -p 5432 -U user; do
  echo "Waiting for master (postgres-master:5432)..."
  sleep 2
done

echo "Master is ready. Checking data directory..."

# If data directory is empty, perform base backup
if [ -z "$(ls -A /var/lib/postgresql/data)" ]; then
    echo "Data directory is empty. Performing base backup from master..."
    # Use PGPASSWORD for pg_basebackup
    export PGPASSWORD=repl_password
    pg_basebackup -h postgres-master -D /var/lib/postgresql/data -U replicator -v -P -X stream -C -S replica_slot
    
    echo "Backup completed. Configuring standby mode..."
    # Create signal file for standby mode
    touch /var/lib/postgresql/data/standby.signal
    
    echo "primary_conninfo = 'host=postgres-master port=5432 user=replicator password=repl_password'" >> /var/lib/postgresql/data/postgresql.conf
    echo "primary_slot_name = 'replica_slot'" >> /var/lib/postgresql/data/postgresql.conf
else
    echo "Data directory is not empty. Skipping base backup."
fi

echo "Starting Postgres..."
exec docker-entrypoint.sh postgres
