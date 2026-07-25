#!/usr/bin/env bash
# Production deploy helper for tools.datawork.top + s3.datawork.top on an Ubuntu VPS.
#
# Run ON the VPS from the repo root (e.g. /opt/tools-dashboard) as root:
#   bash scripts/vps-deploy-datawork.sh
#
# Flags:
#   --inventory-only   Phase 0 inventory, then exit
#   --skip-dns-wait    Do not wait for DNS A records
#   --skip-certbot     Install HTTP vhosts only (no Let's Encrypt)
#   --skip-stack       Do not run start.sh prd up-build
#   --verify-only      Only run verification checks
#
# Prerequisites: Docker + Compose plugin, nginx, DNS A records (unless --skip-dns-wait),
#                .env.prd present with production secrets and datawork.top URLs.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

VPS_IP_EXPECTED="${VPS_IP_EXPECTED:-169.58.4.85}"
DOMAINS=(tools.datawork.top s3.datawork.top www.datawork.top)
INVENTORY_OUT="${REPO_ROOT}/tmp/vps-inventory-$(date +%Y%m%d-%H%M%S).txt"

SKIP_DNS_WAIT=0
SKIP_CERTBOT=0
SKIP_STACK=0
INVENTORY_ONLY=0
VERIFY_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --inventory-only) INVENTORY_ONLY=1 ;;
    --skip-dns-wait) SKIP_DNS_WAIT=1 ;;
    --skip-certbot) SKIP_CERTBOT=1 ;;
    --skip-stack) SKIP_STACK=1 ;;
    --verify-only) VERIFY_ONLY=1 ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown flag: $arg" >&2
      exit 1
      ;;
  esac
done

die() { echo "ERROR: $*" >&2; exit 1; }

need_root() {
  [[ "$(id -u)" -eq 0 ]] || die "run as root on the VPS (sudo bash scripts/vps-deploy-datawork.sh)"
}

phase0_inventory() {
  mkdir -p "${REPO_ROOT}/tmp"
  {
    echo "=== Phase 0 inventory $(date -Is) ==="
    echo "--- hostnamectl ---"
    hostnamectl 2>/dev/null | sed -n '1,8p' || true
    echo "--- memory / disk ---"
    free -h | head -2
    df -h / | tail -1
    echo "--- public IPv4 ---"
    PUB="$(curl -4 -s --max-time 10 ifconfig.me 2>/dev/null || true)"
    echo "ifconfig.me=${PUB:-unknown}"
    echo "route_src=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}')"
    echo "--- listeners 80/443/8333 + prd host upstream ports ---"
    ss -tlnp | grep -E ':80 |:443 |:8333 |:13001 |:13002 |:18000 |:18001 |:18010 |:18888 ' || true
    echo "--- docker / nginx ---"
    command -v docker; docker --version 2>/dev/null || true
    docker compose version 2>/dev/null || true
    command -v nginx; nginx -v 2>&1 || true
    echo "--- nginx sites ---"
    ls -la /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null || true
    echo "--- nginx server_name / listen / ssl ---"
    nginx -T 2>/dev/null | grep -E 'server_name|listen |ssl_certificate' || true
    echo "--- ufw ---"
    ufw status 2>/dev/null || true
    echo "--- dig ---"
    for d in "${DOMAINS[@]}"; do
      echo -n "$d -> "
      dig +short "$d" A 2>/dev/null | tr '\n' ' '
      echo
    done
  } | tee "$INVENTORY_OUT"
  echo "Inventory written: $INVENTORY_OUT"
  if [[ -n "${PUB:-}" && "$PUB" != "$VPS_IP_EXPECTED" ]]; then
    echo "WARN: public IP ${PUB} != expected ${VPS_IP_EXPECTED}. Update Namecheap A records."
  fi
}

wait_for_dns() {
  echo "==> Waiting for DNS A records → ${VPS_IP_EXPECTED}"
  local deadline=$((SECONDS + 600))
  while (( SECONDS < deadline )); do
    local ok=1
    for d in tools.datawork.top s3.datawork.top www.datawork.top; do
      local got
      got="$(dig +short "$d" A 2>/dev/null | head -1)"
      [[ "$got" == "$VPS_IP_EXPECTED" ]] || ok=0
    done
    if [[ "$ok" -eq 1 ]]; then
      echo "DNS ready."
      return 0
    fi
    echo "  not ready yet; sleeping 15s..."
    sleep 15
  done
  die "DNS not pointing to ${VPS_IP_EXPECTED} within 10 minutes. See infra/nginx/host-setup/prd/NAMECHEAP_DNS.md"
}

install_host_nginx() {
  echo "==> Installing host nginx vhosts"
  bash "${REPO_ROOT}/infra/nginx/host-setup/05-install-prd-datawork-host-nginx.sh"
}

