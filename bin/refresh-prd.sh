#!/usr/bin/env bash
# Fast production refresh: sync repo to origin → detect changed paths → build + recreate only affected services.
#
# Run on the VPS from repo root (e.g. /opt/tools-dashboard):
#   ./bin/refresh-prd.sh
#
# By default the VPS checkout is reset to match origin (local edits on the server are discarded).
# Use --keep-local only if you intentionally patched files on the host.
#   ./bin/refresh-prd.sh front-admin back-api
#   ./bin/refresh-prd.sh --all
#   ./bin/refresh-prd.sh --dry-run
#   ./bin/refresh-prd.sh --no-pull --since HEAD~3
#
# Requires: .env.prd, docker compose plugin, git, running prd stack (bin/start.sh prd up-build once).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TD_PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TD_ENV=prd
DEPLOY_MARKER="${TD_PROJECT_ROOT}/tmp/prd-last-deploy.sha"

# Application images (docker-compose.prd.yml services with build:).
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

DO_PULL=1
DRY_RUN=0
NO_CACHE=0
FORCE_ALL=0
ALLOW_DIRTY=0
KEEP_LOCAL=0
SINCE_REF=""
EXPLICIT_SERVICES=()
NGINX_RELOAD=0
ENV_ONLY=0
GIT_SYNC_OLD_HEAD=""

usage() {
  sed -n '2,28p' "$0"
  cat <<'EOF'

Options:
  --all           Rebuild and recreate all application services
  --no-pull       Skip git sync (compare since last deploy marker or --since)
  --no-cache      docker compose build --no-cache
  --dry-run       Print the plan without building or recreating
  --since <ref>   Git ref to diff against (default: pre-sync HEAD, ORIG_HEAD, or deploy marker)
  --keep-local    Block when tracked files differ; use git pull --ff-only (no hard reset)
  --allow-dirty   With --keep-local: allow untracked non-tmp files
  -h, --help      Show this help

Examples:
  ./bin/refresh-prd.sh
  ./bin/refresh-prd.sh front-admin
  ./bin/refresh-prd.sh --no-cache front-admin back-api
  ./bin/refresh-prd.sh --since ffc0ba5 --dry-run
EOF
}

die() { echo "ERROR: $*" >&2; exit 1; }

log() { echo "==> $*"; }

# ----- compose helpers (same contract as bin/start.sh) -----
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

# ----- service detection -----
declare -A SERVICE_HIT=()

add_service() {
  local svc="$1"
  SERVICE_HIT["$svc"]=1
}

