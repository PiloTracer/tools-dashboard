#!/usr/bin/env bash
# Add dev.aiepic.app to /etc/hosts (idempotent). Run on the machine where the browser runs.
# Requires: sudo

set -euo pipefail

DOMAIN="${DOMAIN:-dev.aiepic.app}"
IP="${IP:-127.0.0.1}"
MARK="# tools-dashboard dev (added by 01-add-dev-hosts.sh)"

if grep -qE "[[:space:]]${DOMAIN}([[:space:]]|$)" /etc/hosts 2>/dev/null; then
  echo "OK: ${DOMAIN} already present in /etc/hosts"
  exit 0
fi

echo "Adding: ${IP} ${DOMAIN}"
printf '%s\n' "${MARK}" "${IP}	${DOMAIN}" | sudo tee -a /etc/hosts >/dev/null
echo "Done. Verify: getent hosts ${DOMAIN}"
