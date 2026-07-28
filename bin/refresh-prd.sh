#!/usr/bin/env bash
# Fast production refresh: build + recreate only the services you name.
# No git — run git pull yourself first if needed.
#
#   cd /opt/tools-dashboard
#   git pull
#   sudo ./bin/refresh-prd.sh front-admin
#   sudo ./bin/refresh-prd.sh --all
#   sudo ./bin/refresh-prd.sh --no-cache front-admin back-api
#
# Requires: .env.prd, docker compose plugin, prd stack already provisioned (bin/start.sh prd up-build once).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TD_PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TD_ENV=prd

ALL_APP_SERVICES=(
  front-admin
  front-public
  back-api
  back-auth
  back-websockets
  back-workers
  back-postgres-service
  back-cassandra
  feature-registry
)

INFRA_SERVICES=(redis postgresql cassandra seaweedfs)

DRY_RUN=0
NO_CACHE=0
FORCE_ALL=0
RECREATE_ONLY=0
NGINX_RELOAD=0
EXPLICIT_SERVICES=()

usage() {
  cat <<'EOF'
Usage: ./bin/refresh-prd.sh [options] [service ...]

Build and recreate only the named production services. Does not run git.

Services:
  front-admin  front-public  back-api  back-auth  back-websockets
  back-workers  back-postgres-service  back-cassandra  feature-registry
  redis  postgresql  cassandra  seaweedfs

Options:
  --all             All application services (not redis/postgres/cassandra/seaweedfs)
  --no-cache        docker compose build --no-cache
  --recreate-only   Recreate containers without rebuilding images
  --nginx-reload    Reload host nginx after stack refresh
  --dry-run         Print plan only
  -h, --help        Show this help

Examples:
  git pull && sudo ./bin/refresh-prd.sh front-admin
  sudo ./bin/refresh-prd.sh --all
  sudo ./bin/refresh-prd.sh --no-cache front-admin back-api
  sudo ./bin/refresh-prd.sh --recreate-only front-admin
EOF
}

die() { echo "ERROR: $*" >&2; exit 1; }

log() { echo "==> $*"; }

