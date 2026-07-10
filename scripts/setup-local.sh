#!/bin/bash
# Prépare une copie locale pour développement (chemin Mac demandé)
set -euo pipefail

LOCAL_DIR="${1:-/Users/Paul Do Mac Folders/Protosen_Hostinger/PNMA}"
REPO="${REPO:-https://github.com/Padojadi/pnma.git}"

echo "Clonage PNMA vers $LOCAL_DIR..."
mkdir -p "$(dirname "$LOCAL_DIR")"

if [ -d "$LOCAL_DIR/.git" ]; then
  cd "$LOCAL_DIR"
  git pull --ff-only || true
else
  git clone "$REPO" "$LOCAL_DIR"
fi

cd "$LOCAL_DIR"
cp -n .env.example .env 2>/dev/null || true
cp -n backend/.env.example backend/.env 2>/dev/null || true
cp -n frontend/.env.example frontend/.env.local 2>/dev/null || true

echo "Installation backend..."
cd "$LOCAL_DIR/backend" && npm install

echo "Installation frontend..."
cd "$LOCAL_DIR/frontend" && npm install

echo "Terminé."
echo "Docker local : cd \"$LOCAL_DIR\" && docker compose up -d"
echo "Ou natif : backend port 4010, frontend port 3010"
