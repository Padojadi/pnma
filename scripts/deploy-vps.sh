#!/bin/bash
set -euo pipefail

DOMAIN="pnma.2ticglobal.com"
APP_DIR="${APP_DIR:-/opt/pnma}"
REPO_URL="https://github.com/Padojadi/pnma.git"

echo "=== Déploiement Docker PNMA sur $DOMAIN ==="

if [ ! -d "$APP_DIR" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git pull origin main || true

export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-pnma_secret_2026}"
export JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-PnmaAdmin!2026}"
export NEXT_PUBLIC_API_URL="https://${DOMAIN}/api"

docker compose down || true
docker compose build --no-cache
docker compose up -d

echo "=== Déploiement terminé ==="
echo "URL: https://$DOMAIN"
echo "Admin: admin@pnma.2ticglobal.com"
echo "API docs: https://$DOMAIN/api/docs"
