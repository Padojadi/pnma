#!/bin/bash
# Clone PNMA pour développement local
# Sur Mac :
#   bash scripts/setup-local.sh "/Users/Paul Do Mac Folders/Protosen_Hostinger/PNMA"
set -euo pipefail

LOCAL_DIR="${1:-/Users/Paul Do Mac Folders/Protosen_Hostinger/PNMA}"
REPO="${REPO:-https://github.com/Padojadi/pnma.git}"
BRANCH="${BRANCH:-cursor/pnma-platform-785c}"

echo "Clonage PNMA vers $LOCAL_DIR..."
mkdir -p "$(dirname "$LOCAL_DIR")"

if [ -d "$LOCAL_DIR/.git" ]; then
  cd "$LOCAL_DIR"
  git fetch origin
  git checkout "$BRANCH" 2>/dev/null || true
  git pull --ff-only origin "$BRANCH" || git pull --ff-only || true
else
  git clone -b "$BRANCH" "$REPO" "$LOCAL_DIR" || git clone "$REPO" "$LOCAL_DIR"
fi

cd "$LOCAL_DIR"
cp -n .env.example .env 2>/dev/null || true
cp -n backend/.env.example backend/.env 2>/dev/null || true
cp -n frontend/.env.example frontend/.env.local 2>/dev/null || true

echo "Installation backend..."
cd "$LOCAL_DIR/backend" && npm install

echo "Installation frontend..."
cd "$LOCAL_DIR/frontend" && npm install

echo "Terminé → $LOCAL_DIR"
echo "Docker : cd \"$LOCAL_DIR\" && docker compose up -d"
echo "Ou natif : backend :4010, frontend :3010"
