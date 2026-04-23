#!/usr/bin/env bash
# Free host ports used by docker-compose.dev.yml so ./bin/start.sh dev up can bind again.
#
# Does: compose down --remove-orphans, rm -f any container still publishing those ports,
#       optional docker network prune.
#
# If ports STILL busy: something is not Docker — use: sudo ss -tlnp | grep ':8026 '
# Nuclear option (stops ALL containers on this machine): sudo systemctl restart docker
#
# Usage (repo root):
#   ./bin/free-dev-ports.sh
#   ./bin/free-dev-ports.sh && ./bin/start.sh dev up

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=compose-env.sh
source "$SCRIPT_DIR/compose-env.sh"

if [ "$TD_ENV" != "dev" ]; then
  echo "This script is for TD_ENV=dev only (docker-compose.dev.yml)." >&2
  exit 1
fi

echo "==> docker compose down (remove orphans) — TD_ENV=$TD_ENV"
td_docker_compose down --remove-orphans || true

# Host ports published by docker-compose.dev.yml (update if compose changes)
PORTS=(8082 8443 4100 4101 8100 8101 8102 8105 6380 54432 39142 8026 8333 9333 8888)

echo "==> Removing any Docker container still publishing dev ports..."
for p in "${PORTS[@]}"; do
  ids="$(docker ps -aq --filter "publish=$p" 2>/dev/null || true)"
  ids="$(echo "$ids" | tr -s '[:space:]' ' ' | xargs)"
  if [ -n "$ids" ]; then
    echo "    port $p -> docker rm -f $ids"
    # shellcheck disable=SC2086
    docker rm -f $ids || true
  fi
done

# Fallback: grep docker ps output (older Docker without publish filter quirks)
while read -r line; do
  id="${line%% *}"
  if [[ "$line" =~ :8026- ]]; then
    echo "    (fallback) removing $id (ports: $line)"
    docker rm -f "$id" || true
  fi
done < <(docker ps -a --format '{{.ID}} {{.Ports}}' | grep -E ':8026->' || true)

echo "==> docker network prune (dangling)"
docker network prune -f >/dev/null || true

echo ""
echo "Done. Check listeners:"
for p in 8026 8082 54432; do
  if ss -tlnp 2>/dev/null | grep -q ":$p "; then
    echo "  WARNING: something still listens on :$p —"
    ss -tlnp 2>/dev/null | grep ":$p " || true
  else
    echo "  OK :$p appears free (or only IPv6 — check ss -tlnp)"
  fi
done

echo ""
echo "Next: ./bin/start.sh dev up"
echo "If a port is still 'already allocated' but ss shows nothing, try: sudo systemctl restart docker"
