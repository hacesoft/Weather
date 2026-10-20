#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
SRC="$ROOT/src"
python3 "$ROOT/scripts/check-languages.py"
INFO="$SRC/appinfo/info.xml"

[ -f "$INFO" ] || { echo "ERROR: $INFO not found" >&2; exit 1; }
APP_ID="$(sed -n 's:.*<id>\([^<]*\)</id>.*:\1:p' "$INFO" | head -n 1)"
VERSION="$(sed -n 's:.*<version>\([^<]*\)</version>.*:\1:p' "$INFO" | head -n 1)"
[ -n "$APP_ID" ] || { echo "ERROR: app id not found" >&2; exit 1; }
[ -n "$VERSION" ] || { echo "ERROR: version not found" >&2; exit 1; }

for item in appinfo css img js l10n lib templates; do
    [ -e "$SRC/$item" ] || { echo "ERROR: missing src/$item" >&2; exit 1; }
done
for file in \
    "$SRC/js/app-$VERSION.js" \
    "$SRC/js/dashboard-$VERSION.js" \
    "$SRC/css/style-$VERSION.css"; do
    [ -f "$file" ] || { echo "ERROR: missing current versioned asset: $file" >&2; exit 1; }
done

grep -Rq "addScript('hc_weather', 'app-'" "$SRC/templates" || { echo "ERROR: static bootstrap does not load app bundle" >&2; exit 1; }
grep -Rq "addStyle('hc_shared_app_core', 'workspace')" "$SRC/templates" || { echo "ERROR: static bootstrap does not load Core CSS" >&2; exit 1; }
grep -Rq "addStyle('hc_weather', 'style-'" "$SRC/templates" || { echo "ERROR: static bootstrap does not load app CSS" >&2; exit 1; }
grep -Rq "addScript('hc_shared_app_core', 'hc_shared_app_core')" "$SRC/templates" || { echo "ERROR: static bootstrap does not load Core JS" >&2; exit 1; }
grep -q "addScript('hc_shared_app_core', 'hc_shared_app_core')" "$SRC/lib/Dashboard/WeatherWidget.php" || { echo "ERROR: WeatherWidget does not load Core JS before using Core location services" >&2; exit 1; }
grep -q "dashboard-$VERSION" "$SRC/lib/Dashboard/WeatherWidget.php" || { echo "ERROR: WeatherWidget does not reference dashboard-$VERSION.js" >&2; exit 1; }
grep -q "style-$VERSION" "$SRC/lib/Dashboard/WeatherWidget.php" || { echo "ERROR: WeatherWidget does not reference style-$VERSION.css" >&2; exit 1; }

BUILD="$ROOT/.build"
APP="$BUILD/$APP_ID"
RELEASE="$ROOT/release"
rm -rf "$BUILD"
mkdir -p "$APP" "$RELEASE"

# Copy runtime directories, then remove stale versioned frontend assets from the staged release.
for item in appinfo css img js l10n lib templates; do cp -R "$SRC/$item" "$APP/$item"; done
rm -f "$APP/js"/app-*.js "$APP/js"/dashboard-*.js "$APP/css"/style-*.css
cp "$SRC/js/app-$VERSION.js" "$APP/js/"
cp "$SRC/js/dashboard-$VERSION.js" "$APP/js/"
cp "$SRC/css/style-$VERSION.css" "$APP/css/"
cp "$ROOT/LICENSE" "$APP/LICENSE"

(
    cd "$BUILD"
    tar -czf "$RELEASE/$APP_ID-$VERSION.tar.gz" "$APP_ID"
    if command -v zip >/dev/null 2>&1; then
        zip -qr "$RELEASE/$APP_ID-$VERSION.zip" "$APP_ID"
    fi
)
SOURCE="$BUILD/hc_weather-$VERSION"
mkdir -p "$SOURCE"
(cd "$ROOT" && tar -cf - LICENSE README.md README_CZ.md install.sh uninstall.sh build-release.sh scripts tests docs src) | (cd "$SOURCE" && tar -xf -)
(cd "$BUILD" && zip -qr "$RELEASE/hc_weather-$VERSION-full-source.zip" "hc_weather-$VERSION")
rm -rf "$BUILD"
echo "Built release/$APP_ID-$VERSION.tar.gz"
[ -f "$RELEASE/$APP_ID-$VERSION.zip" ] && echo "Built release/$APP_ID-$VERSION.zip"

echo "Built release/hc_weather-$VERSION-full-source.zip"
