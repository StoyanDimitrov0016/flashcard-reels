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

## Archived deck progress

- [ ] Study an imported deck, remove the deck, then open Controls → Archived progress. Confirm the deck and estimated storage size appear.
- [ ] Restart the app and confirm the archived entry remains while the deck's cards stay out of study feeds.
- [ ] Import the same deck again. Confirm its cards remain paused until choosing Continue or Start fresh, including when tapping or holding its Library row.
- [ ] Choose Continue. Confirm the previous learning state returns and study resumes.
- [ ] Remove and import the deck again, then choose Start fresh. Confirm the previous learning state and review history are cleared.
- [ ] Remove the deck again and delete its entry from Archived progress. Confirm it disappears and a later import starts fresh.
- [ ] Reset one card and then a whole deck from the learning controls. Confirm their archived progress reflects the remaining history or disappears when none remains.

## Invalid package

- [ ] Try to import a deliberately invalid `.fcrdeck` file.
- [ ] Confirm concise invalid-package feedback, app stability, and no partial deck in Library.

## Progress backup and transfer

- [ ] Rate cards in Discover and Focus, then open Controls → Progress backup → Export progress. Save the shared JSON file to device storage. Confirm study resumes with a fresh session and the exported file includes the latest ratings.
- [ ] Reset learning progress, then import that file. Confirm the preview shows the backup and device counts, the confirmation replaces progress, and matching installed decks resume with their imported progress immediately.
- [ ] Confirm the previous local progress backup can be shared after import. Import an invalid or damaged JSON file and confirm existing progress remains unchanged.
- [ ] Import a backup containing a removed deck on a device without that deck. Confirm the progress appears in Archived progress. Install the deck and confirm the existing Continue / Start fresh choice appears.
- [ ] After restoring a backup, return to Discover and Focus and confirm neither uses a stale study session. Check that downloaded decks, audio, appearance, and preferences remain unchanged.

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
