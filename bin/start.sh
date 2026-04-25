#!/usr/bin/env bash
# Docker Compose manager for Tools Dashboard (dev / prd / stg).
# Stack identity from .env (lines ~10–12): TD_APP_CODE, TD_STACK_SUFFIX, COMPOSE_PROJECT_NAME.
# start_cron.sh sources this file (library only). No other bin helpers required.
#
# Interactive:  ./bin/start.sh    ./bin/start.sh dev
# CLI:  ./bin/start.sh dev up | down | backup [dir] | free-ports | ...

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export TD_PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ----- stack env: reads same .env files as compose; docker compose always uses -p "$TD_PROJ" -----
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

td_docker_compose() {
  local _td_proj
  _td_proj="$(td_compose_project_name)"
  if [ -n "$TD_ENV_FILE" ]; then
    docker compose -p "$_td_proj" -f "$TD_COMPOSE_PATH" --env-file "$TD_ENV_FILE" "$@"
  else
    docker compose -p "$_td_proj" -f "$TD_COMPOSE_PATH" "$@"
  fi
}

td_prune_unused_volumes_for_project() {
  local proj
  proj="$(td_compose_project_name)"
  echo "Pruning unused volumes for compose project ${proj} only (other stacks unchanged)..."
  docker volume prune -f --filter "label=com.docker.compose.project=${proj}" >/dev/null 2>&1 || true
}

td_apply_stack_env() {
  case "$TD_ENV" in
    dev) export TD_COMPOSE_FILE="docker-compose.dev.yml" ;;
    prd) export TD_COMPOSE_FILE="docker-compose.prd.yml" ;;
    stg)
      if [ -f "$TD_PROJECT_ROOT/docker-compose.stg.yml" ]; then
        export TD_COMPOSE_FILE="docker-compose.stg.yml"
      else
        echo "TD_ENV=stg requires docker-compose.stg.yml in $TD_PROJECT_ROOT" >&2
        return 1
      fi
      ;;
    *)
      echo "Invalid TD_ENV=${TD_ENV:-} (use dev, prd, or stg)" >&2
      return 1
      ;;
  esac
  export TD_COMPOSE_PATH="$TD_PROJECT_ROOT/$TD_COMPOSE_FILE"
  if [ -f "$TD_PROJECT_ROOT/.env.$TD_ENV" ]; then
    export TD_ENV_FILE="$TD_PROJECT_ROOT/.env.$TD_ENV"
  elif [ -f "$TD_PROJECT_ROOT/.env" ]; then
    export TD_ENV_FILE="$TD_PROJECT_ROOT/.env"
  else
    export TD_ENV_FILE=""
  fi
  export TD_APP_CODE
  TD_APP_CODE="$(td_read_env_key TD_APP_CODE 2>/dev/null || true)"
  [ -n "$TD_APP_CODE" ] || TD_APP_CODE=tds
  export TD_STACK_SUFFIX
  TD_STACK_SUFFIX="$(td_stack_suffix_effective)"
  export TD_PROJ
  TD_PROJ="$(td_compose_project_name)"
  export TD_VOLUME_POSTGRES="${TD_PROJ}_postgres_data"
  export TD_VOLUME_REDIS="${TD_PROJ}_redis_data"
  export TD_VOLUME_CASSANDRA="${TD_PROJ}_cassandra_data"
  export TD_VOLUME_SEAWEED="${TD_PROJ}_seaweed-data"
}

td_backup_archive_vol() {
  local vol="$1" name="$2" OUT="$3" TS="$4"
  if docker volume inspect "$vol" >/dev/null 2>&1; then
    docker run --rm -v "${vol}:/v:ro" -v "$OUT:/out" busybox tar czf "/out/${name}_${TS}.tar.gz" -C /v .
    echo "[backup] archived volume $vol -> ${name}_${TS}.tar.gz"
  else
    echo "[backup] skip missing volume: $vol"
  fi
}

