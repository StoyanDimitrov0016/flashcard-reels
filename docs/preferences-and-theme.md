# Preferences and theme

Flashcard Reels owns one persisted AppPreferences value:

- appearance: light, dark, or device
- recollectionIslandPosition: left, bottom, or right
- ratingDirection: forward or reverse
- audioSide: primary or opposite
- audioEnabled and hapticsEnabled

Defaults are Device appearance, a right-side island, forward ratings, primary audio placement, and enabled audio/haptics.

## Persistence

Preferences are stored as one JSON value under flashcard-reels.preferences.v1 through PreferencesRepository. The Expo SQLite key-value adapter is the only storage import. Zod validates stored values; missing or invalid values are merged with the defaults to produce a complete model. Provider writes are serialized so rapid changes preserve the newest complete preference value.

## Appearance and themes

appearance: "light" and "dark" always resolve to that scheme. appearance: "device" follows React Native's current useColorScheme() value and updates when the device scheme changes.

The semantic color contract lives in src/shared/presentation/theme-colors.ts, with separate light and dark palettes. useAppTheme() is the presentation access point. Root navigation, tabs, generic app surfaces, status-bar content, loading/error states, settings, sheets, and toasts use the same resolved scheme. Deck appearance colors remain deck-content data and are intentionally independent.

The Expo configuration uses automatic interface style and light/dark splash backgrounds.

## Study controls

The preference model stores semantic intent only. Presentation derives the actual layout:

- Left and Right islands are vertical; Bottom is horizontal.
- Forward means Again → Hard → Good → Easy in the visual direction.
- Reverse flips that order while keeping the accessible meanings unchanged.
- Bottom audio is Left for Primary and Right for Opposite.
- Left or Right audio is Above for Primary and Below for Opposite.

StudyControlCluster applies those rules to the real ReelCard. The You screen's Study Controls sheet uses a schematic preview of the same relationships.

Audio is a UI-availability preference. Disabling it hides the answer audio control without removing installed audio or changing the audio service.

## Haptics

All app haptics pass through the preference-aware policy and shared native adapter. Feedback is limited to rating selection, successful Hold-to-Focus completion, and successful global learning reset. Navigation, audio playback, modal opening, searching, and ordinary preference-row taps do not add haptics. Disabling haptics makes each of the three events a no-op.

## Hold-to-Focus

Discover's existing 150 ms feedback delay and 900 ms long-press threshold are preserved. The hold feedback is a global themed top toast placed below the safe-area inset. Cancellation hides it. Successful completion briefly shows Focused on this deck, emits the Focus haptic once when enabled, and navigates to Focus. Focus cards do not expose this interaction.

## Learning data ownership

Global Reset all learning progress lives in You. It uses the existing learner-profile reset service and confirmation sheet, refreshes Progress after success, keeps installed deck content, and emits the reset-success haptic. Progress retains deck-specific reset controls.
