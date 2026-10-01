# Part 3 — import robustness

Branch: `fix/deck-import-robustness`.

| Signal                                               | Before | After |
| ---------------------------------------------------- | -----: | ----: |
| HTTP failure categories                              |      1 |     3 |
| Retry requiring another scan for transient downloads |      1 |     0 |
| Interrupted import file types cleaned at startup     |      0 |     2 |
| Same-revision bundled appearance repair paths        |      0 |     1 |
| Content writers sharing the per-deck queue           |      1 |     2 |

Tests first reproduced the HTTP categorization failures, missing startup cleanup, missing bundled
appearance after an interrupted install, delayed delete cleanup removing newly installed audio,
and retry requiring another barcode. Tests now cover both native HTTP formats, cancellation,
cleanup, same-URL retry, expired-link rescanning, repaired appearance, and retained learner themes.
Installation and deletion scenarios use the real SQLite graph and mock filesystem audio storage.

Validation: mobile check, full tests, and db:check. Migration files remain unchanged.

## Deviations

- Installed Expo iOS `FileSystemDownloadTask.swift:371` reports `server returned HTTP <code>`;
  `FileSystemExceptions.swift:12` prefixes it with `Unable to download a file:`. Android uses
  `HTTP <code>` with the same prefix (`FileSystemDownloadTask.kt:201`, `FileSystemExceptions.kt:18`).
  The matcher supports both DownloadTask formats; it does not use the separate legacy downloader.
- `deck-import-feedback.ts` now uses the shared timeout wording ending in "try again", matching
  the new retry action. Other package-error wording is retained.
- `sqlite-deck-package-installation.transaction.ts` creates a default theme on a fresh install.
  Startup checks for a theme before installation, so that generated default does not displace
  the bundled default or count as a learner choice. Later starts preserve any existing selection.