td_run_backup() {
  local BACKUP_ROOT="${1:-}" TS OUT pg_logical_ok
  if [ -z "$BACKUP_ROOT" ]; then
    if [ -d "/mnt/data" ]; then
      BACKUP_ROOT="/mnt/data/backups/${TD_PROJ}"
    else
      BACKUP_ROOT="/var/tmp/backups/${TD_PROJ}"
    fi
  fi
  TS="$(date +%Y%m%d_%H%M%S)"
  OUT="$BACKUP_ROOT/$TD_ENV/$TS"
  mkdir -p "$OUT"
  echo "[backup] TD_ENV=$TD_ENV compose=$TD_COMPOSE_FILE project=$TD_PROJ -> $OUT"
  pg_logical_ok=0
  if td_docker_compose ps -q postgresql 2>/dev/null | grep -q .; then
    if td_docker_compose exec -T postgresql pg_dump -U user -d main_db -Fc >"$OUT/postgres.dump"; then
      pg_logical_ok=1
    else
      echo "[backup] pg_dump failed" >&2
      return 1
    fi
  else
    echo "[backup] WARNING: postgresql not running; skipping pg_dump (volume archive fallback)" >&2
  fi
  if [ "$pg_logical_ok" -ne 1 ]; then
    td_backup_archive_vol "$TD_VOLUME_POSTGRES" "postgres_data" "$OUT" "$TS"
  fi
  td_backup_archive_vol "$TD_VOLUME_REDIS" "redis" "$OUT" "$TS"
  td_backup_archive_vol "$TD_VOLUME_CASSANDRA" "cassandra" "$OUT" "$TS"
  td_backup_archive_vol "$TD_VOLUME_SEAWEED" "seaweedfs" "$OUT" "$TS"
  ln -sfn "$OUT" "$BACKUP_ROOT/$TD_ENV/latest"
  echo "[backup] done: $OUT"
}

td_container_project_label() {
  docker inspect --format '{{ index .Config.Labels "com.docker.compose.project" }}' "$1" 2>/dev/null || true
}

td_free_dev_ports() {
  local PORTS p id lbl line
  if [ "$TD_ENV" != "dev" ]; then
    echo "free-ports is only for TD_ENV=dev" >&2
    return 1
  fi
  echo "==> compose down — project=$TD_PROJ"
  td_docker_compose down --remove-orphans || true
  PORTS=(8082 8443 4100 4101 8100 8101 8102 8105 6380 54432 39142 18026 8026 18333 19333 18888 8333 9333 8888)
  echo "==> Removing only project '$TD_PROJ' containers still publishing dev ports..."
  for p in "${PORTS[@]}"; do
    while IFS= read -r id; do
      [ -n "$id" ] || continue
      lbl="$(td_container_project_label "$id")"
      if [ "$lbl" = "$TD_PROJ" ]; then
        echo "    port $p -> docker rm -f $id"
        docker rm -f "$id" || true
      elif [ -n "$lbl" ]; then
        echo "    port $p -> skip $id (project $lbl)" >&2
      else
        echo "    port $p -> skip $id (no compose label)" >&2
      fi
    done < <(docker ps -q --filter "publish=$p" 2>/dev/null || true)
  done
  while read -r line; do
    [ -n "$line" ] || continue
    id="${line%% *}"
    lbl="$(td_container_project_label "$id")"
    if [ "$lbl" = "$TD_PROJ" ] && { [[ "$line" =~ :18026- ]] || [[ "$line" =~ :8026- ]]; }; then
      echo "    (fallback) docker rm -f $id"
      docker rm -f "$id" || true
    fi
  done < <(docker ps -a --format '{{.ID}} {{.Ports}}' | grep -E ':(18026|8026)->' || true)
  echo "==> Done. If ports still busy: ss -tlnp    then: $0 dev up"
}

if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  return 0
fi

set -euo pipefail

