#!/bin/bash
# Publie backend/ et frontend/ vers des dépôts GitHub séparés
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

publish_subdir() {
  local dir="$1"
  local repo="$2"
  local tmpdir
  tmpdir=$(mktemp -d)

  echo "=== Publication de $dir vers $repo ==="
  cp -r "$dir/." "$tmpdir/"
  cd "$tmpdir"
  git init -b main
  git add -A
  git -c user.email="padojadi@yahoo.fr" -c user.name="PNMA Bot" commit -m "Initial commit from PNMA monorepo"
  git remote add origin "https://github.com/$repo.git"
  git push -u origin main --force

  cd "$ROOT"
  rm -rf "$tmpdir"
  echo "OK: $repo"
}

# Créer les repos s'ils n'existent pas
gh repo view Padojadi/pnma-backend >/dev/null 2>&1 || gh repo create Padojadi/pnma-backend --public --description "PNMA Backend API"
gh repo view Padojadi/pnma-frontend >/dev/null 2>&1 || gh repo create Padojadi/pnma-frontend --public --description "PNMA Frontend"

publish_subdir "backend" "Padojadi/pnma-backend"
publish_subdir "frontend" "Padojadi/pnma-frontend"

echo "Dépôts séparés publiés."
