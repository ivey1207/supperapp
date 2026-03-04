#!/bin/sh

# Configuration
BACKUP_DIR="/backups"
DB_BACKUP_DIR="${BACKUP_DIR}/db"
UPLOADS_BACKUP_DIR="${BACKUP_DIR}/uploads"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=7

# Create directories if they don't exist
mkdir -p "${DB_BACKUP_DIR}"
mkdir -p "${UPLOADS_BACKUP_DIR}"

echo "--- Starting Backup: ${TIMESTAMP} ---"

# 1. Database Backup
echo "Dumping database..."
FILENAME="${DB_BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz"
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" | gzip > "${FILENAME}"

if [ $? -eq 0 ]; then
    echo "Database backup successful: ${FILENAME}"
else
    echo "ERROR: Database backup failed!"
fi

# 2. Uploads Backup (if directory exists)
if [ -d "/app/uploads" ]; then
    echo "Backing up uploads folder..."
    UPLOADS_FILENAME="${UPLOADS_BACKUP_DIR}/uploads_backup_${TIMESTAMP}.tar.gz"
    tar -czf "${UPLOADS_FILENAME}" -C /app uploads
    if [ $? -eq 0 ]; then
        echo "Uploads backup successful: ${UPLOADS_FILENAME}"
    else
        echo "ERROR: Uploads backup failed!"
    fi
fi

# 3. Cleanup old backups
echo "Cleaning up backups older than ${KEEP_DAYS} days..."
find "${DB_BACKUP_DIR}" -name "db_backup_*.sql.gz" -mtime +"${KEEP_DAYS}" -delete
find "${UPLOADS_BACKUP_DIR}" -name "uploads_backup_*.tar.gz" -mtime +"${KEEP_DAYS}" -delete

echo "--- Backup process completed ---"