usage() {
  cat <<EOF
Tools Dashboard — Docker Compose helper

Usage: $0 [dev|prd|stg] [command]
EOF
  echo ""
  echo "  With one argument (environment only), opens the interactive menu."
  echo "  With two arguments, runs the command and exits."
  echo ""
  echo "Commands:"
  echo "  up         docker compose up -d (no image rebuild), wait for auth, print URLs"
  echo "  up-build   plain build log → up -d (same as --build, errors stay visible)"
  echo "  down       Stop stack (down --remove-orphans)"
  echo "  logs       Follow service logs (tail 100)"
  echo "  status     Show project root, compose file, volume names"
  echo "  restart    Rolling restart (compose restart)"
  echo "  rebuild    Down, build (tee build.log), up — keeps named volumes"
  echo "  reset      Down -v (deletes data), build, up — destructive"
  echo "  build      docker compose build only (CI / catch image errors before up)"
  echo "  config     docker compose config (validates compose + env interpolation)"
  echo "  preflight  config + quick sanity checks for prd/stg"
  echo "  backup [dir]  pg_dump + volume archives (default: /mnt/data/backups/\$TD_PROJ)"
  echo "  free-ports    dev only: down + remove this project's containers on dev ports"
  echo "  menu       Interactive menu (same as env-only)"
}

normalize_td_env() {
  case "$(echo "${1:-}" | tr '[:upper:]' '[:lower:]')" in
    dev | development) echo dev ;;
    prd | prod | production) echo prd ;;
    stg | staging) echo stg ;;
    *) echo "" ;;
  esac
}

TD_CLI_CMD=""

if [ "${#}" -ge 2 ]; then
  _e="$(normalize_td_env "$1")"
  if [ -z "$_e" ]; then
    echo "Unknown environment: $1" >&2
    usage >&2
    exit 1
  fi
  export TD_ENV="$_e"
  TD_CLI_CMD="$(echo "$2" | tr '[:upper:]' '[:lower:]')"
  case "$TD_CLI_CMD" in
    menu | up | up-build | down | logs | status | restart | rebuild | reset | build | config | preflight | backup | free-ports) ;;
    -h | --help | help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown command: $2" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift 2
elif [ "${#}" -eq 1 ]; then
  _e="$(normalize_td_env "$1")"
  if [ -z "$_e" ]; then
    echo "Unknown environment: $1" >&2
    usage >&2
    exit 1
  fi
  export TD_ENV="$_e"
elif [ -z "${TD_ENV:-}" ]; then
  echo "Select environment:"
  echo "  1) dev   (docker-compose.dev.yml)"
  echo "  2) prd   (docker-compose.prd.yml)"
  echo "  3) stg   (requires docker-compose.stg.yml)"
  read -r -p "Choice [1-3, default 1]: " c
  case "${c:-1}" in
    2) export TD_ENV=prd ;;
    3) export TD_ENV=stg ;;
    *) export TD_ENV=dev ;;
  esac
fi

td_apply_stack_env || exit 1

if [ ! -f "$TD_COMPOSE_PATH" ]; then
  echo "Compose file missing: $TD_COMPOSE_PATH"
  exit 1
fi

# prd/stg need a real .env file: compose uses ${VAR:?} and services expect secrets.
require_deploy_env_file() {
  case "$TD_ENV" in
    prd | stg) ;;
    *) return 0 ;;
  esac
  local f="$TD_PROJECT_ROOT/.env.$TD_ENV"
  if [ ! -f "$f" ]; then
    echo "Missing required env file: $f" >&2
    echo "Production/staging stacks will not start without it." >&2
    if [ -f "$TD_PROJECT_ROOT/.env.${TD_ENV}.example" ]; then
      echo "  cp .env.${TD_ENV}.example $f" >&2
      echo "  # Edit $f: set JWT_SECRET_KEY, POSTGRES_PASSWORD, database URLs, OAuth, mail, etc." >&2
    fi
    exit 1
  fi
}

require_deploy_env_file

pause() {
  read -r -n1 -s -p "Press any key..." _
  echo
}


wait_for_stack_ready() {
  local max_attempts=120
  local attempt=0
  echo "Waiting for back-auth to become healthy (up to ${max_attempts}s)..."
  while [ "$attempt" -lt "$max_attempts" ]; do
    if td_docker_compose exec -T back-auth python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/health', timeout=3)" >/dev/null 2>&1; then
      echo "Auth service is healthy."
      return 0
    fi
    if [ $((attempt % 10)) -eq 0 ] && [ "$attempt" -gt 0 ]; then
      echo "  ... ${attempt}s"
    fi
    sleep 1
    attempt=$((attempt + 1))
  done
  echo "Timeout waiting for back-auth health." >&2
  td_docker_compose ps || true
  return 1
}

