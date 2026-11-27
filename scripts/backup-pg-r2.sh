#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Ziro Commerce OS - Automated PostgreSQL 17 Encrypted Cloudflare R2 Backup
# Invariant: AES-256-CBC encryption + SHA-256 integrity verification
# ==============================================================================

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
BACKUP_DIR="${BACKUP_DIR:-/tmp/ziro-backups}"
ARCHIVE_NAME="ziro_core_${TIMESTAMP}.sql.zst.enc"
CHECKSUM_FILE="${ARCHIVE_NAME}.sha256"
R2_BUCKET="${R2_BUCKET:-ziro-database-backups}"
R2_ENDPOINT="${R2_ENDPOINT_URL:-https://cf-r2-account-id.r2.cloudflarestorage.com}"

mkdir -p "$BACKUP_DIR"

if [[ -z "${R2_BACKUP_ENCRYPTION_KEY:-}" ]]; then
  echo "[-] ERROR: R2_BACKUP_ENCRYPTION_KEY environment variable is required." >&2
  exit 1
fi

echo "[*] [1/4] Starting PostgreSQL 17 dump and AES-256-CBC encryption..."
docker exec ziro-postgres pg_dump \
  -U "${POSTGRES_USER:-ziro}" \
  -d "${POSTGRES_DB:-ziro_commerce}" \
  --format=custom \
  --no-owner \
  --no-privileges \
  | zstd -19 \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass pass:"${R2_BACKUP_ENCRYPTION_KEY}" \
  > "${BACKUP_DIR}/${ARCHIVE_NAME}"

echo "[*] [2/4] Generating SHA-256 integrity digest..."
cd "$BACKUP_DIR"
sha256sum "$ARCHIVE_NAME" > "$CHECKSUM_FILE"
LOCAL_SHA=$(awk '{print $1}' "$CHECKSUM_FILE")
echo "[+] Local SHA-256: ${LOCAL_SHA}"

echo "[*] [3/4] Uploading encrypted backup to Cloudflare R2 bucket: ${R2_BUCKET}..."
aws s3 cp "${BACKUP_DIR}/${ARCHIVE_NAME}" "s3://${R2_BUCKET}/backups/${ARCHIVE_NAME}" \
  --endpoint-url "$R2_ENDPOINT"

aws s3 cp "${BACKUP_DIR}/${CHECKSUM_FILE}" "s3://${R2_BUCKET}/backups/${CHECKSUM_FILE}" \
  --endpoint-url "$R2_ENDPOINT"

echo "[*] [4/4] Verifying remote backup integrity..."
REMOTE_SHA=$(aws s3 cp "s3://${R2_BUCKET}/backups/${CHECKSUM_FILE}" - --endpoint-url "$R2_ENDPOINT" | awk '{print $1}')

if [[ "$LOCAL_SHA" == "$REMOTE_SHA" ]]; then
  echo "[+] SUCCESS: Backup ${ARCHIVE_NAME} successfully verified and landed on Cloudflare R2."
  rm -rf "${BACKUP_DIR:?}"/*
  exit 0
else
  echo "[-] INTEGRITY ERROR: Local SHA ($LOCAL_SHA) does not match remote SHA ($REMOTE_SHA)!" >&2
  exit 2
fi
