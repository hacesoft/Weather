#!/bin/sh
set -eu

# Úspěšná instalace vypíše stejné čtyři řádky ve všech aplikacích.
# Při chybě se místo toho zobrazí celý protokol.
if [ "${HC_INSTALL_VERBOSE_INTERNAL:-0}" != "1" ]; then
    INSTALL_LOG="$(mktemp)"
    trap 'rm -f "$INSTALL_LOG"' EXIT
    trap 'exit 129' HUP
    trap 'exit 130' INT
    trap 'exit 143' TERM
    if HC_INSTALL_VERBOSE_INTERNAL=1 sh "$0" >"$INSTALL_LOG" 2>&1; then
        APP_INFO="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/src/appinfo/info.xml"
        APP_ID="$(sed -n 's:.*<id>\([^<]*\)</id>.*:\1:p' "$APP_INFO" | head -n 1)"
        APP_NAME="$(sed -n 's:.*<name>\([^<]*\)</name>.*:\1:p' "$APP_INFO" | head -n 1 | sed 's/&amp;/\&/g')"
        NEW_VERSION="$(sed -n 's:.*<version>\([^<]*\)</version>.*:\1:p' "$APP_INFO" | head -n 1)"
        OLD_VERSION="$(sed -n 's/^Install previous version: //p' "$INSTALL_LOG" | head -n 1)"
        WEB_NAME="$(sed -n 's/^Nextcloud web container: //p' "$INSTALL_LOG" | head -n 1)"
        if [ -z "$APP_ID" ] || [ -z "$NEW_VERSION" ] || [ -z "$OLD_VERSION" ] || [ -z "$WEB_NAME" ]; then
            cat "$INSTALL_LOG" >&2
            echo 'ERROR: Could not verify the installation summary.' >&2
            exit 1
        fi
        SIZE_KIB="$(docker exec "$WEB_NAME" du -sk "/var/www/html/custom_apps/$APP_ID" 2>/dev/null | awk 'NR==1 {print $1}')"
        case "$SIZE_KIB" in ''|*[!0-9]*) SIZE_KIB="$(du -sk "$(dirname "$APP_INFO")/.." | awk 'NR==1 {print $1}')";; esac
        printf 'Aplikace: %s\nVerze: %s -> %s\nVelikost instalace: %s KiB\nHotovo.\n' "${APP_NAME:-$APP_ID}" "$OLD_VERSION" "$NEW_VERSION" "$SIZE_KIB"
        grep '^WARNING:' "$INSTALL_LOG" >&2 || true
        exit 0
    else
        STATUS=$?
        cat "$INSTALL_LOG" >&2
        exit "$STATUS"
    fi
fi

PROJECT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
APP_DIR="$PROJECT_DIR/src"
INFO="$APP_DIR/appinfo/info.xml"
[ -f "$INFO" ] || { echo "ERROR: $INFO not found" >&2; exit 1; }
APP_ID="$(sed -n 's:.*<id>\([^<]*\)</id>.*:\1:p' "$INFO" | head -n 1)"
APP_NAME="$(sed -n 's:.*<name>\([^<]*\)</name>.*:\1:p' "$INFO" | head -n 1)"
MIN_NC_MAJOR="$(sed -n 's:.*<nextcloud[^>]*min-version="\([0-9][0-9]*\)".*:\1:p' "$INFO" | head -n 1)"
MAX_NC_MAJOR="$(sed -n 's:.*<nextcloud[^>]*max-version="\([0-9][0-9]*\)".*:\1:p' "$INFO" | head -n 1)"
[ -n "$APP_ID" ] || { echo "ERROR: app id not found" >&2; exit 1; }
[ -n "$APP_NAME" ] || APP_NAME="$APP_ID"
WEB_CONTAINER=""; CRON_CONTAINER=""
say(){ printf '%s\n' "$*"; }; die(){ printf 'ERROR: %s\n' "$*" >&2; exit 1; }
# Šetrné obnovení webového procesu načte nový PHP kód bez zastavení kontejneru.
refresh_web_runtime(){
    if docker exec "$WEB_CONTAINER" sh -c 'command -v apache2ctl >/dev/null 2>&1'; then
        docker exec "$WEB_CONTAINER" apache2ctl -k graceful >/dev/null 2>&1 || die "Apache graceful reload failed."
    elif docker exec "$WEB_CONTAINER" sh -c 'command -v httpd >/dev/null 2>&1'; then
        docker exec "$WEB_CONTAINER" httpd -k graceful >/dev/null 2>&1 || die "HTTPD graceful reload failed."
    elif docker exec "$WEB_CONTAINER" sh -c 'test -r /proc/1/comm && grep -qi php-fpm /proc/1/comm'; then
        docker exec "$WEB_CONTAINER" kill -USR2 1 >/dev/null 2>&1 || die "PHP-FPM graceful reload failed."
    else
        say "WARNING: Web PHP reload unavailable; if old assets remain cached, refresh the web runtime during maintenance."
    fi
}
CORE_APP_ID="hc_shared_app_core"
CORE_MANIFEST="$APP_DIR/appinfo/hc_shared_app_core.json"
CORE_MIN_VERSION="0.18.8"
if [ -f "$CORE_MANIFEST" ]; then
  CORE_FROM_MANIFEST="$(sed -n 's/.*"requiredVersion"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$CORE_MANIFEST" | head -n 1)"
  [ -z "$CORE_FROM_MANIFEST" ] || CORE_MIN_VERSION="$CORE_FROM_MANIFEST"
