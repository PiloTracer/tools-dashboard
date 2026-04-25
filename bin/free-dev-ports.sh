#!/usr/bin/env bash
# Free host ports used by docker-compose.dev.yml so ./bin/start.sh dev up can bind again.
#
# Only removes **this compose project's** containers (label com.docker.compose.project).
# Other Docker stacks (other projects or non-compose containers) are never stopped.
#
# If ports are still busy: something else is bound — use: ss -tlnp | grep ':18026 '
# Do not use "restart docker" to free ports unless you intend to stop every container on the host.
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

# Label Docker sets on containers created by compose for this project.
td_container_project_label() {
  docker inspect --format '{{ index .Config.Labels "com.docker.compose.project" }}' "$1" 2>/dev/null || true
}

echo "==> docker compose down (remove orphans) — TD_ENV=$TD_ENV project=$TD_PROJ"
td_docker_compose down --remove-orphans || true

# Host ports published by docker-compose.dev.yml (update if compose changes)
PORTS=(8082 8443 4100 4101 8100 8101 8102 8105 6380 54432 39142 18026 8026 18333 19333 18888 8333 9333 8888)

echo "==> Removing only containers for project '$TD_PROJ' that still publish dev ports..."
for p in "${PORTS[@]}"; do
  while IFS= read -r id; do
    [ -n "$id" ] || continue
    lbl="$(td_container_project_label "$id")"
    if [ "$lbl" = "$TD_PROJ" ]; then
      echo "    port $p -> docker rm -f $id  (project $TD_PROJ)"
      docker rm -f "$id" || true
    elif [ -n "$lbl" ]; then
      echo "    port $p -> skip $id  (other compose project: $lbl)" >&2
    else
      echo "    port $p -> skip $id  (not a compose project container — not removing)" >&2
    fi
  done < <(docker ps -q --filter "publish=$p" 2>/dev/null || true)
done

# Fallback: Mailhog ports (only remove if this project)
while read -r line; do
  [ -n "$line" ] || continue
  id="${line%% *}"
  lbl="$(td_container_project_label "$id")"
  if [ "$lbl" = "$TD_PROJ" ] && { [[ "$line" =~ :18026- ]] || [[ "$line" =~ :8026- ]]; }; then
    echo "    (fallback) removing $id (ports: $line) project $TD_PROJ"
    docker rm -f "$id" || true
  fi
done < <(docker ps -a --format '{{.ID}} {{.Ports}}' | grep -E ':(18026|8026)->' || true)

echo "==> Skipping docker network prune (global; would risk other stacks). Unused nets from this project are removed on compose down."

echo ""
echo "Done. Check listeners:"
for p in 18026 8026 8082 54432; do
  if ss -tlnp 2>/dev/null | grep -q ":$p "; then
    echo "  WARNING: something still listens on :$p —"
    ss -tlnp 2>/dev/null | grep ":$p " || true
  else
    echo "  OK :$p appears free (or only IPv6 — check ss -tlnp)"
  fi
done

echo ""
echo "Next: ./bin/start.sh dev up"
echo "If a port is still 'already allocated' but ss shows nothing, investigate with: docker ps --format '{{.ID}} {{.Names}} {{.Ports}}'"
