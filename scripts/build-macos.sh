#!/usr/bin/env bash
# FileKit macOS Universal Binary Build, Sign & Notarization Pipeline
set -euo pipefail

echo "========================================================"
echo "   Building FileKit for macOS (Universal Binary)        "
echo "========================================================"

# 1. Ensure Rust target for Apple Silicon and Intel
rustup target add aarch64-apple-darwin x86_64-apple-darwin || true

# 2. Build Release DMG
echo "[1/4] Compiling Universal Mac Binary via Tauri..."
cargo tauri build --target universal-apple-darwin

APP_PATH="src-tauri/target/universal-apple-darwin/release/bundle/macos/FileKit.app"
DMG_PATH="src-tauri/target/universal-apple-darwin/release/bundle/dmg/FileKit_1.0.0_universal.dmg"

# 3. Code Signing (Optional if Developer ID Certificate provided)
if [ -n "${APPLE_SIGNING_IDENTITY:-}" ]; then
  echo "[2/4] Signing application bundle with Developer ID: ${APPLE_SIGNING_IDENTITY}..."
  codesign --deep --force --options runtime --sign "${APPLE_SIGNING_IDENTITY}" "${APP_PATH}"
fi

# 4. Apple Notarization via xcrun notarytool
if [ -n "${APPLE_KEYCHAIN_PROFILE:-}" ]; then
  echo "[3/4] Submitting DMG to Apple Notarization Service..."
  xcrun notarytool submit "${DMG_PATH}" --keychain-profile "${APPLE_KEYCHAIN_PROFILE}" --wait
  
  echo "[4/4] Stapling notarization ticket to FileKit.app..."
  xcrun stapler staple "${APP_PATH}"
  xcrun stapler staple "${DMG_PATH}"
  echo "✅ Notarization complete! DMG is ready for Gatekeeper-safe distribution."
else
  echo "⚠️ Skipping notarization (APPLE_KEYCHAIN_PROFILE not set). Set to notarize for Gatekeeper."
fi

echo "========================================================"
echo "   Build completed successfully!                        "
echo "   Output DMG: ${DMG_PATH}                             "
echo "========================================================"
