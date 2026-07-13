#!/bin/bash
# Backup complet PNMA (code + PostgreSQL) — à exécuter sur le VPS
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/pnma}"
BACKUP_ROOT="${BACKUP_ROOT:-/root/backups/pnma}"
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="${BACKUP_ROOT}/${STAMP}"
MAC_MIRROR="${MAC_MIRROR:-/root/Protosen_Hostinger/PNMA}"

mkdir -p "$BACKUP_DIR/env"

if [ -f "$APP_DIR/backend/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$APP_DIR/backend/.env"
  set +a
fi

export PGPASSWORD="${DB_PASS:-pnma_prod_2026}"
if [ -n "${DATABASE_URL:-}" ]; then
  PGPASSWORD=$(python3 - <<'PY'
import os, urllib.parse
u = urllib.parse.urlparse(os.environ["DATABASE_URL"])
print(urllib.parse.unquote(u.password or "pnma_prod_2026"))
PY
  )
  export PGPASSWORD
fi

echo "=== Dump DB ==="
pg_dump -h localhost -U pnma -d pnma -F c -f "$BACKUP_DIR/pnma-db.dump"
pg_dump -h localhost -U pnma -d pnma --inserts > "$BACKUP_DIR/pnma-db.sql"

echo "=== Archive code ==="
tar -C "$(dirname "$APP_DIR")" -czf "$BACKUP_DIR/pnma-code.tar.gz" \
  --exclude='pnma/backend/node_modules' \
  --exclude='pnma/frontend/node_modules' \
  --exclude='pnma/frontend/.next' \
  --exclude='pnma/backend/dist' \
  --exclude='pnma/**/.git' \
  "$(basename "$APP_DIR")"

cp -a "$APP_DIR/backend/.env" "$BACKUP_DIR/env/backend.env" 2>/dev/null || true
cp -a "$APP_DIR/frontend/.env.local" "$BACKUP_DIR/env/frontend.env.local" 2>/dev/null || true

cat > "$BACKUP_DIR/MANIFEST.txt" <<EOF
PNMA Backup
Date: $(date -Is)
Source: $APP_DIR
Branch: $(git -C "$APP_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)
Commit: $(git -C "$APP_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)
EOF

cd "$BACKUP_ROOT"
tar -czf "pnma-full-backup-${STAMP}.tar.gz" "$STAMP"
ln -sfn "pnma-full-backup-${STAMP}.tar.gz" pnma-full-backup-latest.tar.gz

echo "=== Miroir local ==="
mkdir -p "$(dirname "$MAC_MIRROR")"
rsync -a --delete \
  --exclude node_modules --exclude .next --exclude dist \
  "$APP_DIR/" "$MAC_MIRROR/"
mkdir -p "$(dirname "$MAC_MIRROR")/backups"
cp -a "${BACKUP_ROOT}/pnma-full-backup-${STAMP}.tar.gz" "$(dirname "$MAC_MIRROR")/backups/"

echo "OK: ${BACKUP_ROOT}/pnma-full-backup-${STAMP}.tar.gz"
echo "Miroir: $MAC_MIRROR"
