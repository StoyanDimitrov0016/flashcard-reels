# Maestro Android device testing on this machine

The scenarios live in `apps/mobile/.maestro`. Three cover continuing saved progress after reinstalling a deck, deleting saved progress to start fresh, and deleting progress from the archive. A fourth checks the full app data reset confirmation sheet and cancels it without resetting data. A fifth imports a progress backup and opens the native export share sheet. A sixth checks archived and continued progress across cold app launches. The versioned test deck includes an audio fixture, so the flows need no audio generation.

## Working local setup (September 23, 2026)

- `apps/mobile/scripts/android-machine.ps1 -Action Ready` boots the known-working archived Android Emulator 36.6.11. ADB shows `emulator-5554`.
- Maestro CLI 2.10.0 is in `%TEMP%\flashcard-maestro-cli\maestro\bin`. Add that directory to `PATH` for the current PowerShell session.
- `apps/mobile/android` is a generated, ignored native project. The local release APK embeds JavaScript and works without Metro or a tunnel. `app:assembleDebug` also built, but its APK needs a development server and is unsuitable for this offline test run.
- Set `GRADLE_USER_HOME=D:\g`. The default Cyrillic user path breaks Prefab commands. A longer ASCII path inside the repository breaks Ninja's 260-character path limit. `D:\g\gradle.properties` sets `kotlin.compiler.execution.strategy=in-process`, avoiding a Kotlin daemon write failure.
- Gradle's Java process could not fetch missing Maven binaries (`Permission denied: getsockopt`). Exact artifacts were fetched from official Google Maven and Maven Central into the ignored `apps/mobile/android/.local-maven`. `D:\g\local-artifacts.gradle` maps their exact versions for offline builds. These local files are machine setup, not committed project dependencies.

From `apps/mobile/android`, build the local release APK:

```powershell
$env:GRADLE_USER_HOME = 'D:\g'
$env:NODE_ENV = 'production'
.\gradlew.bat app:assembleRelease -x lint -x test -x extractReleaseAnnotations -x generateReleaseLintModel -x generateReleaseLintVitalModel -x lintVitalAnalyzeRelease -x lintVitalReportRelease -x lintVitalRelease --offline --init-script D:\g\local-artifacts.gradle --configure-on-demand --build-cache -PreactNativeArchitectures=x86_64
```

From the repository root, run all scenarios:

```powershell
$env:PATH = (Join-Path $env:TEMP 'flashcard-maestro-cli\maestro\bin') + ';' + $env:PATH
$env:MAESTRO_CLI_NO_ANALYTICS = '1'
./apps/mobile/scripts/run-maestro.ps1 -ApkPath ./apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

The runner boots the emulator, installs the APK, generates the deck package, copies it and the progress backup fixture to Android Downloads, and runs the archive, reset, backup, lesson-section, Focus-resume, and Discover-to-Focus flows. It leaves the emulator running. The Android picker interaction uses the known emulator's Downloads drawer location (`30%, 27%`); adjust that selector if the picker layout changes.

## Findings from the first device runs

- The app crashed on launch because `react-native-pager-view` was used by the feed but missing as a direct mobile dependency. Adding it made the native view available in the rebuilt APK.
- Maestro's icon-only tab selectors needed accessibility labels. The flows now use those labels.
- A long press on a Library deck left a press flag set and swallowed the next tap. Resetting it on each press fixed navigation after Focus.
- The Start fresh confirmation cleared the selected archived progress when its previous sheet closed. The Library screen now preserves the selection through confirmation.
- A default upward swipe did not reliably advance the feed. The study subflow now swipes from `78%` to `22%` over 650 ms and checks that the next question face appears.

All five flows passed on September 24. The native pager dependency had been removed after the first device run because static dead-code analysis did not see its indirect native use; it is now a direct dependency again and explicitly exempted from that check. The reset confirmation initially appeared to fail after Cancel because its unescaped `?` selector also matched the page's reset button; the sheet itself closed correctly, and the corrected assertion passed. A system theme provider now covers the root startup and recovery screens so their reset sheet can render before preferences initialize.

## October 1 integration review

The rating selector is now `Recall rating: Good`, and the runner includes the new cold-launch scenario. These changes need a fresh device run. The review environment could export the Android bundle and pass Expo Doctor, but had no Android SDK, Java, Maestro, or the documented emulator. The September results above describe the earlier five flows only.

## October 6 query lifecycle coverage

The runner now includes the existing `lesson-section-references.yaml` and new
`focus-resume.yaml` and `discover-hold-to-focus.yaml` scenarios. The new flows check position,
saved rating, held-card entry, navigation away and back, foregrounding, and cold launch.
They have not been device-verified in the implementation environment, which has no Android SDK,
Maestro CLI, or generated native project. See [Study flow testing](study-testing.md) for the
automated React/SQLite coverage and the remaining native boundary.
