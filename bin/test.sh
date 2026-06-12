#!/usr/bin/env bash
# ============================================================================
# test.sh — Test runner for Tools Dashboard
# ============================================================================
# Usage:
#   ./bin/test.sh                  # Run ALL tests
#   ./bin/test.sh back-api         # Run tests for a specific service
#   ./bin/test.sh smoke            # Run root-level smoke tests
#   ./bin/test.sh list             # Show available test targets
#
# Each service's tests run inside its Docker container via
# ``docker compose exec``, matching the production runtime.
# ============================================================================
set -euo pipefail

# --- colours ---
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

COMPOSE_CMD="docker compose -f docker-compose.dev.yml"
[ -f docker-compose.yml ] && COMPOSE_CMD="docker compose"
[ -f docker-compose.prd.yml ] && [ "${STACK:-dev}" = "prd" ] && COMPOSE_CMD="docker compose -f docker-compose.prd.yml --env-file .env.prd"

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
info()  { echo -e "${CYAN}[test]${NC} $1"; }
pass()  { echo -e "  ${GREEN}✓${NC} $1"; }
fail()  { echo -e "  ${RED}✗${NC} $1"; }

PYTEST_ARGS="${PYTEST_ARGS:--q --tb=short}"

# ------------------------------------------------------------------
# Test suites
# ------------------------------------------------------------------
run_smoke() {
  info "Running smoke tests (health checks)…"
  pip install -q pytest pytest-asyncio httpx 2>/dev/null || true
  PYTHONPATH=. pytest tests/ $PYTEST_ARGS "$@"
}

run_service() {
  local service="$1"
  shift
  info "Running ${service} tests…"

  # Check container is running
  if ! $COMPOSE_CMD ps --status running --format '{{.Name}}' 2>/dev/null | grep -q "$service"; then
    fail "${service} container is not running. Start the stack first: ./bin/start.sh dev up"
    return 1
  fi

  $COMPOSE_CMD exec "$service" bash -c "cd /app && pytest tests/ $PYTEST_ARGS $*" || true
}

# ------------------------------------------------------------------
# Main
# ------------------------------------------------------------------
TARGET="${1:-all}"

case "$TARGET" in
  all)
    info "Running full test suite…"
    echo ""
    run_smoke || true
    echo ""
    for svc in back-api back-auth back-websockets feature-registry; do
      run_service "$svc" || true
      echo ""
    done
    info "All tests completed."
    ;;

  smoke)
    shift
    run_smoke "$@"
    ;;

  list)
    echo "Available test targets:"
    echo "  all           — smoke + every service (default)"
    echo "  smoke         — root-level health endpoint checks"
    echo "  back-api      — back-api unit/integration tests"
    echo "  back-auth     — back-auth unit/integration tests"
    echo "  back-websockets — websockets health test"
    echo "  feature-registry — feature-registry health test"
    ;;

  *)
    run_service "$TARGET"
    ;;
esac
