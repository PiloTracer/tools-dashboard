#!/usr/bin/env bash
# Install system nginx site: dev.aiepic.app -> 127.0.0.1:8082 (Docker nginx-proxy publish port).
# Matches infra/nginx/system-port80-to-docker-8082.example.conf
#
# Prerequisites:
#   - nginx installed on host (e.g. apt install nginx)
#   - Docker stack up with nginx-proxy published on 8082 (docker-compose.dev.yml default)
#
# Requires: sudo

set -euo pipefail

DOMAIN="${DOMAIN:-dev.aiepic.app}"
UPSTREAM="${UPSTREAM:-127.0.0.1:8082}"
SITE="dev.aiepic.app"
# Many nginx packages (e.g. nginx.org Linux) only include conf.d/*.conf — not sites-enabled.
CONF_FILE="/etc/nginx/conf.d/${SITE}.conf"

if ! command -v nginx >/dev/null 2>&1; then
  echo "ERROR: nginx not found. Install it first, e.g. sudo apt install nginx"
  exit 1
fi

sudo mkdir -p "$(dirname "${CONF_FILE}")"

echo "Writing ${CONF_FILE}"
sudo tee "${CONF_FILE}" >/dev/null <<EOF
# Proxy host HTTP :80 -> Docker nginx-proxy on ${UPSTREAM}
# (see repo: infra/nginx/system-port80-to-docker-8082.example.conf)

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    client_max_body_size 10M;

    location / {
        proxy_pass http://${UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
    }
}
EOF

# Drop legacy sites-* copies so a future nginx.conf that loads both does not duplicate listen/server_name.
sudo rm -f "/etc/nginx/sites-enabled/${SITE}" "/etc/nginx/sites-available/${SITE}" 2>/dev/null || true

echo "Testing nginx config..."
sudo nginx -t

echo "Reloading nginx..."
sudo systemctl reload nginx

echo "Done. Open http://${DOMAIN}/app (stack must be running; compose publishes :8082 -> container :80)."
