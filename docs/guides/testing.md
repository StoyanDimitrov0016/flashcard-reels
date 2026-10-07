# Testing

Principles are in [principles](../principles.md#testing) and day-to-day rules are in
[conventions](../conventions.md#tests). This guide says where each test goes and how to run the
parts that need a device.

## Layers

| Layer        | Location                         | Proves                                                                                                                                     |
| ------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit         | `apps/*/tests/unit`              | Deterministic app policies: hold transitions, editable windows, recurrence placement, selection, navigation decisions, token rules.        |
| Integration  | `apps/mobile/tests/integration`  | Public services and hooks with real SQLite, filesystem, and a real query client: persisted reviews, session identity, positions, recovery. |
| Architecture | `apps/mobile/tests/architecture` | Static module and resource contracts, such as undeclared native dependencies and asset registries.                                         |
| Contract     | `packages/deck-contract`         | Every validation rule through the public API, and round-tripping packages.                                                                 |
| Device       | `apps/mobile/.maestro`, below    | Native pager, gestures, recycled cards, sheets, foregrounding, and cold launches on an installed APK.                                      |

On the web, test token, origin, and validation policies as units. Test auth, transfer resolution,
and the deck library at the server boundary with in-memory storage, not mocked R2 calls.

## Study flow coverage

Discover and Focus are two scopes over one engine. Entering Focus, holding a card, resuming,
retrying, and rebuilding after a write are lifecycle scenarios, not separate schedulers. When you
change reel behavior, find the affected rows, add a regression for the decision you're changing,
and run the matching device flows if gestures, lifecycle, mounting, recycling, or native
presentation are involved.

| Scenario                                                                 | Automated (`tests/unit`, `tests/integration`)                                                                                | Device flow                                       |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Discover resumes; the furthest position never moves backward             | `feed-preparation.lifecycle`, `study-session.integration`                                                                    | `discover-hold-to-focus`                          |
| Focus starts once; remounts and retries keep session, position, rating   | `feed-preparation.lifecycle`                                                                                                 | `focus-resume`                                    |
| Holding a Discover card starts Focus at that card                        | `feed-preparation.lifecycle`, `hold-to-focus`, `focus-state`                                                                 | `discover-hold-to-focus`                          |
| Focus resumes or expires on foreground; Discover stays independent       | `focused-feed-foreground.lifecycle`, `study-session.integration`                                                             | `focus-resume`, `discover-hold-to-focus`          |
| Flip, rate, revise in the window, commit outside it, extend the feed     | `recall-controls`, `reel-controller.lifecycle`, `study-feed.integration`, `learning-engine.integration`                      | `focus-resume`, `archived-progress-*`             |
| Reset, remove, reinstall, or restore invalidates study state             | `learning-progress-reset.integration`, `deck-deletion.lifecycle`, `paused-progress.lifecycle`, `progress-backup.integration` | `archived-progress-*`, `progress-backup-transfer` |
| Lesson links keep the study moment and pick the right section            | `lesson-reference-navigation`, `lesson-reader`, `lessons.integration`                                                        | `lesson-section-references`                       |
| Backup actions reject double taps across remounts                        | `progress-backup.lifecycle`                                                                                                  | `progress-backup-transfer`                        |
| Native startup ordering hides partial pages and ignores startup momentum | `reel-pager`                                                                                                                 | Expo Go **Reload** on a device                    |

**Native boundaries worth knowing.** `ReelPager` owns list restoration behind `ReelFeed`. It uses
FlashList's `onLoad` and native offset events to keep measurement frames hidden until the saved
page is aligned, and startup momentum is not study navigation. A cached feed snapshot must not
initialize a mounted reel controller while its current snapshot is loading. Feed snapshots reload
on mount, with focus and reconnect refetch off, because the Focus owner handles foregrounding
explicitly.

## Device scenarios (Maestro)

Flows in `apps/mobile/.maestro`: `archived-progress-continue`, `-start-fresh`, `-delete`, and
`-restart` (cold launch); `app-data-reset-confirmation`; `progress-backup-transfer`;
`lesson-section-references`; `focus-resume`; and `discover-hold-to-focus`. They use the versioned
test deck and a checked-in backup fixture, so no audio generation is needed.

Maestro needs an installed APK with embedded JavaScript, such as a local release build or an EAS
preview. A debug APK needs Metro, and the Android export check produces no APK. Install the
[Maestro CLI](https://maestro.mobile.dev), put it on `PATH`, and run from the root:

```powershell
$env:MAESTRO_CLI_NO_ANALYTICS = '1'
./apps/mobile/scripts/run-maestro.ps1 -ApkPath C:\path\to\flashcard-reels.apk
```

The runner boots the emulator (`android-machine.ps1 -Action Ready`), installs the APK, copies the
fixtures to Downloads, and runs each flow with cleared app state. Leave out `-ApkPath` when the
current APK is already installed. It leaves the emulator running. The picker step taps the
emulator's Downloads drawer at `30%, 27%`; adjust it if the picker layout changes.

**Local release APK on the owner's machine.** `apps/mobile/android` is generated and ignored. The
default Cyrillic user path breaks Prefab and long repository paths break Ninja, so Gradle uses
`GRADLE_USER_HOME=D:\g`. That folder also holds `gradle.properties` (in-process Kotlin compiler)
and `local-artifacts.gradle` (offline Maven artifacts in `android/.local-maven`). From
`apps/mobile/android`:

```powershell
$env:GRADLE_USER_HOME = 'D:\g'
$env:NODE_ENV = 'production'
.\gradlew.bat app:assembleRelease -x lint -x test -x extractReleaseAnnotations -x generateReleaseLintModel -x generateReleaseLintVitalModel -x lintVitalAnalyzeRelease -x lintVitalReportRelease -x lintVitalRelease --offline --init-script D:\g\local-artifacts.gradle --configure-on-demand --build-cache -PreactNativeArchitectures=x86_64
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`.

## Manual device checklist

Run this on a physical Android device with a current preview APK before a release, and after
changes Maestro doesn't cover. Record the commit and build you tested in the
[specs dashboard](../specs/README.md).

**Install and import**

- [ ] A fresh install shows the demo deck; studying, reveal, rating, and audio work; state survives a restart.
- [ ] Importing a valid `.fcrdeck` from Downloads shows concise success, lists the deck, plays audio, and survives a restart.
- [ ] Importing an invalid package shows a concise error, keeps the app stable, and leaves no partial deck.
- [ ] Versioned fixtures: re-importing v1 is a no-op; v2 updates (removed card gone, history kept, new card new); v1 after v2 is rejected.

**Portal transfer**

- [ ] Sign in, search, open a deck, and check card search and reveal.
- [ ] Send to phone and scan: progress feedback appears and the result matches a file import.
- [ ] An expired or invalid code leaves no partial deck or audio.

**Learner data**

- [ ] Study a deck and remove it: Decks → Archived progress shows it with a size, and it survives a restart while its cards stay out of the feeds.
- [ ] Reinstall it: cards stay paused (including tap and hold on its row) until Continue or Start fresh, and each choice behaves correctly.
- [ ] Deleting an archive makes the next import start fresh. Card and deck resets update or remove archives.
- [ ] Export a backup after rating in both feeds: the file has the latest ratings, and study resumes with a fresh session.
- [ ] Reset, then import: the preview shows both counts, and installed decks resume immediately. The safety copy can be shared. A damaged file changes nothing.
- [ ] A backup with a deck absent from the device lands in Archived progress; installing the deck offers Continue or Start fresh.
- [ ] Round trip: export on install A, import on a clean install B with the same deck, and check the deck count, review counts, due state, and one resumed card. Re-importing is a no-op.

**Study, gestures, and presentation**

- [ ] Dark, light, and device modes work. Vertical card paging and horizontal destination paging don't conflict.
- [ ] Discover → Focus → Reading: the header underline follows the swipe, isn't tappable, and is gone on Reading. Study stays active on both feeds.
- [ ] Holding a Discover card enters Focus with the revealed side and rating carried over once.
- [ ] After Focus sits in the background for more than five minutes, resuming opens a new session without replayed handoff state.
- [ ] The study island works left, right, and bottom. Sheets (deck details, theme, preferences, reset) present and dismiss correctly.
- [ ] 30+ reels in Discover and in Focus: no end and no same-card flicker at window boundaries. Fast rating and swiping keeps ratings correct.
- [ ] A deck imported while Discover is open shows its cards without a restart.
- [ ] A card with a lesson section opens it from the answer and from the Reading button, highlighting only that section. Cards without one open at the top.
- [ ] Resetting a deck makes its cards new; resetting everything keeps the decks.
- [ ] App permissions don't include the microphone.