fi
LEGACY_APP_ID="weatherplus"
[ "$(id -u)" -eq 0 ] || die "Run this installer with: sudo sh install.sh"
chmod 755 "$0" 2>/dev/null || true
command -v docker >/dev/null 2>&1 || die "Docker was not found."
RUNTIME_ITEMS="appinfo css img js l10n lib templates"
container_has_occ(){ docker exec "$1" sh -c 'test -f /var/www/html/occ' >/dev/null 2>&1; }
if docker ps --format '{{.Names}}' | grep -qx 'nextcloud-app' && container_has_occ nextcloud-app; then WEB_CONTAINER=nextcloud-app; fi
if docker ps --format '{{.Names}}' | grep -qx 'nextcloud-cron' && container_has_occ nextcloud-cron; then CRON_CONTAINER=nextcloud-cron; fi
if [ -z "$WEB_CONTAINER" ]; then
 for c in $(docker ps --format '{{.Names}}' | grep -Ei 'nextcloud' || true); do case "$c" in *cron*) continue;; esac; if container_has_occ "$c"; then WEB_CONTAINER="$c"; break; fi; done
fi
if [ -z "$CRON_CONTAINER" ]; then
 for c in $(docker ps --format '{{.Names}}' | grep -Ei 'nextcloud.*cron|cron.*nextcloud' || true); do if container_has_occ "$c"; then CRON_CONTAINER="$c"; break; fi; done
fi
[ -n "$WEB_CONTAINER" ] || die "Could not find the Nextcloud web container."
say "Nextcloud web container: $WEB_CONTAINER"; [ -n "$CRON_CONTAINER" ] && say "Nextcloud cron container: $CRON_CONTAINER"

# Před prvním occ odsunout staré duplicitní kopie mimo custom_apps.
. "$PROJECT_DIR/scripts/custom-apps-safety.sh"
hc_clean_custom_apps "$APP_ID" "$WEB_CONTAINER" "$CRON_CONTAINER" || die "Could not safely move duplicate application trees out of custom_apps."
NC_STATUS="$(docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ status --output=json 2>/dev/null || true)"
NC_VERSION="$(printf '%s' "$NC_STATUS" | sed -n 's/.*"versionstring":"\([^"]*\)".*/\1/p')"
if [ -n "$NC_VERSION" ]; then
 say "Nextcloud version: $NC_VERSION"; NC_MAJOR="$(printf '%s' "$NC_VERSION" | cut -d. -f1)"
 case "$NC_MAJOR" in ''|*[!0-9]*) ;; *)
  [ -z "$MIN_NC_MAJOR" ] || [ "$NC_MAJOR" -ge "$MIN_NC_MAJOR" ] || die "$APP_NAME requires Nextcloud $MIN_NC_MAJOR or newer."
  [ -z "$MAX_NC_MAJOR" ] || [ "$NC_MAJOR" -le "$MAX_NC_MAJOR" ] || die "$APP_NAME supports Nextcloud up to major $MAX_NC_MAJOR."
 ;; esac
fi