# Full, non-collapsed build logs (BuildKit + compose). Use for every image build path.
# Override: BUILDKIT_PROGRESS=auto ./bin/start.sh dev build
td_compose_build_plain() {
  export BUILDKIT_PROGRESS="${BUILDKIT_PROGRESS:-plain}"
  export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"
  local saw_progress=false
  for a in "$@"; do
    case "$a" in
      --progress | --progress=*) saw_progress=true ;;
    esac
  done
  if [ "$saw_progress" = true ]; then
    td_docker_compose build "$@"
  else
    td_docker_compose build --progress=plain "$@"
  fi
}

# Host for printed URLs (override if you access Docker from another machine)
TD_URL_HOST="${TD_URL_HOST:-localhost}"

td_read_nginx_http_port() {
  if [ -n "${NGINX_HTTP_PORT:-}" ]; then
    echo "$NGINX_HTTP_PORT"
    return
  fi
  local f line val
  for f in "${TD_ENV_FILE:-}" "$TD_PROJECT_ROOT/.env.prd" "$TD_PROJECT_ROOT/.env.$TD_ENV" "$TD_PROJECT_ROOT/.env"; do
    [ -n "$f" ] && [ -f "$f" ] || continue
    line=$(grep -E '^NGINX_HTTP_PORT=' "$f" 2>/dev/null | tail -1) || true
    if [ -n "$line" ]; then
      val=${line#NGINX_HTTP_PORT=}
      val=$(echo "$val" | tr -d '\r' | tr -d '"' | tr -d "'" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      [ -n "$val" ] && echo "$val" && return
    fi
  done
  echo "8082"
}

# Official dev public app URL (browser); override via PUBLIC_APP_BASE_URL / TD_PUBLIC_BASE_URL in .env.
TD_OFFICIAL_DEV_PUBLIC_APP_URL="https://dev.aiepic.app/app"

# Optional in .env.prd: TD_PUBLIC_BASE_URL=https://tools.aiepic.app (no trailing slash)
td_read_public_base_url() {
  local f line val
  for f in "${TD_ENV_FILE:-}" "$TD_PROJECT_ROOT/.env.prd" "$TD_PROJECT_ROOT/.env.$TD_ENV"; do
    [ -n "$f" ] && [ -f "$f" ] || continue
    line=$(grep -E '^TD_PUBLIC_BASE_URL=' "$f" 2>/dev/null | tail -1) || true
    if [ -n "$line" ]; then
      val=${line#TD_PUBLIC_BASE_URL=}
      val=$(echo "$val" | tr -d '\r' | tr -d '"' | tr -d "'" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      [ -n "$val" ] && echo "$val" && return
    fi
  done
  echo ""
}

# Reads PUBLIC_APP_BASE_URL from the same env files compose uses (optional override).
td_read_public_app_base_url() {
  local f line val
  for f in "${TD_ENV_FILE:-}" "$TD_PROJECT_ROOT/.env.prd" "$TD_PROJECT_ROOT/.env.$TD_ENV" "$TD_PROJECT_ROOT/.env"; do
    [ -n "$f" ] && [ -f "$f" ] || continue
    line=$(grep -E '^PUBLIC_APP_BASE_URL=' "$f" 2>/dev/null | tail -1) || true
    if [ -n "$line" ]; then
      val=${line#PUBLIC_APP_BASE_URL=}
      val=$(echo "$val" | tr -d '\r' | tr -d '"' | tr -d "'" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      [ -n "$val" ] && echo "$val" && return
    fi
  done
  echo ""
}

print_dev_public_url_guide() {
  local configured
  configured="$(td_read_public_app_base_url)"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  DEV URL GUIDE — public Remix app (official)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "  Official URL (use this in OAuth redirects, emails, bookmarks):"
  echo "    ${TD_OFFICIAL_DEV_PUBLIC_APP_URL}"
  if [ -n "$configured" ] && [ "$configured" != "$TD_OFFICIAL_DEV_PUBLIC_APP_URL" ]; then
    echo ""
    echo "  Your .env sets PUBLIC_APP_BASE_URL (containers use this):"
    echo "    ${configured}"
  fi
  echo ""
  echo "  How it is wired:"
  echo "    • In-container nginx (this compose): location /app/ → front-public:3000 (see infra/nginx/default.conf)"
  echo "    • Docker publishes nginx HTTP as host port 8082 (http://<host>:8082/app/ …)"
  echo "    • For https://dev.aiepic.app (no :8082): point DNS or /etc/hosts at the host, then either"
  echo "      use infra/nginx/system-port80-to-docker-8082.example.conf (HTTP) or"
  echo "      host TLS: infra/nginx/host-setup/03-enable-local-https-dev-domain.sh (self-signed)"
  echo "      or 04-mkcert-https-dev-domain.sh (mkcert — use this if the browser refuses TLS entirely)."
  echo ""
  echo "  Related env (see .env.dev.example): PUBLIC_APP_BASE_URL, TD_PUBLIC_BASE_URL, GOOGLE_OAUTH_REDIRECT_URI"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

print_stack_urls() {
  local H="$TD_URL_HOST"
  echo ""
  echo "✅ Stack is up (TD_ENV=$TD_ENV) — open in your browser (replace $H with your host if remote)"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ "$TD_ENV" = "prd" ]; then
    echo "  BROWSER URLS (production)"
  else
    echo "  BROWSER URLS (local)"
  fi
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ "$TD_ENV" = "dev" ]; then
    echo ""
    echo "— Primary entry: nginx (dev HTTP is published on 8082; avoids host :80 conflicts) —"
    echo "  http://${H}:8082/"
    echo "  https://${H}:8443/              HTTPS port → nginx :443 (needs TLS in nginx to be useful)"
    echo ""
    echo "— Apps & API (via nginx on port 8082) —"
    echo "  Public app:     http://${H}:8082/app/"
    echo "  Admin app:      http://${H}:8082/admin/"
    echo "  Main API:       http://${H}:8082/api/"
    echo "  Auth API:       http://${H}:8082/auth/"
    echo "  OAuth (Remix):  http://${H}:8082/oauth/"
    echo "  Well-known:     http://${H}:8082/.well-known/"
    echo "  Public storage: http://${H}:8082/storage/"
    echo "  WebSocket:      ws://${H}:8082/ws/"
    echo ""
    echo "— Remix dev servers (direct, bypass nginx) —"
    echo "  Admin (Remix):  http://${H}:4100/admin/"
    echo "  Public (Remix): http://${H}:4101/app/"
    echo ""
    echo "— Backend HTTP (direct host ports; health / docs) —"
    echo "  Main API:       http://${H}:8100/health   http://${H}:8100/docs"
    echo "  Auth:           http://${H}:8101/health"
    echo "  WebSockets:     http://${H}:8102/        (WebSocket upgrade; often used via /ws/ on nginx)"
    echo "  Feature reg.:   http://${H}:8105/health"
    echo ""
    echo "— Dev tools (browser) —"
    echo "  MailHog UI:     http://${H}:18026/"
    echo "  SeaweedFS S3:   http://${H}:18333/       (S3 API from host)"
    echo "  Seaweed master: http://${H}:19333/"
    echo "  Seaweed filer:  http://${H}:18888/"
    echo ""
    echo "— Databases (clients / CLI, not a normal web page) —"
    echo "  PostgreSQL:     ${H}:54432  user=user  db=main_db"
    echo "  Redis:          ${H}:6380"
    echo "  Cassandra CQL:  ${H}:39142"
    echo ""
    echo "— Stack commands —"
    echo "  $0 dev logs   |  $0 dev down   |  $0 dev rebuild   |  $0 dev reset"
    echo ""
    echo "— CLI into DB containers (from repo root; project $TD_PROJ) —"
    echo "  docker compose -p $TD_PROJ -f $TD_COMPOSE_FILE exec -it postgresql psql -U user -d main_db"
    echo "  docker compose -p $TD_PROJ -f $TD_COMPOSE_FILE exec -it redis redis-cli"
    echo "  docker compose -p $TD_PROJ -f $TD_COMPOSE_FILE exec -it cassandra cqlsh"
    print_dev_public_url_guide
  else
    local NPORT PBASE WSBASE
    NPORT="$(td_read_nginx_http_port)"
    PBASE="$(td_read_public_base_url)"
    WSBASE=""
    if [ -n "$PBASE" ]; then
      case "$PBASE" in
        https://*) WSBASE="wss://${PBASE#https://}" ;;
        http://*) WSBASE="ws://${PBASE#http://}" ;;
      esac
    fi
    echo ""
    if [ -n "$PBASE" ]; then
      echo "— Canonical public URL (set TD_PUBLIC_BASE_URL in .env.prd; TLS at CDN/LB) —"
      echo "  ${PBASE}/"
      echo ""
      echo "— Same paths behind HTTPS —"
      echo "  Public app:     ${PBASE}/app/"
      echo "  Admin app:      ${PBASE}/admin/"
      echo "  Main API:       ${PBASE}/api/"
      echo "  Auth API:       ${PBASE}/auth/"
      echo "  OAuth:          ${PBASE}/oauth/"
      echo "  Well-known:     ${PBASE}/.well-known/"
      echo "  Public storage: ${PBASE}/storage/"
      if [ -n "$WSBASE" ]; then
        echo "  WebSocket:      ${WSBASE}/ws/"
      fi
      echo ""
    fi
    echo "— Docker host: nginx HTTP (published port ${NPORT}) —"
    echo "  http://${H}:${NPORT}/"
    echo ""
    echo "— Same paths on host port ${NPORT} —"
    echo "  Public app:     http://${H}:${NPORT}/app/"
    echo "  Admin app:      http://${H}:${NPORT}/admin/"
    echo "  Main API:       http://${H}:${NPORT}/api/"
    echo "  Auth API:       http://${H}:${NPORT}/auth/"
    echo "  OAuth:          http://${H}:${NPORT}/oauth/"
    echo "  Well-known:     http://${H}:${NPORT}/.well-known/"
    echo "  Public storage: http://${H}:${NPORT}/storage/"
    echo "  WebSocket:      ws://${H}:${NPORT}/ws/"
    echo ""
    echo "— Internal-only (no host port; use docker exec or add an ingress) —"
    echo "  back-api, back-auth, feature-registry, databases, SeaweedFS, workers"
    echo ""
    echo "Set NGINX_HTTP_PORT in .env.prd if not using ${NPORT}. Override print host: TD_URL_HOST=your.ip $0 $TD_ENV up"
    if [ -z "$PBASE" ]; then
      echo "Tip: set TD_PUBLIC_BASE_URL=https://tools.aiepic.app in .env.prd to print HTTPS URLs after up."
    fi
    td_docker_compose ps
  fi
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

cmd_up_quick() {
  echo "Starting stack (no image rebuild)..."
  td_docker_compose up -d
  td_prune_unused_volumes_for_project
  if ! wait_for_stack_ready; then
    echo "Stack did not become healthy in time." >&2
    return 1
  fi
  print_stack_urls
}

cmd_up_build() {
  echo "Building images (full log — BUILDKIT_PROGRESS=${BUILDKIT_PROGRESS:-plain})..."
  if ! td_compose_build_plain; then
    echo "Build failed — fix Dockerfile/build errors above; stack not started." >&2
    return 1
  fi
  echo "Starting stack (containers)..."
  td_docker_compose up -d
  td_prune_unused_volumes_for_project
  if ! wait_for_stack_ready; then
    echo "Stack did not become healthy in time." >&2
    return 1
  fi
  print_stack_urls
}

cmd_down() {
  echo "Stopping stack..."
  td_docker_compose down --remove-orphans
  td_prune_unused_volumes_for_project
  echo "Stopped."
}

cmd_logs() {
  td_docker_compose logs -f --tail=100
}

cmd_status() {
  echo "Project root:     $TD_PROJECT_ROOT"
  echo "TD_ENV:           $TD_ENV"
  echo "App code:         $TD_APP_CODE  (stack suffix: $TD_STACK_SUFFIX)"
  echo "Compose project:  $TD_PROJ (containers / named volumes use this prefix)"
  echo "Compose file:     $TD_COMPOSE_FILE"
  echo "Env file (opt):   ${TD_ENV_FILE:-<compose default .env>}"
  echo "Volume (pg):      $TD_VOLUME_POSTGRES"
  echo "Volume (redis):   $TD_VOLUME_REDIS"
  docker volume inspect "$TD_VOLUME_POSTGRES" >/dev/null 2>&1 && echo "  postgres_data: present" || echo "  postgres_data: not created yet"
  docker volume inspect "$TD_VOLUME_REDIS" >/dev/null 2>&1 && echo "  redis_data: present" || echo "  redis_data: not created yet"
}

cmd_restart_rolling() {
  echo "Rolling restart (compose restart)..."
  td_docker_compose restart
  if wait_for_stack_ready; then
    print_stack_urls
  else
    echo "Warning: auth health check did not pass after restart; check logs." >&2
  fi
}

cmd_rebuild_stack() {
  echo "This will: down → build (see build.log) → up — named volumes are kept."
  read -r -p "Type 'yes' to continue: " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    return 0
  fi
  td_docker_compose down --remove-orphans
  echo "Building images (full log + ${TD_PROJECT_ROOT}/build.log)..."
  if ! td_compose_build_plain 2>&1 | tee "${TD_PROJECT_ROOT}/build.log"; then
    echo "Build failed — see terminal and build.log" >&2
    return 1
  fi
  td_docker_compose up -d
  td_prune_unused_volumes_for_project
  if ! wait_for_stack_ready; then
    echo "Stack did not become healthy in time." >&2
    return 1
  fi
  print_stack_urls
}

cmd_compose_build() {
  echo "Building images (docker compose build --progress=plain; full errors below)..."
  if ! td_compose_build_plain "$@"; then
    echo "Build failed — fix errors above before deploying." >&2
    return 1
  fi
  echo "Build finished successfully."
  if [ "$TD_ENV" = "dev" ]; then
    print_dev_public_url_guide
  fi
}

cmd_compose_config() {
  td_docker_compose config "$@"
}

cmd_preflight() {
  echo "Preflight: compose config (validates YAML + required env vars)..."
  if ! td_docker_compose config >/dev/null; then
    echo "compose config failed — check .env.$TD_ENV and docker-compose.$TD_ENV.yml" >&2
    return 1
  fi
  echo "compose config: OK"
  if [ "$TD_ENV" = "prd" ] || [ "$TD_ENV" = "stg" ]; then
    if ! grep -qE '^JWT_SECRET_KEY=.' "$TD_ENV_FILE" 2>/dev/null; then
      echo "Warning: JWT_SECRET_KEY looks empty or missing in $TD_ENV_FILE" >&2
    elif grep -qE '^JWT_SECRET_KEY=CHANGE_ME' "$TD_ENV_FILE" 2>/dev/null; then
      echo "Warning: replace placeholder JWT_SECRET_KEY in $TD_ENV_FILE before real production traffic." >&2
    fi
    if ! grep -qE '^POSTGRES_PASSWORD=.' "$TD_ENV_FILE" 2>/dev/null; then
      echo "Warning: POSTGRES_PASSWORD looks empty or missing in $TD_ENV_FILE" >&2
    elif grep -qE '^POSTGRES_PASSWORD=CHANGE_ME' "$TD_ENV_FILE" 2>/dev/null; then
      echo "Warning: replace placeholder POSTGRES_PASSWORD in $TD_ENV_FILE (and matching DB URLs)." >&2
    fi
  fi
  echo "Preflight complete."
}

cmd_reset_stack() {
  echo "This will: down -v (DELETE ALL COMPOSE VOLUMES / DATA) → build → up."
  read -r -p "Type 'yes' to confirm destructive reset: " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    return 0
  fi
  td_docker_compose down -v --remove-orphans
  echo "Building images (full log + ${TD_PROJECT_ROOT}/build.log)..."
  if ! td_compose_build_plain 2>&1 | tee "${TD_PROJECT_ROOT}/build.log"; then
    echo "Build failed — see terminal and build.log" >&2
    return 1
  fi
  td_docker_compose up -d
  td_prune_unused_volumes_for_project
  if ! wait_for_stack_ready; then
    echo "Stack did not become healthy in time." >&2
    return 1
  fi
  print_stack_urls
}

run_cleanup() {
  echo "Stopping this stack only (no global docker prune — other stacks on the host are untouched)..."
  td_docker_compose down --remove-orphans
  td_prune_unused_volumes_for_project
}

run_full_cleanup() {
  echo "Down and remove images built by this compose file (volumes preserved)..."
  td_docker_compose down --rmi local --remove-orphans
  td_prune_unused_volumes_for_project
}

run_force_rebuild() {
  echo "Force rebuild (no cache, plain build log)..."
  td_docker_compose down --remove-orphans
  if ! td_compose_build_plain --no-cache; then
    echo "Build failed — see errors above."
    return 1
  fi
  td_docker_compose up -d
  td_prune_unused_volumes_for_project
  if ! wait_for_stack_ready; then
    echo "Stack did not become healthy in time." >&2
    return 1
  fi
  print_stack_urls
}

run_backup() {
  local _default_broot="/mnt/data/backups/${TD_PROJ}"
  read -r -p "Backup root directory [$_default_broot]: " root
  root=${root:-"$_default_broot"}
  td_run_backup "$root"
}

# ----- non-interactive CLI -----
if [ -n "${TD_CLI_CMD:-}" ] && [ "$TD_CLI_CMD" != "menu" ]; then
  case "$TD_CLI_CMD" in
    up) cmd_up_quick || exit 1 ;;
    up-build) cmd_up_build || exit 1 ;;
    down) cmd_down ;;
    logs) cmd_logs ;;
    status) cmd_status ;;
    restart) cmd_restart_rolling ;;
    rebuild) cmd_rebuild_stack || exit 1 ;;
    reset) cmd_reset_stack || exit 1 ;;
    build) cmd_compose_build "$@" || exit 1 ;;
    config) cmd_compose_config "$@" ;;
    preflight) cmd_preflight || exit 1 ;;
    backup) td_run_backup "${1:-}" ;;
    free-ports) td_free_dev_ports ;;
  esac
  exit 0
