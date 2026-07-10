#!/bin/bash
# Publie backend/ et frontend/ vers les branches dédiées du monorepo Padojadi/pnma
# Branches : pnma-backend, pnma-frontend
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_URL="$(cd "$ROOT" && git remote get-url origin)"

publish_subdir() {
  local dir="$1"
  local branch="$2"
  local tmpdir
  tmpdir=$(mktemp -d)

  echo "=== Publication de $dir vers branche $branch ==="
  cp -a "$ROOT/$dir/." "$tmpdir/"
  cd "$tmpdir"
  git init -b "$branch"
  git add -A
  git -c user.email="padojadi@yahoo.fr" -c user.name="PNMA" commit -m "sync: $dir from monorepo"
  git remote add origin "$REMOTE_URL"
  git push -u origin "$branch" --force
  rm -rf "$tmpdir"
  echo "OK: https://github.com/Padojadi/pnma/tree/$branch"
}

publish_subdir "backend" "pnma-backend"
publish_subdir "frontend" "pnma-frontend"

echo "Branches séparées publiées."
