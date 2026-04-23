#!/usr/bin/env bash
# Enable local HTTPS for dev.aiepic.app on system nginx.
# This is required in browsers because .app is HSTS-preloaded.
#
# Prerequisites:
#   - system nginx installed and running
#   - host mapping exists (01-add-dev-hosts.sh)
#   - HTTP proxy site exists (02-install-system-nginx-proxy.sh)
#   - mkcert installed and local CA trusted
#
# Requires: sudo (internally). Run this script as your normal user.

set -euo pipefail

DOMAIN="${DOMAIN:-dev.aiepic.app}"
UPSTREAM="${UPSTREAM:-127.0.0.1:8082}"
SITE="${SITE:-dev.aiepic.app}"

SSL_DIR="${SSL_DIR:-/etc/nginx/local-certs}"
KEY_FILE="${SSL_DIR}/${DOMAIN}.key"
CRT_FILE="${SSL_DIR}/${DOMAIN}.crt"

AVAILABLE="/etc/nginx/sites-available/${SITE}"
ENABLED="/etc/nginx/sites-enabled/${SITE}"

if ! command -v nginx >/dev/null 2>&1; then
  echo "ERROR: nginx not found. Install it first, e.g. sudo apt install nginx"
  exit 1
fi

if ! command -v mkcert >/dev/null 2>&1; then
  echo "ERROR: mkcert not found."
  echo "Install: https://github.com/FiloSottile/mkcert"
  exit 1
fi

if [ "${EUID}" -eq 0 ]; then
  echo "ERROR: Do not run this script with sudo."
  echo "Run it as your user so mkcert uses your trusted local CA."
  echo "Then the script will use sudo only for nginx file operations."
  exit 1
fi

echo "Ensuring certificate directory exists: ${SSL_DIR}"
sudo mkdir -p "${SSL_DIR}"

echo "Generating local certificate with mkcert (user trust store) for ${DOMAIN}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

mkcert -cert-file "${TMP_DIR}/${DOMAIN}.crt" -key-file "${TMP_DIR}/${DOMAIN}.key" "${DOMAIN}"
sudo install -m 600 "${TMP_DIR}/${DOMAIN}.key" "${KEY_FILE}"
sudo install -m 644 "${TMP_DIR}/${DOMAIN}.crt" "${CRT_FILE}"

echo "Writing HTTPS+HTTP nginx site: ${AVAILABLE}"
sudo tee "${AVAILABLE}" >/dev/null <<EOF
# HTTP and HTTPS proxy for ${DOMAIN} -> Docker nginx-proxy on ${UPSTREAM}
# Browsers force HTTPS on .app TLD (HSTS preload), so TLS listener is required.

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

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${DOMAIN};

    ssl_certificate ${CRT_FILE};
    ssl_certificate_key ${KEY_FILE};
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
    }
}
EOF

echo "Enabling site: ${ENABLED}"
sudo ln -sf "${AVAILABLE}" "${ENABLED}"

echo "Testing nginx config..."
sudo nginx -t

echo "Reloading nginx..."
sudo systemctl reload nginx

echo "Done. Open https://${DOMAIN}/app/"
