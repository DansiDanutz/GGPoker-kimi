#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -x /Users/davidai/.local/bin/danslab-workflow ]]; then
  /Users/davidai/.local/bin/danslab-workflow status --path "$ROOT"
fi
BUILD="$ROOT/build"
APP="$ROOT/dist/GGPoker-PlayMoney.app"
CONTENTS="$APP/Contents"
mkdir -p "$BUILD/icon.iconset" "$CONTENTS/MacOS" "$CONTENTS/Resources/web"

swiftc -O "$ROOT/native/main.swift" -o "$CONTENTS/MacOS/GGPoker-PlayMoney" -framework Cocoa -framework WebKit
cp "$ROOT/native/Info.plist" "$CONTENTS/Info.plist"
cp "$ROOT"/src/* "$CONTENTS/Resources/web/"

python3 "$ROOT/native/make_icon.py" "$BUILD/icon-1024.png"
for size in 16 32 64 128 256 512; do
  sips -z "$size" "$size" "$BUILD/icon-1024.png" --out "$BUILD/icon.iconset/icon_${size}x${size}.png" >/dev/null
  if [[ "$size" -le 256 ]]; then
    double=$((size * 2))
    sips -z "$double" "$double" "$BUILD/icon-1024.png" --out "$BUILD/icon.iconset/icon_${size}x${size}@2x.png" >/dev/null
  fi
done
iconutil -c icns "$BUILD/icon.iconset" -o "$CONTENTS/Resources/AppIcon.icns"
codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"
printf 'Built %s\n' "$APP"
du -sh "$APP"
