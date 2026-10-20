#!/bin/sh
set -eu

PROJECT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
INFO="$PROJECT_DIR/src/appinfo/info.xml"
APP_ID="hc_weather"
if [ -f "$INFO" ]; then
  FOUND_ID="$(sed -n 's:.*<id>\([^<]*\)</id>.*:\1:p' "$INFO" | head -n 1)"
  [ -z "$FOUND_ID" ] || APP_ID="$FOUND_ID"
fi

PURGE_SETTINGS=0
case "${1:-}" in
  "") ;;
  --purge-settings) PURGE_SETTINGS=1 ;;
  -h|--help)
    echo "Usage: sudo sh uninstall.sh [--purge-settings]"
    echo "Without --purge-settings the application code is removed but Weather settings are kept for a later reinstall."
    echo "With --purge-settings administrator and per-user Weather settings are removed too."
    exit 0
    ;;
  *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
esac

say(){ printf '%s\n' "$*"; }
die(){ printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run with: sudo sh uninstall.sh"
chmod 755 "$0" 2>/dev/null || true
command -v docker >/dev/null 2>&1 || die "Docker was not found."

container_has_occ(){ docker exec "$1" sh -c 'test -f /var/www/html/occ' >/dev/null 2>&1; }
WEB_CONTAINER=""
CRON_CONTAINER=""
if docker ps --format '{{.Names}}' | grep -qx 'nextcloud-app' && container_has_occ nextcloud-app; then WEB_CONTAINER=nextcloud-app; fi
if docker ps --format '{{.Names}}' | grep -qx 'nextcloud-cron' && container_has_occ nextcloud-cron; then CRON_CONTAINER=nextcloud-cron; fi
if [ -z "$WEB_CONTAINER" ]; then
  for c in $(docker ps --format '{{.Names}}' | grep -Ei 'nextcloud' || true); do
    case "$c" in *cron*) continue;; esac
    if container_has_occ "$c"; then WEB_CONTAINER="$c"; break; fi
  done
fi
if [ -z "$CRON_CONTAINER" ]; then
  for c in $(docker ps --format '{{.Names}}' | grep -Ei 'nextcloud.*cron|cron.*nextcloud' || true); do
    if container_has_occ "$c"; then CRON_CONTAINER="$c"; break; fi
  done
fi
[ -n "$WEB_CONTAINER" ] || die "Could not find the Nextcloud web container."

say "Nextcloud web container: $WEB_CONTAINER"
[ -n "$CRON_CONTAINER" ] && say "Nextcloud cron container: $CRON_CONTAINER"
say "Application: $APP_ID"

# Disable first. It is safe when the app is already disabled or absent.
if docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ app:list --enabled 2>/dev/null | grep -q -- "- $APP_ID:"; then
  say "Disabling $APP_ID..."
  docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ app:disable "$APP_ID"
else
  say "$APP_ID is already disabled or not registered."
fi

if [ "$PURGE_SETTINGS" -eq 1 ]; then
  say "Removing administrator settings..."
  docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ config:app:delete "$APP_ID" >/dev/null 2>&1 || true

  say "Removing per-user Weather settings..."
  USERS="$(docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ user:list --output=json 2>/dev/null | php -r '$j=json_decode(stream_get_contents(STDIN),true); if(is_array($j)){foreach(array_keys($j) as $u) echo $u,"\n";}' 2>/dev/null || true)"
  KEYS="location_mode location_name latitude longitude timezone saved_locations widget_fields"
  if [ -n "$USERS" ]; then
    printf '%s\n' "$USERS" | while IFS= read -r uid; do
      [ -n "$uid" ] || continue
      for key in $KEYS; do
        docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ config:user:delete "$uid" "$APP_ID" "$key" >/dev/null 2>&1 || true
      done
    done
  fi
fi

TARGET="/var/www/html/custom_apps/$APP_ID"
say "Removing application files..."
docker exec "$WEB_CONTAINER" rm -rf "$TARGET" "$TARGET.new" /var/www/html/custom_apps/${APP_ID}.backup-* >/dev/null 2>&1 || true
if [ -n "$CRON_CONTAINER" ] && [ "$CRON_CONTAINER" != "$WEB_CONTAINER" ]; then
  docker exec "$CRON_CONTAINER" rm -rf "$TARGET" "$TARGET.new" /var/www/html/custom_apps/${APP_ID}.backup-* >/dev/null 2>&1 || true
fi

# Clear web PHP OPcache after removing PHP classes.
say "Restarting Nextcloud web container..."
docker restart "$WEB_CONTAINER" >/dev/null
READY=0; i=0
while [ "$i" -lt 60 ]; do
  if docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ status >/dev/null 2>&1; then READY=1; break; fi
  i=$((i+1)); sleep 2
done
[ "$READY" -eq 1 ] || die "Nextcloud web container did not become ready after restart."

if docker exec "$WEB_CONTAINER" sh -c "test -e '$TARGET'"; then
  die "Application directory still exists: $TARGET"
fi

say "Uninstall finished successfully."
if [ "$PURGE_SETTINGS" -eq 0 ]; then
  say "Weather settings were preserved. For a complete cleanup use: sudo sh uninstall.sh --purge-settings"
else
  say "Application code and Weather settings were removed."
fi
