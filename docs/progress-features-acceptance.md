# Progress features: acceptance checks

These checks define when archived deck progress and portable progress backups are ready to close.
The behavior and format are described in [archived-progress.md](archived-progress.md) and
[progress-backup.md](progress-backup.md).

## 1. Archived deck progress

- After reviewing a deck, removing its download leaves review events, card summaries, and FSRS
  memory state available in the archive view. Downloaded cards and audio are removed. An unstudied
  deck leaves no archive.
- The archive shows the deck and an estimated progress size. The estimate describes learning data,
  not the exact change in SQLite file size.
- Reinstalling the same deck pauses study until the learner chooses to continue or permanently
  delete saved progress and start fresh. Both choices affect the next review as expected.
- Deleting an archive and resetting all learning progress remove the appropriate durable rows.
  Progress for card IDs absent from a newer deck package is handled consistently.

Evidence: `archived-deck-progress.integration.test.ts` covers the database behavior. The three
`archived-progress-*.yaml` Maestro flows exercise the main Android choices. The last documented
device pass was September 24, 2026; rerun against a release APK built from the current commit.

## 2. Progress backup and transfer

- Export settles active Discover and Focus sessions, including review batches below the usual
  aggregation threshold, and shares a versioned JSON file with all learning progress and no deck
  content, audio, settings, or session state.
- Import rejects damaged, unsupported, oversized, or internally inconsistent files without
  changing existing progress. It previews the replacement and requires confirmation.
- A successful import replaces progress atomically, activates installed decks, archives absent
  decks, and preserves the old local progress as a shareable safety copy. Reimporting the same
  document does not replace progress again. A failed later restore preserves the last successful
  safety copy.
- An exported file from device A can be imported into a clean install on device B. Install the
  matching deck on B, then check the studied deck count, review counts, due state, and one resumed
  card. Reimport that exact file to check the no-op result. This is the real file round trip;
  importing the checked-in fixture alone does not cover it.

Evidence: `progress-backup.integration.test.ts` covers the service, validation, replacement,
rollback, and safety-copy behavior. `progress-backup-transfer.yaml` imports a fixture and opens
the native export share sheet. The real exported-file round trip remains a device acceptance check.

## Final gate

1. Run `npm run check`, `npm test`, and `npm run db:check` in `apps/mobile`.
2. Build the current release APK and rerun all five Maestro flows using
   [maestro-device-run-handoff.md](maestro-device-run-handoff.md).
3. Perform the exported-file round trip above on two clean app installs, or on one device with an
   app-data reset between export and import. Preserve the file outside the app before resetting.

Close the features when all three steps pass and the archive and backup screens are acceptable on
the target device. Record the tested commit and device build with the results.
