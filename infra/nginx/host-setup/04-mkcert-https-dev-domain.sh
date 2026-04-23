#!/usr/bin/env bash
# Browser-trusted HTTPS for dev.aiepic.app → Docker nginx on 127.0.0.1:8082
#
# Why: infra/nginx/host-setup/03-enable-local-https-dev-domain.sh uses a self-signed
# certificate. Many browsers (Chrome strict mode, Yandex / NeuroProtect, corporate TLS
# inspection) refuse the connection entirely with "Cannot establish a secure connection".
# mkcert installs a local CA your OS trusts, then signs certs that those browsers accept.
#
# Prerequisites:
#   - mkcert installed and `mkcert -install` run once (installs the local CA).
#     See https://github.com/FiloSottile/mkcert#installation (package manager or GitHub release binary).
#   - Docker stack publishing nginx on 8082 (docker-compose.dev.yml).
#   - /etc/hosts: 127.0.0.1 dev.aiepic.app (see 01-add-dev-hosts.sh).
#   - sudo for writing /etc/nginx/ssl and /etc/nginx/conf.d
#
# Requires: sudo

set -euo pipefail

DOMAIN="${DOMAIN:-dev.aiepic.app}"
UPSTREAM="${UPSTREAM:-127.0.0.1:8082}"
SITE="$DOMAIN"
SSL_DIR="/etc/nginx/ssl/${DOMAIN}-mkcert"
CONF_FILE="/etc/nginx/conf.d/${SITE}.conf"

if ! command -v mkcert >/dev/null 2>&1; then
  echo "mkcert not found in PATH." >&2
  echo "Install from https://github.com/FiloSottile/mkcert then run: mkcert -install" >&2
  exit 1
fi

TMPDIR="${TMPDIR:-/tmp}"
WORKDIR="$(mktemp -d "${TMPDIR%/}/mkcert-td-XXXXXX")"
chmod 700 "$WORKDIR"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

cd "$WORKDIR"
echo "Generating certificate for ${DOMAIN} (and localhost) in ${WORKDIR}..."
mkcert -cert-file cert.pem -key-file key.pem "${DOMAIN}" localhost 127.0.0.1 ::1

echo "Installing cert/key to ${SSL_DIR}..."
sudo mkdir -p "${SSL_DIR}"
sudo cp cert.pem "${SSL_DIR}/fullchain.pem"
sudo cp key.pem "${SSL_DIR}/privkey.pem"
sudo chmod 640 "${SSL_DIR}/fullchain.pem" "${SSL_DIR}/privkey.pem"
sudo chown root:root "${SSL_DIR}/fullchain.pem" "${SSL_DIR}/privkey.pem" 2>/dev/null || true

echo "Writing ${CONF_FILE} (HTTP→HTTPS + TLS reverse proxy to ${UPSTREAM})..."
sudo tee "${CONF_FILE}" >/dev/null <<EOF
# Local HTTPS for ${DOMAIN} — mkcert (browser-trusted); see 04-mkcert-https-dev-domain.sh

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name ${DOMAIN};

    ssl_certificate     ${SSL_DIR}/fullchain.pem;
    ssl_certificate_key ${SSL_DIR}/privkey.pem;

    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 10M;

    location / {
        proxy_pass http://${UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port 443;
    }
}
EOF

sudo rm -f "/etc/nginx/sites-enabled/${SITE}" "/etc/nginx/sites-available/${SITE}" 2>/dev/null || true

echo "Testing nginx config..."
if ! sudo nginx -t 2>&1; then
  echo "If nginx complains about missing include: ensure /etc/nginx/nginx.conf includes conf.d." >&2
  exit 1
fi

echo "Reloading nginx..."
sudo systemctl reload nginx

echo ""
echo "Done. Open: https://${DOMAIN}/app"
echo "This certificate is signed by mkcert's local CA (run mkcert -install on this machine if another browser still complains)."
echo "Set PUBLIC_APP_BASE_URL=https://${DOMAIN}/app in .env and restart compose if needed."
