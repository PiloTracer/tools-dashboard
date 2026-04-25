#!/usr/bin/env bash
# Shared compose paths for Tools Dashboard shell scripts.
#
# Isolation: td_docker_compose() always passes -p with the same name as td_compose_project_name(),
# so every compose command targets only this checkout's stack (named volumes match TD_VOLUME_*).
# Stack identity: TD_APP_CODE (default tds) + TD_STACK_SUFFIX (e.g. _dev_tds) or COMPOSE_PROJECT_NAME; see .env* examples.
# Do not use global "docker * prune" in bin/ without a project/volume filter — it can harm other stacks.
#
# Usage: source "$(dirname "$0")/bin/compose-env.sh"  from repo root, or from bin/:
#   source "${BASH_SOURCE[0]%/*}/compose-env.sh"

_tools_dash_bin="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export TD_PROJECT_ROOT="$(cd "$_tools_dash_bin/.." && pwd)"

_raw_env="${TD_ENV:-dev}"
case "$(echo "$_raw_env" | tr '[:upper:]' '[:lower:]')" in
  dev|development)
    export TD_ENV=dev
    export TD_COMPOSE_FILE="docker-compose.dev.yml"
    ;;
  prd|prod|production)
    export TD_ENV=prd
    export TD_COMPOSE_FILE="docker-compose.prd.yml"
    ;;
  stg|staging)
    export TD_ENV=stg
    if [ -f "$TD_PROJECT_ROOT/docker-compose.stg.yml" ]; then
      export TD_COMPOSE_FILE="docker-compose.stg.yml"
    else
      echo "TD_ENV=stg requires docker-compose.stg.yml in $TD_PROJECT_ROOT" >&2
      return 1 2>/dev/null || exit 1
    fi
    ;;
  *)
    echo "Invalid TD_ENV=${TD_ENV:-} (use dev, prd, or stg)" >&2
    return 1 2>/dev/null || exit 1
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

td_docker_compose() {
  # Explicit project name keeps this stack isolated from other compose projects on the host.
  local _td_proj
  _td_proj="$(td_compose_project_name)"
  if [ -n "$TD_ENV_FILE" ]; then
    docker compose -p "$_td_proj" -f "$TD_COMPOSE_PATH" --env-file "$TD_ENV_FILE" "$@"
  else
    docker compose -p "$_td_proj" -f "$TD_COMPOSE_PATH" "$@"
  fi
}

# Read KEY=value from the same env files compose uses: env for this TD_ENV, then .env, then .env.$TD_ENV.
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

# Effective stack suffix: TD_STACK_SUFFIX in .env, or _<TD_ENV>_<TD_APP_CODE> (e.g. _dev_tds, _prd_tds).
# TD_APP_CODE defaults to tds (tools-dashboard stack).
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

# Docker Compose project name → prefixed volume / container name prefix.
# Priority: COMPOSE_PROJECT_NAME, else TD_STACK_BASE (default tools_dashboard) + effective suffix.
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

export TD_APP_CODE
TD_APP_CODE="$(td_read_env_key TD_APP_CODE 2>/dev/null || true)"
[ -n "$TD_APP_CODE" ] || TD_APP_CODE=tds

# Resolved suffix (from TD_STACK_SUFFIX or _<env>_<TD_APP_CODE>); matches the tail of COMPOSE_PROJECT_NAME when using defaults.
export TD_STACK_SUFFIX
TD_STACK_SUFFIX="$(td_stack_suffix_effective)"

TD_PROJ="$(td_compose_project_name)"
export TD_PROJ
export TD_VOLUME_POSTGRES="${TD_PROJ}_postgres_data"
export TD_VOLUME_REDIS="${TD_PROJ}_redis_data"
export TD_VOLUME_CASSANDRA="${TD_PROJ}_cassandra_data"
export TD_VOLUME_SEAWEED="${TD_PROJ}_seaweed-data"

# Unused volumes that still carry com.docker.compose.project=<this project> (never whole-host prune).
td_prune_unused_volumes_for_project() {
  local proj
  proj="$(td_compose_project_name)"
  echo "Pruning unused volumes for compose project ${proj} only (other stacks unchanged)..."
  docker volume prune -f --filter "label=com.docker.compose.project=${proj}" >/dev/null 2>&1 || true
}
