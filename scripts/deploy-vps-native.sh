#!/bin/bash
set -euo pipefail

DOMAIN="pnma.2ticglobal.com"
APP_DIR="/opt/pnma"
REPO="https://github.com/Padojadi/pnma.git"
BRANCH="${BRANCH:-main}"
DB_NAME="pnma"
DB_USER="pnma"
DB_PASS="${DB_PASS:-pnma_prod_2026}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-PnmaAdmin!2026}"
BACKEND_PORT=4010
FRONTEND_PORT=3010

echo "=== Déploiement PNMA sur $DOMAIN ==="

# PostgreSQL
if command -v psql >/dev/null 2>&1; then
  sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
fi

# Clone / update
if [ ! -d "$APP_DIR" ]; then
  git clone -b "$BRANCH" "$REPO" "$APP_DIR"
else
  cd "$APP_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
fi
cd "$APP_DIR"

# Backend
cd backend
cat > .env <<EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
PORT=${BACKEND_PORT}
CORS_ORIGIN=https://${DOMAIN},http://localhost:${FRONTEND_PORT}
ADMIN_EMAIL=admin@${DOMAIN}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
EOF

npm install
npx prisma generate
npx prisma migrate deploy
npx ts-node prisma/seed.ts || true
npm run build

# Frontend
cd ../frontend
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
EOF
npm install
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api npm run build

# Standalone Next.js requires static + public next to server.js
if [ -d .next/standalone ]; then
  mkdir -p .next/standalone/.next
  rm -rf .next/standalone/.next/static
  cp -a .next/static .next/standalone/.next/static
  rm -rf .next/standalone/public
  cp -a public .next/standalone/public 2>/dev/null || mkdir -p .next/standalone/public
fi

# PM2
npm install -g pm2 2>/dev/null || true
pm2 delete pnma-api 2>/dev/null || true
pm2 delete pnma-web 2>/dev/null || true

cd "$APP_DIR/backend"
pm2 start dist/src/main.js --name pnma-api --cwd "$APP_DIR/backend"

if [ -f "$APP_DIR/frontend/.next/standalone/server.js" ]; then
  cd "$APP_DIR/frontend/.next/standalone"
  PORT=${FRONTEND_PORT} HOSTNAME=0.0.0.0 NEXT_PUBLIC_API_URL=https://${DOMAIN}/api \
    pm2 start server.js --name pnma-web --cwd "$APP_DIR/frontend/.next/standalone"
else
  cd "$APP_DIR/frontend"
  PORT=${FRONTEND_PORT} pm2 start npm --name pnma-web -- start
fi
pm2 save

# Nginx site with separate certificate
cat > /etc/nginx/sites-available/${DOMAIN} <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 20M;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
NGINX

mkdir -p /var/www/certbot
ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}
nginx -t && systemctl reload nginx

# SSL — certificat séparé pour pnma.2ticglobal.com
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m padojadi@yahoo.fr --redirect \
  || echo "Certbot: configurez le certificat SSL manuellement si nécessaire"

echo "=== Déploiement PNMA terminé ==="
echo "URL: https://${DOMAIN}"
echo "Admin: admin@${DOMAIN} / ${ADMIN_PASSWORD}"
echo "API docs: https://${DOMAIN}/api/docs"
pm2 list | grep pnma || true
