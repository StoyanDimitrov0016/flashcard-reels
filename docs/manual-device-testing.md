# Android manual device checklist

Use a preview APK and a physical Android device. Mark each item after verifying it.

## Fresh install

- [ ] Install a fresh APK and launch Flashcard Reels.
- [ ] Confirm the built-in demo deck appears in Library.
- [ ] Study demo cards, including reveal/rating behavior.
- [ ] Play a demo card with audio and confirm it is audible.
- [ ] Close and reopen the app; confirm the demo deck and learner state persist.

## External deck import

- [ ] Place a valid `.fcrdeck` file in Android Downloads.
- [ ] In Library, tap Import and select the file.
- [ ] Confirm concise success feedback appears and the deck is listed.
- [ ] Study imported cards and verify audio where present.
- [ ] Restart the app; confirm the imported deck and learner state remain.

## Web portal QR transfer

- [ ] Sign in to the internal [web deck portal](https://flashcard-reels.vercel.app/).
- [ ] Search for a deck, open its details, and verify card search and reveal/hide behavior.
- [ ] Show the deck's phone-transfer QR code.
- [ ] In the app, choose Library → Import → Scan QR code and grant camera access.
- [ ] Scan the QR code; confirm the app reports download/import progress and concise success feedback.
- [ ] Confirm the imported deck, audio, version, and learner-history behavior match a local-file import.
- [ ] Retry with an expired or invalid code; confirm no partial deck or permanent audio is left behind.

## Version behavior

Use `data/test-decks/versioned/v1/deck.json` and `v2/deck.json` with the test-deck generator.

- [ ] Import v1 again; confirm already-current/no-op feedback and unchanged content.
- [ ] Import v2; confirm updated feedback and updated content.
- [ ] Confirm the removed card no longer appears, existing history remains, and the new card is new.
- [ ] Attempt v1 after v2; confirm lower-version rejection and no content change.

## Invalid package

- [ ] Try to import a deliberately invalid `.fcrdeck` file.
- [ ] Confirm concise invalid-package feedback, app stability, and no partial deck in Library.

## Phase 0 runtime stabilization smoke sequence

- [ ] Launch in both dark and light/device theme.
- [ ] Vertically page cards and horizontally page all five primary tabs; confirm the gestures do not conflict.
- [ ] Hold a Discover card to enter Focus and confirm the revealed side and selected rating carry over once.
- [ ] Background Focus past its inactivity timeout, resume, and confirm it opens the replacement session without replaying handoff state.
- [ ] Verify the Study Island in left, right, and bottom layouts.
- [ ] Open deck details, appearance, preferences, and reset flows and confirm their native bottom sheets present and dismiss correctly.
- [ ] Import a new deck after opening Discovery, return to Discovery, and keep swiping until cards from the imported deck appear without an app restart.
- [ ] Swipe through at least 30 reels in Discover and confirm there is no finite ending.
- [ ] Swipe through at least 30 reels in Focus and watch for same-card flicker at materialization boundaries.
- [ ] Rapidly rate and swipe several cards; verify explicit ratings remain visible and correct.
- [ ] Reset a deck and confirm its cards behave as new learning state.
- [ ] Reset all learning progress and confirm installed decks remain.
- [ ] Inspect Android app permissions and confirm microphone permission is absent.
