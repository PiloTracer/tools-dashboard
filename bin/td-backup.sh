#!/usr/bin/env bash
# Non-interactive backup: PostgreSQL logical dump + data volume archives for Redis, Cassandra, SeaweedFS.
# Usage: TD_ENV=dev ./bin/td-backup.sh [backup_root_dir]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=compose-env.sh
source "$SCRIPT_DIR/compose-env.sh"

BACKUP_ROOT="${1:-}"
if [ -z "$BACKUP_ROOT" ]; then
  if [ -d "/mnt/data" ]; then
    BACKUP_ROOT="/mnt/data/backups_tools_dashboard"
  else
    BACKUP_ROOT="/var/tmp/backups_tools_dashboard"
  fi
fi

TS="$(date +%Y%m%d_%H%M%S)"
OUT="$BACKUP_ROOT/$TD_ENV/$TS"
mkdir -p "$OUT"

echo "[td-backup] TD_ENV=$TD_ENV compose=$TD_COMPOSE_FILE -> $OUT"

pg_logical_ok=0
if td_docker_compose ps -q postgresql 2>/dev/null | grep -q .; then
  if td_docker_compose exec -T postgresql pg_dump -U user -d main_db -Fc >"$OUT/postgres.dump"; then
    pg_logical_ok=1
  else
    echo "[td-backup] pg_dump failed" >&2
    exit 1
  fi
else
  echo "[td-backup] WARNING: postgresql not running; skipping pg_dump (will try raw volume archive)" >&2
fi

backup_vol() {
  local vol="$1"
  local name="$2"
  if docker volume inspect "$vol" >/dev/null 2>&1; then
    docker run --rm -v "${vol}:/v:ro" -v "$OUT:/out" busybox tar czf "/out/${name}_${TS}.tar.gz" -C /v .
    echo "[td-backup] archived volume $vol -> ${name}_${TS}.tar.gz"
  else
    echo "[td-backup] skip missing volume: $vol"
  fi
}

if [ "$pg_logical_ok" -ne 1 ]; then
  backup_vol "$TD_VOLUME_POSTGRES" "postgres_data"
fi
backup_vol "$TD_VOLUME_REDIS" "redis"
backup_vol "$TD_VOLUME_CASSANDRA" "cassandra"
backup_vol "$TD_VOLUME_SEAWEED" "seaweedfs"

ln -sfn "$OUT" "$BACKUP_ROOT/$TD_ENV/latest"
echo "[td-backup] done: $OUT"