run_certbot() {
  echo "==> Certbot Let's Encrypt"
  command -v certbot >/dev/null 2>&1 || apt-get install -y certbot python3-certbot-nginx
  certbot --nginx \
    -d tools.datawork.top \
    -d s3.datawork.top \
    -d www.datawork.top \
    --redirect \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email \
    || certbot --nginx \
      -d tools.datawork.top \
      -d s3.datawork.top \
      -d www.datawork.top \
      --redirect \
      --non-interactive \
      --agree-tos \
      --email "${CERTBOT_EMAIL:-admin@tools.datawork.top}"
  certbot renew --dry-run
}

ensure_env() {
  [[ -f "${REPO_ROOT}/.env.prd" ]] || die ".env.prd missing — copy .env.prd.example and set secrets/URLs"
  grep -q 'TD_PUBLIC_BASE_URL=https://tools.datawork.top' "${REPO_ROOT}/.env.prd" \
    || die ".env.prd TD_PUBLIC_BASE_URL must be https://tools.datawork.top"
  grep -q 'SEAWEEDFS_S3_DOMAIN_NAME=s3.datawork.top' "${REPO_ROOT}/.env.prd" \
    || die ".env.prd SEAWEEDFS_S3_DOMAIN_NAME must be s3.datawork.top"
}

init_seaweed_and_stack() {
  echo "==> SeaweedFS config + stack up"
  bash "${REPO_ROOT}/scripts/init-seaweedfs-config.sh" "${REPO_ROOT}/.env.prd"
  # Use bash explicitly — sync/checkout may drop the executable bit.
  bash "${REPO_ROOT}/bin/start.sh" prd preflight
  bash "${REPO_ROOT}/bin/start.sh" prd up-build
  bash "${REPO_ROOT}/bin/start.sh" prd status || true
}

verify() {
  echo "==> Verification"
  local fail=0
  echo "--- localhost binds (prd host upstream ports) ---"
  for port in 13001 13002 18000 18001 18010 18888 8333; do
    if ss -tlnp | grep -E "127\.0\.0\.1:${port}"; then
      echo "OK 127.0.0.1:${port}"
    else
      echo "FAIL missing 127.0.0.1:${port}"; fail=1
    fi
  done
  if ss -tlnp | grep -E '0\.0\.0\.0:(13001|13002|18000|18001|18010|18888|8333)'; then
    echo "FAIL Docker ports published on 0.0.0.0 (must be localhost only)"; fail=1
  else
    echo "OK no public prd upstream ports"
  fi
  if ss -tlnp | grep -E '127\.0\.0\.1:8082'; then
    echo "WARN 127.0.0.1:8082 still listening (legacy nginx-proxy — remove after host nginx cutover)"
  fi
  echo "--- HTTPS tools ---"
  if curl -fsSI --max-time 20 https://tools.datawork.top/app/ | head -5; then
    echo "OK tools HTTPS"
  else
    echo "FAIL tools HTTPS"; fail=1
  fi
  echo "--- HTTPS s3 (expect 403/400 without SigV4 is OK if TLS works) ---"
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 https://s3.datawork.top/ || true)"
  echo "s3 HTTP status=${code}"
  if [[ "$code" == "000" ]]; then
    echo "FAIL s3 HTTPS unreachable"; fail=1
  else
    echo "OK s3 TLS responds"
  fi
  echo "--- www redirect ---"
  curl -sI --max-time 15 http://www.datawork.top/ | head -8 || fail=1
  [[ "$fail" -eq 0 ]] || die "verification failed"
  echo "All automated checks passed. Manual: admin sign-in, OAuth, WebSocket wss://tools.datawork.top/ws/"
}

# --- main ---
need_root

if [[ "$VERIFY_ONLY" -eq 1 ]]; then
  verify
  exit 0
fi

phase0_inventory
[[ "$INVENTORY_ONLY" -eq 1 ]] && exit 0

# Packages
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y nginx certbot python3-certbot-nginx curl ca-certificates dnsutils
docker compose version >/dev/null 2>&1 || apt-get install -y docker-compose-plugin

ensure_env

if [[ "$SKIP_DNS_WAIT" -eq 0 ]]; then
  wait_for_dns
else
  echo "Skipping DNS wait (--skip-dns-wait)"
fi

install_host_nginx

if [[ "$SKIP_CERTBOT" -eq 0 ]]; then
  run_certbot
else
  echo "Skipping certbot (--skip-certbot)"
fi

if [[ "$SKIP_STACK" -eq 0 ]]; then
  init_seaweed_and_stack
else
  echo "Skipping stack (--skip-stack)"
fi

verify
echo "Deploy complete."
