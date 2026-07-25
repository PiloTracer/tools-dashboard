#!/usr/bin/env bash
# Install host nginx site configs for tools / s3 / www.datawork.top.
# Production routing lives on the HOST — docker-compose.prd.yml does not run nginx-proxy.
#
# Run on the production VPS as root (or with sudo):
#   cd /opt/tools-dashboard
#   sudo bash infra/nginx/host-setup/05-install-prd-datawork-host-nginx.sh
#
# After DNS points here:
#   sudo certbot --nginx -d tools.datawork.top -d s3.datawork.top -d www.datawork.top --redirect
#
# Requires: nginx installed; Docker stack publishing 127.0.0.1 TD_HOST_* ports (see .env.prd.example).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
PRD_DIR="${SCRIPT_DIR}/prd"
CONF_D="/etc/nginx/conf.d"
SNIPPETS="/etc/nginx/snippets"
LANDING_SRC="${REPO_ROOT}/infra/nginx/landing"
LANDING_DST="/var/www/tools-dashboard-landing"
TOOLS_CERT="/etc/letsencrypt/live/tools.datawork.top/fullchain.pem"

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

mkdir -p "$CONF_D" "$SNIPPETS" "$LANDING_DST"

echo "Installing landing page → $LANDING_DST"
cp -f "${LANDING_SRC}/index.html" "${LANDING_DST}/index.html"

echo "Installing routing snippet → ${SNIPPETS}/tools-dashboard-routing.conf"
cp -f "${PRD_DIR}/tools.datawork.top.routing.conf" "${SNIPPETS}/tools-dashboard-routing.conf"

install_tools_conf() {
  local dst="${CONF_D}/tools.datawork.top.conf"
  local src

  if [[ -f "$TOOLS_CERT" ]]; then
    src="${PRD_DIR}/tools.datawork.top.conf"
  else
    src="${PRD_DIR}/tools.datawork.top.http-only.conf"
  fi

  # Always install the full tools vhost (maps + servers). Do not strip map{} based on
  # nginx -T — the old tools.datawork.top.conf is replaced in this run, so a prior map
  # in that file is not a duplicate once the new file is written.
  cp -f "$src" "$dst"
}

install_tools_conf
cp -f "${PRD_DIR}/s3.datawork.top.conf" "${CONF_D}/s3.datawork.top.conf"
cp -f "${PRD_DIR}/www.datawork.top.conf" "${CONF_D}/www.datawork.top.conf"

for site in tools.datawork.top s3.datawork.top www.datawork.top; do
  rm -f "/etc/nginx/sites-enabled/${site}" "/etc/nginx/sites-available/${site}" 2>/dev/null || true
done

echo "Testing nginx config..."
nginx -t
echo "Reloading nginx..."
systemctl reload nginx
echo "Done. Host nginx routes tools.datawork.top (no Docker nginx-proxy)."
echo "Published upstream ports (127.0.0.1): front-admin 13001, front-public 13002, back-api 18000,"
echo "  back-auth 18001, back-websockets 18010, seaweed filer 18888, seaweed S3 8333"
if [[ ! -f "$TOOLS_CERT" ]]; then
  echo "Next: certbot --nginx -d tools.datawork.top -d s3.datawork.top -d www.datawork.top --redirect"
fi
