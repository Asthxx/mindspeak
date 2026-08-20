#!/bin/bash
# fix-java17.sh — 持久化 Java 17 兼容补丁
# 在 npm install / npx cap sync 后运行此脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/.."

echo "[fix-java17] Applying Java 17 patches..."

# Capacitor generated files
for f in \
  "$ROOT/node_modules/@capacitor/android/capacitor/build.gradle" \
  "$ROOT/node_modules/@capacitor/local-notifications/android/build.gradle" \
  "$ROOT/node_modules/@capacitor/status-bar/android/build.gradle" \
  "$ROOT/node_modules/@capgo/capacitor-navigation-bar/android/build.gradle" \
  "$ROOT/android/app/capacitor.build.gradle" \
  "$ROOT/android/capacitor-cordova-android-plugins/build.gradle"
do
  if [ -f "$f" ]; then
    sed -i 's/JavaVersion\.VERSION_21/JavaVersion.VERSION_17/g' "$f"
    sed -i 's/jvmToolchain(21)/jvmToolchain(17)/g' "$f"
    echo "  Patched: $f"
  fi
done

echo "[fix-java17] Done."
