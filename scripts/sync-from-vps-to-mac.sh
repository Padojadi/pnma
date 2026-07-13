#!/bin/bash
# Depuis votre Mac : récupère la plateforme + le dernier backup depuis le VPS
# Usage:
#   bash scripts/sync-from-vps-to-mac.sh [chemin_cle_ssh]
set -euo pipefail

KEY="${1:-$HOME/.ssh/id_ed25519}"
HOST="${VPS_HOST:-195.110.35.45}"
USER="${VPS_USER:-root}"
DEST="${DEST:-/Users/Paul Do Mac Folders/Protosen_Hostinger}"

mkdir -p "$DEST/backups" "$DEST/PNMA"

echo "=== Sync code PNMA ==="
rsync -az --delete \
  -e "ssh -i $KEY -o StrictHostKeyChecking=accept-new" \
  --exclude node_modules --exclude .next --exclude dist \
  "${USER}@${HOST}:/root/Protosen_Hostinger/PNMA/" \
  "$DEST/PNMA/"

echo "=== Sync backup ==="
rsync -az \
  -e "ssh -i $KEY" \
  "${USER}@${HOST}:/root/backups/pnma/pnma-full-backup-latest.tar.gz" \
  "$DEST/backups/pnma-full-backup-latest.tar.gz"

echo "=== npm install ==="
cd "$DEST/PNMA/backend" && npm install
cd "$DEST/PNMA/frontend" && npm install

echo "Terminé → $DEST/PNMA"
echo "Backup → $DEST/backups/pnma-full-backup-latest.tar.gz"