CORE_LIST="$(docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ app:list --output=json 2>/dev/null || true)"
CORE_VERSION="$(printf '%s' "$CORE_LIST" | sed -n 's/.*"hc_shared_app_core":"\([^"]*\)".*/\1/p' | head -n 1)"
[ -n "$CORE_VERSION" ] || die "$APP_NAME requires Shared App Core $CORE_MIN_VERSION or newer. Install or update hc_shared_app_core separately first."
docker exec "$WEB_CONTAINER" php -r 'exit(version_compare($argv[1], $argv[2], ">=") ? 0 : 1);' "$CORE_VERSION" "$CORE_MIN_VERSION" || die "$APP_NAME requires Shared App Core $CORE_MIN_VERSION or newer; found $CORE_VERSION."
if printf '%s' "$CORE_LIST" | grep -q '"disabled".*"hc_shared_app_core"'; then
    say "Enabling Shared App Core $CORE_VERSION..."
    docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ app:enable "$CORE_APP_ID"
fi
say "Shared App Core version: $CORE_VERSION"
for item in $RUNTIME_ITEMS; do [ -e "$APP_DIR/$item" ] || die "Required application item is missing in src/: $item"; done
SOURCE_VERSION="$(sed -n 's:.*<version>\([^<]*\)</version>.*:\1:p' "$INFO" | head -n 1)"; [ -n "$SOURCE_VERSION" ] || die "Could not determine app version."
say "$APP_NAME source version: $SOURCE_VERSION"
INSTALLED_VERSION="$(docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ config:app:get "$APP_ID" installed_version 2>/dev/null || true)"
say "Install previous version: ${INSTALLED_VERSION:-nová instalace}"
TMP_LOCAL="$(mktemp -d)"
. "$PROJECT_DIR/scripts/install-transaction.sh"
# Při chybě se vrátí kód i původní verze v Nextcloudu; záznamy se nepřevádějí.
install_cleanup() {
 status=$?
 trap - EXIT HUP INT TERM
 if [ "$status" -ne 0 ]; then hc_tx_restore || true; fi
 hc_cleanup_install_stage
 rm -rf "$TMP_LOCAL"
 exit "$status"
}
trap install_cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
STAGE="$TMP_LOCAL/$APP_ID"; mkdir -p "$STAGE"
for item in $RUNTIME_ITEMS; do cp -R "$APP_DIR/$item" "$STAGE/"; done
DATA_DIRECTORY="$(docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ config:system:get datadirectory)"
case "$DATA_DIRECTORY" in /*) ;; *) die "Cannot locate Nextcloud data directory for backup.";; esac
TARGET_DIR="/var/www/html/custom_apps/$APP_ID"; NEW_DIR="/tmp/${APP_ID}.new.$$"; REMOTE_TMP="/tmp/${APP_ID}.install.$$"
docker exec "$WEB_CONTAINER" sh -c 'mkdir -p /var/www/html/custom_apps'
docker exec "$WEB_CONTAINER" rm -rf "$REMOTE_TMP" "$NEW_DIR" >/dev/null 2>&1 || true
docker exec "$WEB_CONTAINER" mkdir -p "$REMOTE_TMP"; docker cp "$STAGE/." "$WEB_CONTAINER:$REMOTE_TMP/"
docker exec "$WEB_CONTAINER" sh -c "mv '$REMOTE_TMP' '$NEW_DIR' && chown -R www-data:www-data '$NEW_DIR'"
docker exec "$WEB_CONTAINER" sh -c 'find "$1" -type f -name "*.php" -exec php -l {} \;' sh "$NEW_DIR" >"$TMP_LOCAL/php-lint.log" 2>&1 || { cat "$TMP_LOCAL/php-lint.log"; die "Staged PHP validation failed."; }
if grep -q 'Errors parsing' "$TMP_LOCAL/php-lint.log"; then cat "$TMP_LOCAL/php-lint.log"; die "Staged PHP validation failed."; fi
BACKUP_DIR="${DATA_DIRECTORY}/hc-core-deployment-backups/${APP_ID}.$(date +%Y%m%d%H%M%S).$$"
PREVIOUS_ENABLED=0
if docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ app:list --enabled 2>/dev/null | grep -q -- "- $APP_ID:"; then PREVIOUS_ENABLED=1; fi
hc_tx_begin "$WEB_CONTAINER" "$CRON_CONTAINER" "$APP_ID" "$TARGET_DIR" "$BACKUP_DIR" "$INSTALLED_VERSION" "$PREVIOUS_ENABLED"
# Staging už prošel PHP lintem; nyní lze bezpečně odložit starý běhový kód.
hc_tx_disable_web
hc_tx_backup_web
hc_tx_place_web "$NEW_DIR"
PROBE_FILE=".hc-weather-deploy-probe-$$"
docker exec "$WEB_CONTAINER" touch "$TARGET_DIR/$PROBE_FILE"
if [ -n "$CRON_CONTAINER" ] && [ "$CRON_CONTAINER" != "$WEB_CONTAINER" ]; then
 if ! docker exec "$CRON_CONTAINER" test -f "$TARGET_DIR/$PROBE_FILE"; then
  CRON_TMP="/tmp/${APP_ID}.install.$$"; CRON_NEW="/tmp/${APP_ID}.cron-new.$$"
  docker exec "$CRON_CONTAINER" sh -c 'mkdir -p /var/www/html/custom_apps'; docker exec "$CRON_CONTAINER" rm -rf "$CRON_TMP" "$CRON_NEW" >/dev/null 2>&1 || true
  docker exec "$CRON_CONTAINER" mkdir -p "$CRON_TMP"; docker cp "$STAGE/." "$CRON_CONTAINER:$CRON_TMP/"
  docker exec "$CRON_CONTAINER" mv "$CRON_TMP" "$CRON_NEW"
  docker exec "$CRON_CONTAINER" chown -R www-data:www-data "$CRON_NEW"
  hc_tx_backup_cron
  hc_tx_place_cron "$CRON_NEW"
 fi
fi
docker exec "$WEB_CONTAINER" rm -f "$TARGET_DIR/$PROBE_FILE"
: # Do not discard earlier runtime backups.
# Načíst nové šablony a soubory bez restartu kontejneru.
refresh_web_runtime
docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ app:enable "$APP_ID"
CONFIG_VERSION_BEFORE="$(docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ config:app:get "$APP_ID" installed_version 2>/dev/null || true)"
if [ "$CONFIG_VERSION_BEFORE" != "$SOURCE_VERSION" ]; then
 docker exec -u www-data "$WEB_CONTAINER" php -r 'require "/var/www/html/lib/base.php"; if (!\OC_App::updateApp($argv[1])) { throw new \RuntimeException("Application update failed"); }' "$APP_ID" || die "Targeted application update failed."
fi
CONFIG_VERSION="$(docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ config:app:get "$APP_ID" installed_version 2>/dev/null || true)"
[ "$CONFIG_VERSION" = "$SOURCE_VERSION" ] || die "Nextcloud app config version mismatch. Expected: $SOURCE_VERSION, reported: ${CONFIG_VERSION:-missing}"
DEPLOYED_VERSION="$(docker exec "$WEB_CONTAINER" sh -c "grep -o '<version>[^<]*</version>' '$TARGET_DIR/appinfo/info.xml' | sed 's#<version>##;s#</version>##'" 2>/dev/null || true)"
[ "$DEPLOYED_VERSION" = "$SOURCE_VERSION" ] || die "Version verification failed. Source: $SOURCE_VERSION, deployed: $DEPLOYED_VERSION"
EXPECTED_JS="app-${SOURCE_VERSION}.js"
EXPECTED_CSS="style-${SOURCE_VERSION}.css"
EXPECTED_DASHBOARD="dashboard-${SOURCE_VERSION}.js"
docker exec "$WEB_CONTAINER" sh -c "test -f '$TARGET_DIR/js/$EXPECTED_JS'" || die "Missing deployed JS build: $EXPECTED_JS"
docker exec "$WEB_CONTAINER" sh -c "test -f '$TARGET_DIR/css/$EXPECTED_CSS'" || die "Missing deployed CSS build: $EXPECTED_CSS"
docker exec "$WEB_CONTAINER" sh -c "test -f '$TARGET_DIR/js/$EXPECTED_DASHBOARD'" || die "Missing deployed Dashboard JS build: $EXPECTED_DASHBOARD"
for item in $RUNTIME_ITEMS; do docker exec "$WEB_CONTAINER" sh -c "test -e '$TARGET_DIR/$item'" || die "Deployment verification failed. Missing: $TARGET_DIR/$item"; done
# Starý identifikátor deaktivujeme až po ověření nové instalace; jeho data zůstávají.
if [ "$APP_ID" != "$LEGACY_APP_ID" ] && docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ app:list --enabled 2>/dev/null | grep -q -- "- $LEGACY_APP_ID:"; then
 docker exec -u www-data "$WEB_CONTAINER" php /var/www/html/occ app:disable "$LEGACY_APP_ID" || true
fi
say "$APP_NAME version: $DEPLOYED_VERSION"; say "Deployment verification: OK"; say "$APP_NAME deployment finished successfully."