td_read_env_key() {
  local key="${1:-}" line val f
  [ -n "$key" ] || return 1
  for f in "$TD_ENV_FILE" "$TD_PROJECT_ROOT/.env" "$TD_PROJECT_ROOT/.env.$TD_ENV"; do
    [ -n "$f" ] && [ -f "$f" ] || continue
    line=$(grep -E "^${key}=" "$f" 2>/dev/null | head -1) || true
    if [ -n "$line" ]; then
      val=${line#*=}
      val=$(printf '%s' "$val" | tr -d '\r' | tr -d '"' | tr -d "'" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      echo "$val"
      return 0
    fi
  done
  return 1
}

td_stack_suffix_effective() {
  local s app
  s="$(td_read_env_key TD_STACK_SUFFIX 2>/dev/null || true)"
  s=$(printf '%s' "$s" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  if [ -n "$s" ]; then
    echo "$s"
    return
  fi
  app="$(td_read_env_key TD_APP_CODE 2>/dev/null || true)"
  [ -n "$app" ] || app=tds
  echo "_${TD_ENV}_${app}"
}

td_compose_project_name() {
  local v base suff
  v="$(td_read_env_key COMPOSE_PROJECT_NAME 2>/dev/null || true)"
  v=$(printf '%s' "$v" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  if [ -n "$v" ]; then
    echo "$v"
    return
  fi
  base="$(td_read_env_key TD_STACK_BASE 2>/dev/null || true)"
  base=$(printf '%s' "$base" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  [ -n "$base" ] || base=tools_dashboard
  suff=$(td_stack_suffix_effective)
  echo "${base}${suff}"
}

td_apply_stack_env() {
  export TD_COMPOSE_FILE="docker-compose.prd.yml"
  export TD_COMPOSE_PATH="$TD_PROJECT_ROOT/$TD_COMPOSE_FILE"
  if [ -f "$TD_PROJECT_ROOT/.env.prd" ]; then
    export TD_ENV_FILE="$TD_PROJECT_ROOT/.env.prd"
  elif [ -f "$TD_PROJECT_ROOT/.env" ]; then
    export TD_ENV_FILE="$TD_PROJECT_ROOT/.env"
  else
    export TD_ENV_FILE=""
  fi
  export TD_PROJ
  TD_PROJ="$(td_compose_project_name)"
}

td_docker_compose() {
  if [ -n "$TD_ENV_FILE" ]; then
    docker compose -p "$TD_PROJ" -f "$TD_COMPOSE_PATH" --env-file "$TD_ENV_FILE" "$@"
  else
    docker compose -p "$TD_PROJ" -f "$TD_COMPOSE_PATH" "$@"
  fi
}

td_compose_build() {
  export BUILDKIT_PROGRESS="${BUILDKIT_PROGRESS:-plain}"
  export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"
  local -a args=(build --progress=plain)
  if [ "$NO_CACHE" -eq 1 ]; then
    args+=(--no-cache)
  fi
  args+=("$@")
  td_docker_compose "${args[@]}"
}

declare -A SERVICE_HIT=()

add_service() {
  SERVICE_HIT["$1"]=1
}

expand_dependencies() {
  if [ -n "${SERVICE_HIT[back-api]:-}" ]; then
    add_service back-workers
  fi
  if [ -n "${SERVICE_HIT[back-postgres-service]:-}" ]; then
    add_service back-auth
  fi
}

is_known_service() {
  local s="$1" known
  for known in "${ALL_APP_SERVICES[@]}" "${INFRA_SERVICES[@]}"; do
    [ "$known" = "$s" ] && return 0
  done
  return 1
}

services_to_array() {
  SELECTED_SERVICES=()
  local s
  for s in "${ALL_APP_SERVICES[@]}" "${INFRA_SERVICES[@]}"; do
    if [ -n "${SERVICE_HIT[$s]:-}" ]; then
      SELECTED_SERVICES+=("$s")
    fi
  done
}

build_service_plan() {
  SERVICE_HIT=()

  if [ "$FORCE_ALL" -eq 1 ]; then
    local s
    for s in "${ALL_APP_SERVICES[@]}"; do add_service "$s"; done
  elif [ "${#EXPLICIT_SERVICES[@]}" -gt 0 ]; then
    local s
    for s in "${EXPLICIT_SERVICES[@]}"; do
      is_known_service "$s" || die "unknown service: $s (try --help)"
      add_service "$s"
    done
    expand_dependencies
  else
    die "no services selected — pass names or --all (see --help)"
  fi

  services_to_array
}

print_plan() {
  echo ""
  echo "Deploy plan (TD_ENV=${TD_ENV}, project=${TD_PROJ}):"
  echo "  services: ${SELECTED_SERVICES[*]}"
  if [ "$RECREATE_ONLY" -eq 1 ]; then
    echo "  mode: recreate only (no image build)"
  fi
  if [ "$NGINX_RELOAD" -eq 1 ]; then
    echo "  nginx: reload host config after refresh"
  fi
  echo ""
}

wait_for_services() {
  local -a svcs=("$@")
  local attempt=0 max=120
  log "waiting for services (up to ${max}s): ${svcs[*]}"
  while [ "$attempt" -lt "$max" ]; do
    local pending=0 s cid health state
    for s in "${svcs[@]}"; do
      cid="$(td_docker_compose ps -q "$s" 2>/dev/null | head -1 || true)"
      if [ -z "$cid" ]; then
        pending=1
        continue
      fi
      state="$(docker inspect -f '{{.State.Status}}' "$cid" 2>/dev/null || echo unknown)"
      if [ "$state" != "running" ]; then
        pending=1
        continue
      fi
      health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || echo none)"
      case "$health" in
        healthy|none) ;;
        unhealthy) die "service $s is unhealthy — check: docker compose logs $s" ;;
        *) pending=1 ;;
      esac
    done
    if [ "$pending" -eq 0 ]; then
      echo "All selected services are running."
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done
  echo "WARN: timed out waiting for health" >&2
  td_docker_compose ps "${svcs[@]}" || true
  return 1
}

verify_edge() {
  local base code
  base="$(td_read_env_key TD_PUBLIC_BASE_URL 2>/dev/null || true)"
  [ -n "$base" ] || return 0
  if printf '%s\n' "${SELECTED_SERVICES[@]}" | grep -qx front-admin; then
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "${base}/admin/" || true)"
    echo "  GET ${base}/admin/ → HTTP ${code}"
  fi
  if printf '%s\n' "${SELECTED_SERVICES[@]}" | grep -qx front-public; then
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "${base}/app/" || true)"
    echo "  GET ${base}/app/ → HTTP ${code}"
  fi
}

