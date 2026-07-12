#!/usr/bin/env bash
# Builds mobile/native/oqustunnel into an Android .aar and drops it where the
# app's Gradle build picks it up (mobile/android/app/libs/).
#
# Prereqs (installed once):
#   • Go                (winget install GoLang.Go)
#   • Android NDK       (sdkmanager "ndk;27.1.12297006")
#   • gomobile + gobind (go install golang.org/x/mobile/cmd/{gomobile,gobind}@latest)
#
# Env (set by the caller or your shell):
#   ANDROID_HOME  → your SDK, e.g. %LOCALAPPDATA%\Android\Sdk
#   ANDROID_NDK_HOME → $ANDROID_HOME/ndk/<version>
#
# Usage:  bash mobile/native/build-aar.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/oqustunnel"
OUT_DIR="$HERE/../android/app/libs"
OUT="$OUT_DIR/oqustunnel.aar"

mkdir -p "$OUT_DIR"
cd "$SRC"

echo "→ tidying module"
go mod tidy

echo "→ ensuring gomobile is initialised (uses ANDROID_NDK_HOME)"
gomobile init 2>/dev/null || true

echo "→ binding for android/arm64 + android/arm"
# javapkg controls the generated Java/Kotlin package name → import oqustunnel.*
gomobile bind \
  -target=android/arm64,android/arm \
  -javapkg=oqustunnel \
  -o "$OUT" \
  .

echo "✓ built $OUT"
ls -lh "$OUT"
