#!/usr/bin/env bash
# Install Android SDK commandline-tools + Expo/RN packages for this environment.
# Target: ANDROID_HOME=/workspace/android-sdk
set -euo pipefail

ANDROID_SDK_ROOT_DIR="${ANDROID_SDK_ROOT_DIR:-/workspace/android-sdk}"
CMDTOOLS_ZIP_URL="${CMDTOOLS_ZIP_URL:-https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip}"
JAVA_HOME_DIR="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-amd64}"

export JAVA_HOME="$JAVA_HOME_DIR"
export ANDROID_HOME="$ANDROID_SDK_ROOT_DIR"
export ANDROID_SDK_ROOT="$ANDROID_SDK_ROOT_DIR"

mkdir -p "$ANDROID_HOME/cmdline-tools"

if [[ ! -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]]; then
  tmpdir="$(mktemp -d)"
  curl -fsSL -o "$tmpdir/commandlinetools-linux.zip" "$CMDTOOLS_ZIP_URL"
  unzip -q "$tmpdir/commandlinetools-linux.zip" -d "$tmpdir/extract"
  rm -rf "$ANDROID_HOME/cmdline-tools/latest"
  mkdir -p "$ANDROID_HOME/cmdline-tools/latest"
  mv "$tmpdir/extract/cmdline-tools/"* "$ANDROID_HOME/cmdline-tools/latest/"
  rm -rf "$tmpdir"
fi

export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/36.0.0:$PATH"

yes | sdkmanager --licenses >/dev/null || true
sdkmanager --install \
  "platforms;android-36" \
  "build-tools;36.0.0" \
  "ndk;27.1.12297006" \
  "platform-tools"

cat > "$ANDROID_HOME/env.sh" << EOF
export ANDROID_HOME=$ANDROID_HOME
export ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT
export JAVA_HOME=$JAVA_HOME
export PATH="\$JAVA_HOME/bin:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/build-tools/36.0.0:\$PATH"
EOF

echo "Android SDK ready at $ANDROID_HOME"
sdkmanager --list_installed
