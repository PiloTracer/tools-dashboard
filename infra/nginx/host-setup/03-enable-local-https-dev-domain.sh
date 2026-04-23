#!/usr/bin/env bash
# Enable HTTPS on the HOST nginx for dev.aiepic.app (local self-signed cert).
# TLS terminates here; traffic to Docker stays HTTP on UPSTREAM (default 127.0.0.1:8082).
#
# Prerequisites:
#   - nginx + openssl on host
#   - Run 02-install-system-nginx-proxy.sh first (or any prior HTTP site for this domain —
#     this script REPLACES /etc/nginx/sites-available/dev.aiepic.app with HTTP→HTTPS redirect + :443 server)
#   - Docker nginx-proxy published on 8082
#
# Browser: first visit shows self-signed warning — accept once (or install mkcert separately).
#
# Requires: sudo

set -euo pipefail

DOMAIN="${DOMAIN:-dev.aiepic.app}"
UPSTREAM="${UPSTREAM:-127.0.0.1:8082}"
SITE="dev.aiepic.app"
AVAILABLE="/etc/nginx/sites-available/${SITE}"
ENABLED="/etc/nginx/sites-enabled/${SITE}"
CERT_DIR="/etc/nginx/ssl/${DOMAIN}"

if ! command -v nginx >/dev/null 2>&1; then
  echo "ERROR: nginx not found. Install: sudo apt install nginx"
  exit 1
fi
if ! command -v openssl >/dev/null 2>&1; then
  echo "ERROR: openssl not found. Install: sudo apt install openssl"
  exit 1
fi

# Debian-style paths; some minimal installs omit these directories
SITES_AVAILABLE="$(dirname "${AVAILABLE}")"
SITES_ENABLED="$(dirname "${ENABLED}")"
sudo mkdir -p "${SITES_AVAILABLE}" "${SITES_ENABLED}"

echo "Creating cert directory: ${CERT_DIR}"
sudo mkdir -p "${CERT_DIR}"

OPENSSL_CNF="$(mktemp)"
cleanup() { rm -f "${OPENSSL_CNF}"; }
trap cleanup EXIT

cat >"${OPENSSL_CNF}" <<EOF
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = dn
x509_extensions    = v3_req

[dn]
CN = ${DOMAIN}

[v3_req]
subjectAltName = @alt_names
basicConstraints = CA:FALSE
keyUsage         = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = ${DOMAIN}
DNS.2 = localhost
IP.1  = 127.0.0.1
EOF

KEY="${CERT_DIR}/privkey.pem"
CRT="${CERT_DIR}/fullchain.pem"

if [[ -f "${KEY}" && -f "${CRT}" ]]; then
  echo "Certs already exist at ${CERT_DIR}; reusing (delete that dir to regenerate)."
else
  echo "Generating self-signed certificate (365 days, SAN for ${DOMAIN})..."
  sudo openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -keyout "${KEY}" -out "${CRT}" \
    -config "${OPENSSL_CNF}" -extensions v3_req
  sudo chmod 640 "${KEY}" "${CRT}"
  sudo chown root:root "${KEY}" "${CRT}" 2>/dev/null || true
fi

echo "Writing ${AVAILABLE} (HTTP→HTTPS redirect + TLS reverse proxy to ${UPSTREAM})"
sudo tee "${AVAILABLE}" >/dev/null <<EOF
# Local HTTPS for ${DOMAIN} — self-signed; see infra/nginx/host-setup/03-enable-local-https-dev-domain.sh

# Redirect plain HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate     ${CRT};
    ssl_certificate_key ${KEY};

    # Reasonable local defaults (not a public production hardening profile)
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
if ! sudo nginx -t 2>&1; then
  echo "If nginx complains about missing include: ensure /etc/nginx/nginx.conf has a line like:"
  echo "  include /etc/nginx/sites-enabled/*;"
  exit 1
fi

echo "Reloading nginx..."
sudo systemctl reload nginx

echo ""
echo "Done. Open: https://${DOMAIN}/app"
echo "If the browser warns about the certificate, that is expected for self-signed local certs."
echo "Firewall: if needed, allow 443 — e.g. sudo ufw allow 'Nginx HTTPS' || sudo ufw allow 443/tcp"
echo "Set app/OAuth base URLs to https://${DOMAIN}/app (no :8082) and restart the compose stack."