run_refresh() {
  local -a build_targets=() recreate_targets=() s
  for s in "${SELECTED_SERVICES[@]}"; do
    recreate_targets+=("$s")
    case "$s" in
      redis|postgresql|cassandra|seaweedfs) ;;
      *)
        if [ "$RECREATE_ONLY" -eq 0 ]; then
          build_targets+=("$s")
        fi
        ;;
    esac
  done

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "Would run: bash $SCRIPT_DIR/start.sh prd preflight"
    if [ "${#build_targets[@]}" -gt 0 ]; then
      echo "Would build: ${build_targets[*]}"
    fi
    echo "Would recreate: ${recreate_targets[*]}"
    if [ "$NGINX_RELOAD" -eq 1 ]; then
      echo "Would reload host nginx"
    fi
    return 0
  fi

  log "preflight"
  bash "$SCRIPT_DIR/start.sh" prd preflight

  if [ "${#build_targets[@]}" -gt 0 ]; then
    log "building: ${build_targets[*]}"
    td_compose_build "${build_targets[@]}"
  else
    log "skipping image build"
  fi

  log "recreating containers: ${recreate_targets[*]}"
  td_docker_compose up -d --no-deps --force-recreate "${recreate_targets[@]}"
  wait_for_services "${recreate_targets[@]}" || true

  if [ "$NGINX_RELOAD" -eq 1 ]; then
    log "reloading host nginx"
    if [ "$(id -u)" -eq 0 ]; then
      bash "$TD_PROJECT_ROOT/infra/nginx/host-setup/05-install-prd-datawork-host-nginx.sh"
    else
      echo "Run as root: sudo bash infra/nginx/host-setup/05-install-prd-datawork-host-nginx.sh"
    fi
  fi

  log "edge checks"
  verify_edge || true
  td_docker_compose ps "${recreate_targets[@]}"
  log "refresh complete"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --all) FORCE_ALL=1; shift ;;
    --no-cache) NO_CACHE=1; shift ;;
    --recreate-only) RECREATE_ONLY=1; shift ;;
    --nginx-reload) NGINX_RELOAD=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    --) shift; break ;;
    --no-pull|--since|--allow-dirty|--keep-local)
      die "removed option: $1 (this script does not use git)"
      ;;
    -*)
      die "unknown option: $1 (try --help)"
      ;;
    *)
      EXPLICIT_SERVICES+=("$1")
      shift
      ;;
  esac
done
while [ "$#" -gt 0 ]; do
  EXPLICIT_SERVICES+=("$1")
  shift
done

[ -f "$TD_PROJECT_ROOT/.env.prd" ] || die ".env.prd missing — copy .env.prd.example and set secrets"
td_apply_stack_env
[ -f "$TD_COMPOSE_PATH" ] || die "missing $TD_COMPOSE_PATH"

build_service_plan
print_plan
run_refresh
