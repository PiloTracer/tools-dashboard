#!/usr/bin/env bash
# Cron backup helper: installs a wrapper that runs ./bin/start.sh <env> backup.
# Usage: TD_ENV=prd ./bin/start_cron.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -z "${TD_ENV:-}" ]; then
  echo "TD_ENV not set. Example: TD_ENV=dev $0"
  read -r -p "Enter TD_ENV [dev/prd/stg] (default dev): " e
  export TD_ENV="${e:-dev}"
fi

# shellcheck source=start.sh
source "$SCRIPT_DIR/start.sh"
td_apply_stack_env || exit 1

_default_broot="/mnt/data/backups/${TD_PROJ}"
if [ ! -d "/mnt/data" ]; then
  _default_broot="/var/tmp/backups/${TD_PROJ}"
fi
BACKUP_ROOT="${TD_CRON_BACKUP_ROOT:-$_default_broot}"
unset _default_broot

CRON_TAG="tools-dashboard-backup-${TD_PROJ}"
CRON_SCRIPT="$SCRIPT_DIR/td-backup-cron-wrap-${TD_PROJ}.sh"
LOG_DIR="$BACKUP_ROOT/$TD_ENV"
mkdir -p "$LOG_DIR"

cat > "$CRON_SCRIPT" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export TD_ENV=$TD_ENV
cd "$PROJECT_ROOT"
exec >>"$LOG_DIR/cron.log" 2>&1
echo "\$(date -Is) cron backup start TD_ENV=$TD_ENV project=$TD_PROJ"
"$SCRIPT_DIR/start.sh" "$TD_ENV" backup "$BACKUP_ROOT"
echo "\$(date -Is) cron backup end"
EOF
chmod +x "$CRON_SCRIPT"

echo "========================================="
echo " Tools Dashboard — Cron backup helper"
echo "========================================="
echo " TD_ENV:        $TD_ENV"
echo " Compose:       $TD_COMPOSE_FILE"
echo " Backup root:   $BACKUP_ROOT"
echo " Wrapper:       $CRON_SCRIPT"
echo " Log:           $LOG_DIR/cron.log"
echo " Cron tag:      $CRON_TAG"
echo "========================================="
echo "1) Install daily cron (02:30) — replaces prior line with same tag"
echo "2) Run backup now"
echo "3) Remove cron line with this tag"
echo "4) Tail log"
echo "0) Exit"
read -r -p "Select: " opt

case "$opt" in
  1)
    line="30 2 * * * $CRON_SCRIPT # $CRON_TAG"
    (crontab -l 2>/dev/null | grep -v "$CRON_TAG" || true; echo "$line") | crontab -
    echo "Installed: $line"
    ;;
  2)
    "$CRON_SCRIPT"
    echo "Done."
    ;;
  3)
    crontab -l 2>/dev/null | grep -v "$CRON_TAG" | crontab - || true
    echo "Removed lines tagged $CRON_TAG"
    ;;
  4)
    tail -n 50 "$LOG_DIR/cron.log" 2>/dev/null || echo "(no log yet)"
    ;;
  0) exit 0 ;;
  *) echo "Invalid" ;;
esac
