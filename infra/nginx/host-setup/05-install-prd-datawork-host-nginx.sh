#!/usr/bin/env bash
# Install host nginx site configs for tools / s3 / www.datawork.top (HTTP only).
# Run on the production VPS as root (or with sudo).
# After DNS points here: certbot --nginx -d tools.datawork.top -d s3.datawork.top -d www.datawork.top --redirect
#
# Requires: nginx installed; Docker stack will bind 127.0.0.1:8082 and :8333

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_DIR="${SCRIPT_DIR}/prd"
CONF_D="/etc/nginx/conf.d"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "ERROR: run as root (or sudo $0)" >&2
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "ERROR: nginx not found. Install: apt install -y nginx" >&2
  exit 1
fi

if [[ ! -d "$PRD_DIR" ]]; then
  echo "ERROR: missing $PRD_DIR" >&2
  exit 1
fi

mkdir -p "$CONF_D"

# Avoid duplicate map{} if tools conf is re-installed while another map exists.
# tools.datawork.top.conf includes a map block — if nginx already has
# $connection_upgrade, strip the map from the installed copy.
install_tools_conf() {
  local src="${PRD_DIR}/tools.datawork.top.conf"
  local dst="${CONF_D}/tools.datawork.top.conf"
  if nginx -T 2>/dev/null | grep -q 'map \$http_upgrade \$connection_upgrade'; then
    echo "Existing \$connection_upgrade map found — installing tools conf without map block"
    awk '
      BEGIN { skip=0 }
      /^map \$http_upgrade \$connection_upgrade/ { skip=1; next }
      skip && /^}/ { skip=0; next }
      !skip { print }
    ' "$src" >"$dst"
  else
    cp -f "$src" "$dst"
  fi
}

install_tools_conf
cp -f "${PRD_DIR}/s3.datawork.top.conf" "${CONF_D}/s3.datawork.top.conf"
cp -f "${PRD_DIR}/www.datawork.top.conf" "${CONF_D}/www.datawork.top.conf"

# Drop legacy sites-* duplicates if present
for site in tools.datawork.top s3.datawork.top www.datawork.top; do
  rm -f "/etc/nginx/sites-enabled/${site}" "/etc/nginx/sites-available/${site}" 2>/dev/null || true
done

echo "Testing nginx config..."
nginx -t
echo "Reloading nginx..."
systemctl reload nginx
echo "Done. HTTP vhosts installed for tools / s3 / www.datawork.top"
echo "Next: wait for DNS, then certbot --nginx -d tools.datawork.top -d s3.datawork.top -d www.datawork.top --redirect"
