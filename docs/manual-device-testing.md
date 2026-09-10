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

## Version behavior

Use `data/test-decks/versioned/v1/deck.json` and `v2/deck.json` with the test-deck generator.

- [ ] Import v1 again; confirm already-current/no-op feedback and unchanged content.
- [ ] Import v2; confirm updated feedback and updated content.
- [ ] Confirm the removed card no longer appears, existing history remains, and the new card is new.
- [ ] Attempt v1 after v2; confirm lower-version rejection and no content change.

## Invalid package

- [ ] Try to import a deliberately invalid `.fcrdeck` file.
- [ ] Confirm concise invalid-package feedback, app stability, and no partial deck in Library.
