# pnma

## Android / Expo environment

- **Node**: v22 (keep current default; Expo/React Native compatible)
- **Java**: 21 (`JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64`)
- **Android SDK**: `/workspace/android-sdk`
  - commandline-tools (latest)
  - platform `android-36`
  - build-tools `36.0.0`
  - NDK `27.1.12297006`
  - platform-tools

Environment variables (also exported from shell profiles):

```bash
export ANDROID_HOME=/workspace/android-sdk
export ANDROID_SDK_ROOT=/workspace/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
```

Reinstall / refresh SDK packages:

```bash
bash scripts/setup-android-sdk.sh
# or
source /workspace/android-sdk/env.sh
```
