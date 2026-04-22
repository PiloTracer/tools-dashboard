#!/usr/bin/env bash
# Shared compose paths for Tools Dashboard shell scripts.
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
  if [ -n "$TD_ENV_FILE" ]; then
    docker compose -f "$TD_COMPOSE_PATH" --env-file "$TD_ENV_FILE" "$@"
  else
    docker compose -f "$TD_COMPOSE_PATH" "$@"
  fi
}

# Docker Compose project name → prefixed volume names (e.g. tools-dashboard_postgres_data)
td_compose_project_name() {
  local v=""
  if [ -n "$TD_ENV_FILE" ] && [ -f "$TD_ENV_FILE" ]; then
    v=$(grep -E '^COMPOSE_PROJECT_NAME=' "$TD_ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' | tr -d '"' | tr -d "'" | xargs)
  fi
  if [ -z "$v" ] && [ -f "$TD_PROJECT_ROOT/.env" ]; then
    v=$(grep -E '^COMPOSE_PROJECT_NAME=' "$TD_PROJECT_ROOT/.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' | tr -d '"' | tr -d "'" | xargs)
  fi
  if [ -n "$v" ]; then
    echo "$v"
    return
  fi
  basename "$TD_PROJECT_ROOT" | tr '[:upper:]' '[:lower:]'
}

TD_PROJ="$(td_compose_project_name)"
export TD_VOLUME_POSTGRES="${TD_PROJ}_postgres_data"
export TD_VOLUME_REDIS="${TD_PROJ}_redis_data"
export TD_VOLUME_CASSANDRA="${TD_PROJ}_cassandra_data"
export TD_VOLUME_SEAWEED="${TD_PROJ}_seaweed-data"
