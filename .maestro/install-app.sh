#!/usr/bin/env bash
# Install the built PlayPBNow app onto every booted simulator.
#
# Why this exists: `npx expo run:ios` installs the app on ONE simulator. Maestro
# Studio picks whichever simulator it likes and will happily boot a different one
# each session — and on a device without the app you get:
#
#   Failed to get app binary directory for bundle com.mcallpl.PlayPBNow on
#   device <UDID>: ... No such file or directory
#
# That error means "app not installed on THAT device", not a broken flow.
# Run this after any build, or any time Studio switches devices.
set -euo pipefail

DERIVED="$HOME/Library/Developer/Xcode/DerivedData"
APP="$(find "$DERIVED" -maxdepth 5 -name PlayPBNow.app -path "*Release-iphonesimulator*" 2>/dev/null | head -1)"
[ -n "$APP" ] || APP="$(find "$DERIVED" -maxdepth 5 -name PlayPBNow.app -path "*Debug-iphonesimulator*" 2>/dev/null | head -1)"

if [ -z "$APP" ]; then
  echo "✗ No built PlayPBNow.app found. Build first:" >&2
  echo "  npx expo run:ios --configuration Release --device \"<UDID>\"" >&2
  exit 1
fi
echo "▶ using $APP"

BOOTED="$(xcrun simctl list devices booted | grep -oE '[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}' || true)"
if [ -z "$BOOTED" ]; then
  echo "✗ No booted simulators. Open Simulator.app first." >&2
  exit 1
fi

for udid in $BOOTED; do
  name="$(xcrun simctl list devices | grep "$udid" | sed 's/ *(.*//;s/^ *//')"
  if xcrun simctl install "$udid" "$APP" 2>/dev/null; then
    echo "✓ $name ($udid)"
  else
    echo "✗ $name ($udid) — install failed (iOS version may predate the build target)"
  fi
done
