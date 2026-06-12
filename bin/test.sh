#!/usr/bin/env bash
# ============================================================================
# test.sh — Test runner for Tools Dashboard
# ============================================================================
# Usage:
#   ./bin/test.sh              # Run smoke tests
#   ./bin/test.sh -v           # Verbose
#
# Just runs ``pytest tests/`` from the host against mapped localhost ports.
# Stack must be running: ``./bin/start.sh dev up``
# ============================================================================
set -euo pipefail

PYTEST_ARGS="${PYTEST_ARGS:--q --tb=short}"

echo "── Tools Dashboard test suite ──────────────────────"
echo "  Stack:  http://localhost:$(docker compose port nginx-proxy 80 2>/dev/null | cut -d: -f2 || echo '8082')"
echo "  API:    http://localhost:$(docker compose port back-api 8000 2>/dev/null | cut -d: -f2 || echo '8100')"
echo "  Auth:   http://localhost:$(docker compose port back-auth 8001 2>/dev/null | cut -d: -f2 || echo '8101')"
echo ""

TEST_API_PORT="$(docker compose port back-api 8000 2>/dev/null | cut -d: -f2 || echo '8100')"
TEST_AUTH_PORT="$(docker compose port back-auth 8001 2>/dev/null | cut -d: -f2 || echo '8101')"
TEST_NGINX_PORT="$(docker compose port nginx-proxy 80 2>/dev/null | cut -d: -f2 || echo '8082')"

export TEST_API_PORT TEST_AUTH_PORT TEST_NGINX_PORT

exec pytest tests/ $PYTEST_ARGS "$@"
