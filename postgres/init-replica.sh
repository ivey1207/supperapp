#!/bin/bash
set -e

# Wait for master to be ready
until pg_isready -h postgres-master -p 5432 -U user; do
  echo "Waiting for master..."
  sleep 2
done

# If data directory is empty, perform base backup
if [ -z "$(ls -A /var/lib/postgresql/data)" ]; then
    echo "Performing base backup from master..."
    pg_basebackup -h postgres-master -D /var/lib/postgresql/data -U replicator -v -P -X stream -C -S replica_slot
    
    # Create signal file for standby mode
    touch /var/lib/postgresql/data/standby.signal
    
    echo "primary_conninfo = 'host=postgres-master port=5432 user=replicator password=repl_password'" >> /var/lib/postgresql/data/postgresql.conf
    echo "primary_slot_name = 'replica_slot'" >> /var/lib/postgresql/data/postgresql.conf
fi

exec docker-entrypoint.sh postgres