map_path_to_tags() {
  local path="$1"
  case "$path" in
    front-admin/*|front-admin) add_service front-admin ;;
    front-public/*|front-public) add_service front-public ;;
    back-api/*|back-api) add_service back-api ;;
    shared/*|shared) add_service back-api ;;
    back-auth/*|back-auth) add_service back-auth ;;
    back-websockets/*|back-websockets) add_service back-websockets ;;
    back-workers/*|back-workers) add_service back-workers ;;
    back-postgres/*|back-postgres) add_service back-postgres-service ;;
    back-cassandra/*|back-cassandra) add_service back-cassandra ;;
    feature-registry/*|feature-registry) add_service feature-registry ;;
    back-redis/*|back-redis) add_service redis ;;
    seaweedfs-config/*|seaweedfs-config) add_service seaweedfs ;;
    docker-compose.prd.yml|.env.prd.example)
      for s in "${ALL_APP_SERVICES[@]}"; do add_service "$s"; done
      ;;
    .env.prd)
      ENV_ONLY=1
      for s in "${ALL_APP_SERVICES[@]}"; do add_service "$s"; done
      ;;
    infra/nginx/*|infra/nginx)
      NGINX_RELOAD=1
      ;;
    bin/refresh-prd.sh|bin/start.sh|scripts/vps-deploy-datawork.sh)
      ;;
    *)
      ;;
  esac
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

collect_services_from_paths() {
  local path
  while IFS= read -r path; do
    [ -n "$path" ] && map_path_to_tags "$path"
  done
  expand_dependencies
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

# ----- git -----
# Paths that may exist on the VPS untracked without blocking deploy.
DIRTY_IGNORE_UNTRACKED_PREFIXES=(
  "tmp/"
  "build.log"
  "*.bak"
)

git_tracked_dirty() {
  ! git diff --quiet HEAD 2>/dev/null || ! git diff --cached --quiet 2>/dev/null
}

git_untracked_blocking() {
  local line path
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    path="${line#?? }"
    local prefix
    for prefix in "${DIRTY_IGNORE_UNTRACKED_PREFIXES[@]}"; do
      if [[ "$path" == "$prefix" || "$path" == "$prefix"* || "$path" == *".bak" ]]; then
        continue 2
      fi
    done
    echo "$path"
  done < <(git status --porcelain --untracked-files=all | grep '^??' || true)
}

git_show_worktree_state() {
  echo "Tracked changes (block deploy):"
  git status --short --untracked-files=no || true
  echo ""
  echo "Untracked files:"
  git status --short --untracked-files=all | grep '^??' || echo "  (none)"
}

assert_clean_enough_for_pull() {
  local -a untracked_blocking=()
  local u
  while IFS= read -r u; do
    [ -n "$u" ] && untracked_blocking+=("$u")
  done < <(git_untracked_blocking)

  if git_tracked_dirty; then
    echo "ERROR: tracked files differ from HEAD — stash or commit before deploy." >&2
    git_show_worktree_state >&2
    echo "" >&2
    echo "Fix: git stash -u   or   git checkout -- <file>   or   ./bin/refresh-prd.sh --no-pull" >&2
    exit 1
  fi

  if [ "${#untracked_blocking[@]}" -gt 0 ] && [ "$ALLOW_DIRTY" -eq 0 ]; then
    echo "ERROR: unexpected untracked files (not in tmp/). Pass --allow-dirty to override." >&2
    printf '  %s\n' "${untracked_blocking[@]}" >&2
    exit 1
  fi

  if [ "${#untracked_blocking[@]}" -gt 0 ]; then
    log "note: ignoring untracked files (--allow-dirty): ${untracked_blocking[*]}"
  fi
}

git_resolve_upstream() {
  local upstream
  upstream="$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || true)"
  if [ -n "$upstream" ]; then
    echo "$upstream"
    return
  fi
  echo "origin/$(git rev-parse --abbrev-ref HEAD)"
}

git_sync_to_remote() {
  [ "$DO_PULL" -eq 1 ] || return 0
  command -v git >/dev/null 2>&1 || die "git not found"
  [ -d "$TD_PROJECT_ROOT/.git" ] || die "not a git repository: $TD_PROJECT_ROOT"
  cd "$TD_PROJECT_ROOT"

  if [ "$KEEP_LOCAL" -eq 1 ]; then
    assert_clean_enough_for_pull
    log "git pull --ff-only (--keep-local)"
    if [ "$DRY_RUN" -eq 1 ]; then
      echo "  (dry-run: would run git pull --ff-only)"
      return 0
    fi
    GIT_SYNC_OLD_HEAD="$(git rev-parse HEAD)"
    git pull --ff-only
    return 0
  fi

  GIT_SYNC_OLD_HEAD="$(git rev-parse HEAD)"
  local upstream
  upstream="$(git_resolve_upstream)"

  if git_tracked_dirty || [ -n "$(git_untracked_blocking)" ]; then
    log "local changes detected — resetting checkout to ${upstream}"
    git_show_worktree_state
  else
    log "syncing checkout to ${upstream}"
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "  (dry-run: would run git fetch origin && git reset --hard ${upstream} && git clean -fd)"
    return 0
  fi

  git fetch origin
  git reset --hard "$upstream"
  git clean -fd
}

git_pull_if_needed() {
  git_sync_to_remote
}

resolve_diff_base() {
  if [ -n "$SINCE_REF" ]; then
    echo "$SINCE_REF"
    return
  fi
  if [ -n "$GIT_SYNC_OLD_HEAD" ] && [ "$GIT_SYNC_OLD_HEAD" != "$(git rev-parse HEAD 2>/dev/null)" ]; then
    echo "$GIT_SYNC_OLD_HEAD"
    return
  fi
  if [ "$DO_PULL" -eq 1 ] && git rev-parse ORIG_HEAD >/dev/null 2>&1; then
    if [ "$(git rev-parse ORIG_HEAD)" != "$(git rev-parse HEAD)" ]; then
      echo "ORIG_HEAD"
      return
    fi
  fi
  if [ -f "$DEPLOY_MARKER" ]; then
    cat "$DEPLOY_MARKER"
    return
  fi
  echo "HEAD~1"
}

collect_changed_paths() {
  local base paths=()
  if [ "$FORCE_ALL" -eq 1 ] || [ "${#EXPLICIT_SERVICES[@]}" -gt 0 ]; then
    return 0
  fi
  cd "$TD_PROJECT_ROOT"
  base="$(resolve_diff_base)"
  log "detecting changes since ${base}"
  while IFS= read -r line; do
    [ -n "$line" ] && paths+=("$line")
  done < <(git diff --name-only "$base" HEAD 2>/dev/null || true)
  if [ "$ALLOW_DIRTY" -eq 1 ]; then
    while IFS= read -r line; do
      [ -n "$line" ] && paths+=("$line")
    done < <(git diff --name-only HEAD 2>/dev/null || true)
    while IFS= read -r line; do
      [ -n "$line" ] && paths+=("$line")
    done < <(git diff --name-only --cached HEAD 2>/dev/null || true)
  fi
  local p
  for p in "${paths[@]}"; do
    collect_services_from_paths <<<"$p"
  done
}

build_service_plan() {
  SERVICE_HIT=()
  ENV_ONLY=0
  NGINX_RELOAD=0

  if [ "$FORCE_ALL" -eq 1 ]; then
    local s
    for s in "${ALL_APP_SERVICES[@]}"; do add_service "$s"; done
  elif [ "${#EXPLICIT_SERVICES[@]}" -gt 0 ]; then
    local s
    for s in "${EXPLICIT_SERVICES[@]}"; do
      is_known_service "$s" || die "unknown service: $s"
      add_service "$s"
    done
    expand_dependencies
  else
    collect_changed_paths
  fi

  services_to_array
  if [ "${#SELECTED_SERVICES[@]}" -eq 0 ] && [ "$NGINX_RELOAD" -eq 0 ] && [ "$ENV_ONLY" -eq 0 ]; then
    log "no deployable service changes detected"
    echo "Tip: ./bin/refresh-prd.sh --all   or   ./bin/refresh-prd.sh front-admin"
    exit 0
  fi
}

print_plan() {
  echo ""
  echo "Deploy plan (TD_ENV=${TD_ENV}, project=${TD_PROJ}):"
  echo "  commit: $(git -C "$TD_PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
  echo "  services: ${SELECTED_SERVICES[*]}"
  if [ "$ENV_ONLY" -eq 1 ]; then
    echo "  note: .env.prd changed — recreate without image rebuild"
  fi
  if [ "$NGINX_RELOAD" -eq 1 ]; then
    echo "  note: host nginx config changed — reload after stack refresh"
  fi
  echo ""
}

wait_for_services() {
  local -a svcs=("$@")
  local attempt=0 max=120
  log "waiting for services to become healthy (up to ${max}s): ${svcs[*]}"
  while [ "$attempt" -lt "$max" ]; do
    local pending=0
    local s cid health state
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
        unhealthy)
          die "service $s is unhealthy — check: td_docker_compose logs $s"
          ;;
        *)
          pending=1
          ;;
      esac
    done
    if [ "$pending" -eq 0 ]; then
      echo "All selected services are running."
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done
  echo "WARN: timed out waiting for health; current status:" >&2
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
    [ "$code" = "200" ] || [ "$code" = "302" ] || echo "WARN: unexpected admin HTTP status" >&2
  fi
  if printf '%s\n' "${SELECTED_SERVICES[@]}" | grep -qx front-public; then
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "${base}/app/" || true)"
    echo "  GET ${base}/app/ → HTTP ${code}"
    [ "$code" = "200" ] || [ "$code" = "302" ] || echo "WARN: unexpected public HTTP status" >&2
  fi
}

record_deploy_marker() {
  mkdir -p "$(dirname "$DEPLOY_MARKER")"
  git -C "$TD_PROJECT_ROOT" rev-parse HEAD >"$DEPLOY_MARKER"
}

run_refresh() {
  local -a build_targets=() recreate_targets=() s
  for s in "${SELECTED_SERVICES[@]}"; do
    recreate_targets+=("$s")
    case "$s" in
      redis|postgresql|cassandra|seaweedfs)
        ;;
      *)
        if [ "$ENV_ONLY" -eq 0 ]; then
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
    if [ "${#recreate_targets[@]}" -gt 0 ]; then
      echo "Would recreate: ${recreate_targets[*]}"
    fi
    if [ "$NGINX_RELOAD" -eq 1 ]; then
      echo "Would reload host nginx: sudo bash infra/nginx/host-setup/05-install-prd-datawork-host-nginx.sh"
    fi
    return 0
  fi

  log "preflight"
  bash "$SCRIPT_DIR/start.sh" prd preflight

  if [ "${#build_targets[@]}" -gt 0 ]; then
    log "building: ${build_targets[*]}"
    td_compose_build "${build_targets[@]}"
  else
    log "skipping image build (env/infra-only refresh)"
  fi

  if [ "${#recreate_targets[@]}" -gt 0 ]; then
    log "recreating containers: ${recreate_targets[*]}"
    td_docker_compose up -d --no-deps --force-recreate "${recreate_targets[@]}"
    wait_for_services "${recreate_targets[@]}" || true
  else
    log "no containers to recreate (nginx/env-only refresh)"
  fi

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

  record_deploy_marker
  log "deploy marker updated: $DEPLOY_MARKER"
  td_docker_compose ps "${recreate_targets[@]}"
  log "refresh complete"
}

# ----- arg parse -----
while [ "$#" -gt 0 ]; do
  case "$1" in
    --all) FORCE_ALL=1; shift ;;
    --no-pull) DO_PULL=0; shift ;;
    --no-cache) NO_CACHE=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --allow-dirty) ALLOW_DIRTY=1; shift ;;
    --keep-local) KEEP_LOCAL=1; shift ;;
    --since)
      [ "$#" -ge 2 ] || die "--since requires a git ref"
      SINCE_REF="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --) shift; break ;;
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

git_pull_if_needed
build_service_plan
print_plan
run_refresh
