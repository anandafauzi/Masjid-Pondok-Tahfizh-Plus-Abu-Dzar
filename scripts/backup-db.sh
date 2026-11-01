#!/usr/bin/env bash
# Backup PostgreSQL database
# Usage: ./scripts/backup-db.sh
set -euo pipefail

OUTPUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTFILE="$OUTPUT_DIR/masjid_abu_dzar_${TIMESTAMP}.sql.gz"

: "${DATABASE_URL:?DATABASE_URL is required}"

echo "Backing up to $OUTFILE..."
pg_dump "$DATABASE_URL" --format=plain --no-owner --no-privileges | gzip -c > "$OUTFILE"
echo "Backup completed: $OUTFILE"

# Optional: keep only last N backups
if [ -n "${BACKUP_RETENTION:-}" ]; then
  ls -1t "$OUTPUT_DIR"/masjid_abu_dzar_*.sql.gz 2>/dev/null | tail -n +$((BACKUP_RETENTION + 1)) | xargs -r rm
  echo "Retention applied: keeping last $BACKUP_RETENTION backups"
fi
