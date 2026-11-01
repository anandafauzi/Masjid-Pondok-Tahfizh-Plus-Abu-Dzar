# Backup PostgreSQL database
# Usage: .\scripts\backup-db.ps1
# Requires: pg_dump in PATH or PG_DUMP_PATH
param(
  [string]$OutputDir = ".\backups"
)

if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $OutputDir "masjid_abu_dzar_$timestamp.sql"
$backupFileGz = "$backupFile.gz"

$pgDump = $env:PG_DUMP_PATH
if (-not $pgDump) {
  $pgDump = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source
}
if (-not $pgDump) {
  Write-Error "pg_dump not found. Set PG_DUMP_PATH or add PostgreSQL bin to PATH."
  exit 1
}

$dbUrl = $env:DATABASE_URL
if (-not $dbUrl) {
  Write-Error "DATABASE_URL not set in environment."
  exit 1
}

Write-Host "Backing up to $backupFileGz..."
& $pgDump $dbUrl --format=plain --no-owner --no-privileges | Compress-Archive -DestinationPath $backupFileZip -Force -ErrorAction SilentlyContinue
# Fallback: use gzip via Python if available
try {
  & $pgDump $dbUrl --format=plain --no-owner --no-privileges | python -m gzip -c > $backupFileGz
  Write-Host "Backup completed: $backupFileGz"
} catch {
  & $pgDump $dbUrl --format=plain --no-owner --no-privileges > $backupFile
  Write-Host "Backup completed: $backupFile"
}