fi

# ----- interactive menu -----
while true; do
  clear 2>/dev/null || true
  echo "========================================="
  echo " Tools Dashboard — Docker ($TD_ENV)"
  echo "========================================="
  echo " 1) Up (quick — no image rebuild)"
  echo " 2) Up (plain build log, then start)"
  echo " 2b) Preflight (validate compose + env)"
  echo " 2c) Build images only (no up — catches Docker build errors)"
  echo " 3) Down"
  echo " 4) Cleanup (down this stack; project volume tidy only)"
  echo " 5) Force rebuild (no cache)"
  echo " 6) Restart (rolling — compose restart)"
  echo " 7) Rebuild stack (down → build → up, keeps data)"
  echo " 8) Reset data (down -v → build → up) ⚠️  destructive"
  echo " 9) Backup (pg_dump + volume archives)"
  echo "10) Logs (follow)"
  echo "11) Full cleanup (down --rmi local)"
  echo "12) Status / volume check"
  echo "13) Free dev host ports (this project only; TD_ENV=dev)"
  echo " 0) Exit"
  echo "========================================="
  echo "CLI: $0 $TD_ENV up | backup [dir] | free-ports | build | config | preflight | down | ..."
  echo "========================================="
  read -r -p "Select: " opt
  case "$opt" in
    1)
      cmd_up_quick || pause
      pause
      ;;
    2)
      cmd_up_build || pause
      pause
      ;;
    2b)
      cmd_preflight || pause
      pause
      ;;
    2c)
      cmd_compose_build || pause
      pause
      ;;
    3)
      cmd_down
      pause
      ;;
    4)
      run_cleanup
      pause
      ;;
    5)
      run_force_rebuild || pause
      pause
      ;;
    6)
      cmd_restart_rolling
      pause
      ;;
    7)
      cmd_rebuild_stack || true
      pause
      ;;
    8)
      cmd_reset_stack || true
      pause
      ;;
    9)
      run_backup
      pause
      ;;
    10) cmd_logs || true
      pause
      ;;
    11)
      run_full_cleanup
      pause
      ;;
    12)
      cmd_status
      pause
      ;;
    13)
      if [ "$TD_ENV" = "dev" ]; then
        td_free_dev_ports || true
      else
        echo "Option 13 is dev-only (current TD_ENV=$TD_ENV)." >&2
      fi
      pause
      ;;
    0) exit 0 ;;
    *) ;;
  esac
done
