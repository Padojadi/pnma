#!/bin/bash
# Déploie PNMA sur le VPS via SSH.
# Usage: bash scripts/remote-deploy.sh /path/to/private_key
set -euo pipefail

KEY="${1:-}"
HOST="${VPS_HOST:-195.110.35.45}"
USER="${VPS_USER:-root}"
BRANCH="${BRANCH:-cursor/pnma-platform-785c}"

if [ -z "$KEY" ] || [ ! -f "$KEY" ]; then
  echo "Usage: $0 /chemin/vers/cle_ssh_privee"
  echo "La clé SSH root n’a pas été fournie dans le message initial."
  exit 1
fi

chmod 600 "$KEY"

ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "${USER}@${HOST}" bash -s <<EOF
set -euo pipefail
export BRANCH=${BRANCH}
export ADMIN_PASSWORD='PnmaAdmin!2026'
if [ ! -d /opt/pnma ]; then
  git clone -b ${BRANCH} https://github.com/Padojadi/pnma.git /opt/pnma
else
  cd /opt/pnma && git fetch origin && git checkout ${BRANCH} && git pull origin ${BRANCH}
fi
bash /opt/pnma/scripts/deploy-vps-native.sh
EOF

echo "Déploiement distant lancé. Vérifiez https://pnma.2ticglobal.com"
