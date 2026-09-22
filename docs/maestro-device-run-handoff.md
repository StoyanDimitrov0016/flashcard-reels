# Maestro Android device run: current state

The Maestro archive scenarios are committed in `apps/mobile/.maestro` (commit `11b507b`). **They have not passed on a device yet.** This document records the September 22, 2026 attempt so the next run can start at the current build blocker.

## What works

- `apps/mobile/scripts/android-machine.ps1 -Action Ready` started the machine's known-working archived Emulator 36.6.11. `adb devices` showed `emulator-5554` online.
- Maestro CLI 2.10.0 was downloaded from the official release into the user's temporary directory as `flashcard-maestro-cli/maestro/bin/maestro.bat`. It runs after its normal `%LOCALAPPDATA%/mobile_dev/maestro/Logs` directory is created. The CLI is not on `PATH`.
- The versioned `.fcrdeck` fixture generates successfully. The YAML parses, and the mobile `check` command passes.
- Local Android prebuild generated an ignored `apps/mobile/android` directory. Expo temporarily changed the `android` and `ios` package scripts; those changes were reverted. `git status` was clean before this document.

## Why the device flows did not run

1. No current Flashcard Reels APK was installed. The emulator only had Expo Go.
2. Expo Go opened through local Metro (`adb reverse tcp:8081 tcp:8081`, `npx expo start --localhost --android`) but showed `Failed to download remote update`, so it was not a usable test target.
3. An escalated `npx expo start --tunnel --android` was rejected by automatic approval review because the tunnel would expose the local development bundle through ngrok. Do not retry that path without explicit approval. The local build path does not need a tunnel.
4. Local `app:assembleDebug` initially failed in Prefab because a generated Windows command included the Cyrillic `C:\Users\АДМИН\.gradle` path. Moving `GRADLE_USER_HOME` to an ASCII path got past that failure.
5. Gradle's Java process could not fetch uncached Maven binaries in this environment (`Permission denied: getsockopt`), although PowerShell requests to the official Google Maven and Maven Central artifact URLs succeeded. The exact missing binaries were copied into an ignored local Maven repository under `apps/mobile/android/.local-maven`, and an ignored Gradle init script at `apps/mobile/android/.gradle-user-home/local-artifacts.gradle` uses them for offline builds.
6. Kotlin's daemon could not write to `%LOCALAPPDATA%/kotlin/daemon` in the restricted run. `kotlin.compiler.execution.strategy=in-process` in the ignored `.gradle-user-home/gradle.properties` got past that failure.
7. **Current blocker:** Ninja failed compiling `react-native-screens` because the absolute path to a header under `apps/mobile/android/.gradle-user-home/caches/.../ComponentDescriptorFactory.h` exceeds Windows' 260-character path limit. No APK was produced.

## Suggested next attempt

Use a **short ASCII Gradle cache root** such as `D:\g` (rather than the current long repository path). Copy the existing ignored `.gradle-user-home` cache and `gradle.properties` there, and run Gradle with `GRADLE_USER_HOME=D:\g`. Keep the local Maven artifact repository and init script if Gradle's own network access remains unavailable. The init script's Maven URL points to the ignored `.local-maven` directory and can be passed with `--init-script`. This should shorten the Ninja header path substantially; verify with an actual build. Gradle documents `GRADLE_USER_HOME` as the supported cache location setting.

The last command was run from `apps/mobile/android`:

```powershell
$env:GRADLE_USER_HOME = 'D:\repositories\flashcard-reels\apps\mobile\android\.gradle-user-home'
.\gradlew.bat app:assembleDebug -x lint -x test --offline --init-script .gradle-user-home/local-artifacts.gradle --configure-on-demand --build-cache -PreactNativeDevServerPort=8081 -PreactNativeArchitectures=x86_64
```

The current ignored build and cache folders may be reused. Once `app-debug.apk` exists, install it on the already prepared emulator, put Maestro CLI on `PATH`, and run `apps/mobile/scripts/run-maestro.ps1 -ApkPath <absolute APK path>`. Expect to adjust the YAML selectors based on real Android picker and UI behavior; syntax checks alone do not validate those interactions.

Do not claim the Maestro scenarios pass until the CLI reports each flow passing. The existing archive integration tests and static checks passed before this device attempt.
