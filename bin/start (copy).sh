#!/usr/bin/env bash
# Docker Compose manager for Tools Dashboard (dev / prd / stg).
#
# Interactive menu:
#   ./bin/start.sh
#   ./bin/start.sh dev
#
# CLI (no menu):
#   ./bin/start.sh dev up
#   ./bin/start.sh dev down
#   ./bin/start.sh prd up-build
#
# Commands: up | up-build | down | logs | status | restart | rebuild | reset | menu

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
  echo "  up-build   docker compose up -d --build, wait for auth, print URLs"
  echo "  down       Stop stack (down --remove-orphans)"
  echo "  logs       Follow service logs (tail 100)"
  echo "  status     Show project root, compose file, volume names"
  echo "  restart    Rolling restart (compose restart)"
  echo "  rebuild    Down, build (tee build.log), up — keeps named volumes"
  echo "  reset      Down -v (deletes data), build, up — destructive"
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
    menu | up | up-build | down | logs | status | restart | rebuild | reset) ;;
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

# shellcheck source=compose-env.sh
source "$SCRIPT_DIR/compose-env.sh"

if [ ! -f "$TD_COMPOSE_PATH" ]; then
  echo "Compose file missing: $TD_COMPOSE_PATH"
  exit 1
fi

pause() {
  read -r -n1 -s -p "Press any key..." _
  echo
}

prune_anonymous_volumes() {
  echo "Pruning dangling anonymous volumes..."
  docker volume prune -f >/dev/null || true
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

print_stack_urls() {
  local H="$TD_URL_HOST"
  echo ""
  echo "✅ Stack is up (TD_ENV=$TD_ENV) — open in your browser (replace $H with your host if remote)"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  BROWSER URLS (local)"
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
    echo "  MailHog UI:     http://${H}:8026/"
    echo "  SeaweedFS S3:   http://${H}:8333/       (S3 API)"
    echo "  Seaweed master: http://${H}:9333/"
    echo "  Seaweed filer:  http://${H}:8888/"
    echo ""
    echo "— Databases (clients / CLI, not a normal web page) —"
    echo "  PostgreSQL:     ${H}:55432  user=user  db=main_db"
    echo "  Redis:          ${H}:6380"
    echo "  Cassandra CQL:  ${H}:39142"
    echo ""
    echo "— Stack commands —"
    echo "  $0 dev logs   |  $0 dev down   |  $0 dev rebuild   |  $0 dev reset"
    echo ""
    echo "— CLI into DB containers —"
    echo "  docker compose -f $TD_COMPOSE_FILE exec -it postgresql psql -U user -d main_db"
    echo "  docker compose -f $TD_COMPOSE_FILE exec -it redis redis-cli"
    echo "  docker compose -f $TD_COMPOSE_FILE exec -it cassandra cqlsh"
  else
    local NPORT
    NPORT="$(td_read_nginx_http_port)"
    echo ""
    echo "— Primary entry: nginx (only published edge in prd compose) —"
    echo "  http://${H}:${NPORT}/"
    echo ""
    echo "— Same paths as dev, on port ${NPORT} —"
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
    td_docker_compose ps
  fi
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

cmd_up_quick() {
  echo "Starting stack (no image rebuild)..."
  td_docker_compose up -d
  prune_anonymous_volumes
  if ! wait_for_stack_ready; then
    echo "Stack did not become healthy in time." >&2
    return 1
  fi
  print_stack_urls
}

cmd_up_build() {
  echo "Starting stack (with image rebuild)..."
  td_docker_compose up -d --build
  prune_anonymous_volumes
  if ! wait_for_stack_ready; then
    echo "Stack did not become healthy in time." >&2
    return 1
  fi
  print_stack_urls
}

cmd_down() {
  echo "Stopping stack..."
  td_docker_compose down --remove-orphans
  prune_anonymous_volumes
  echo "Stopped."
}

cmd_logs() {
  td_docker_compose logs -f --tail=100
}

cmd_status() {
  echo "Project root:     $TD_PROJECT_ROOT"
  echo "TD_ENV:           $TD_ENV"
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
  td_docker_compose build 2>&1 | tee "${TD_PROJECT_ROOT}/build.log"
  td_docker_compose up -d
  prune_anonymous_volumes
  if ! wait_for_stack_ready; then
    echo "Stack did not become healthy in time." >&2
    return 1
  fi
  print_stack_urls
}

cmd_reset_stack() {
  echo "This will: down -v (DELETE ALL COMPOSE VOLUMES / DATA) → build → up."
  read -r -p "Type 'yes' to confirm destructive reset: " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    return 0
  fi
  td_docker_compose down -v --remove-orphans
  td_docker_compose build 2>&1 | tee "${TD_PROJECT_ROOT}/build.log"
  td_docker_compose up -d
  prune_anonymous_volumes
  if ! wait_for_stack_ready; then
    echo "Stack did not become healthy in time." >&2
    return 1
  fi
  print_stack_urls
}

run_cleanup() {
  echo "Down + container/network prune (volumes preserved)..."
  td_docker_compose down --remove-orphans
  docker container prune -f >/dev/null || true
  docker network prune -f >/dev/null || true
  docker image prune -f >/dev/null || true
}

run_full_cleanup() {
  echo "Down and remove images built by this compose file (volumes preserved)..."
  td_docker_compose down --rmi local --remove-orphans
  prune_anonymous_volumes
}

run_force_rebuild() {
  echo "Force rebuild (no cache)..."
  td_docker_compose down --remove-orphans
  if ! td_docker_compose build --no-cache; then
    echo "Build failed."
    return 1
  fi
  td_docker_compose up -d
  prune_anonymous_volumes
  if ! wait_for_stack_ready; then
    echo "Stack did not become healthy in time." >&2
    return 1
  fi
  print_stack_urls
}

run_backup() {
  read -r -p "Backup root directory [/mnt/data/backups_tools_dashboard]: " root
  root=${root:-/mnt/data/backups_tools_dashboard}
  TD_ENV="$TD_ENV" "$SCRIPT_DIR/td-backup.sh" "$root"
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
  echo " 2) Up (build & start)"
  echo " 3) Down"
  echo " 4) Cleanup (prune containers/networks)"
  echo " 5) Force rebuild (no cache)"
  echo " 6) Restart (rolling — compose restart)"
  echo " 7) Rebuild stack (down → build → up, keeps data)"
  echo " 8) Reset data (down -v → build → up) ⚠️  destructive"
  echo " 9) Backup (pg_dump + volume archives)"
  echo "10) Logs (follow)"
  echo "11) Full cleanup (down --rmi local)"
  echo "12) Status / volume check"
  echo " 0) Exit"
  echo "========================================="
  echo "CLI: $0 $TD_ENV up | up-build | down | logs | restart | rebuild | reset"
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
    0) exit 0 ;;
    *) ;;
  esac
done
