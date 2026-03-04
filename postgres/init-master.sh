#!/bin/sh
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'replicator') THEN
            CREATE USER replicator WITH REPLICATION PASSWORD 'repl_password';
        END IF;
    END
    \$\$;

    SELECT * FROM pg_create_physical_replication_slot('replica_slot') 
    WHERE NOT EXISTS (SELECT 1 FROM pg_replication_slots WHERE slot_name = 'replica_slot');
EOSQL
