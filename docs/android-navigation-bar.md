# Android edge-to-edge navigation bar

## Outcome

The mobile app renders behind a transparent Android navigation bar while keeping gesture or
three-button system controls visible. The floating app tab bar consumes the bottom safe-area inset,
but full-screen backgrounds do not. This was visually verified on a physical device in three-button
mode.

## Platform

- Expo managed app with Expo Router; there is no checked-in `android/` project.
- Expo SDK 57, React Native 0.86.3.
- Generated Android configuration uses min SDK 24, target/compile SDK 36, and
  `edgeToEdgeEnabled=true`.

## Implementation

- `apps/mobile/app.config.ts`
  - Configures `expo-navigation-bar` with `{ enforceContrast: false, hidden: false }`.
  - Registers `./plugins/with-transparent-android-navigation-bar.cjs`.
  - Uses EAS owner `flashcard-reels-org` and preserves project ID
    `3420f53b-a597-432c-be5b-cab7114861f8`.
- `apps/mobile/plugins/with-transparent-android-navigation-bar.cjs`
  - Generates the following `MainActivity` window configuration after `onCreate` and again in
    `onResume`:

    ```kotlin
    WindowCompat.setDecorFitsSystemWindows(window, false)
    window.navigationBarColor = Color.TRANSPARENT
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      window.isNavigationBarContrastEnforced = false
    }
    ```

- `apps/mobile/src/app/_layout.tsx`
  - Mounts a root `NavigationBar` with `hidden={false}`.
  - Selects light/dark system-button appearance from the resolved app theme.
  - Does not alter the existing `StatusBar`.
- `expo-navigation-bar` `~57.0.2` is recorded in the mobile package and root lockfile.

The generated `styles.xml` was audited and contains a transparent `navigationBarColor`, visible
navigation controls, and disabled navigation-bar contrast enforcement. No `colors.xml` or
`MainApplication` override was found. Existing screen roots remain full-height; safe-area padding is
limited to interactive content such as `AppTabBar`.

## Build and verification

Expo Go cannot apply the `MainActivity` config plugin. Use an EAS preview build:

```powershell
cd apps/mobile
eas project:info
eas build --platform android --profile preview
```

`eas project:info` should resolve `@flashcard-reels-org/flashcard-reels`. A native prebuild audit,
mobile checks, Android Hermes export, and all 336 tests were completed during implementation. One
resource-sensitive deck-package test can exceed its fixed 10-second limit under full parallel load;
it passes independently.

On recent Android versions, edge-to-edge plus disabled contrast enforcement removes the three-button
scrim. Some OEM builds may still impose their own system-controlled scrim; do not compensate with a
fake bottom background or global safe-area padding.
