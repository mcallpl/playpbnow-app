#!/usr/bin/env bash
# Record a demo flow as a CLEAN screen capture — just the phone, nothing else.
#
# `maestro record` renders the device inside a frame with its own step list beside
# it. That panel is Maestro branding, not your app. This script instead captures
# the simulator's screen directly (xcrun simctl io recordVideo) while `maestro
# test` drives the app, so the output is only what a user would see.
#
# Usage:  .maestro/record-clean.sh [flow.yaml] [output.mp4]
set -euo pipefail

UDID="${UDID:-71364915-79A3-44C3-A2D7-E04717A3EF73}"   # iPhone 17 Pro, iOS 26.5
APP_ID="${APP_ID:-com.mcallpl.PlayPBNow}"
FLOW="${1:-.maestro/demo-groups.yaml}"
OUT="${2:-$HOME/Desktop/PlayPBNow-Groups-Demo-clean.mp4}"
RAW="${TMPDIR:-/tmp}/pbn-clean-capture.mov"

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export PATH="$JAVA_HOME/bin:$PATH:$HOME/.maestro/bin"

echo "▶ recording $UDID → $RAW"
rm -f "$RAW"
xcrun simctl io "$UDID" recordVideo --codec h264 --force "$RAW" &
REC_PID=$!
sleep 3                       # let the recorder spin up before the first frame

echo "▶ driving $FLOW"
set +e
maestro test -e "APP_ID=$APP_ID" "$FLOW"
FLOW_RC=$?
set -e

sleep 2                       # hold the final frame
echo "▶ stopping recorder"
kill -INT "$REC_PID" 2>/dev/null || true
wait "$REC_PID" 2>/dev/null || true

if [ ! -s "$RAW" ]; then
  echo "✗ no video captured" >&2
  exit 1
fi

# simctl writes a large .mov; transcode to a shareable mp4 (~5 MB/90 s).
echo "▶ transcoding → $OUT"
ffmpeg -y -loglevel error -i "$RAW" -vcodec libx264 -crf 28 -preset fast \
       -vf "scale=-2:1000" -pix_fmt yuv420p -an "$OUT"
rm -f "$RAW"

echo "✓ $OUT"
ls -lh "$OUT"
[ $FLOW_RC -eq 0 ] || echo "⚠ flow exited $FLOW_RC — video may be incomplete"
exit $FLOW_RC
