# Part 5b: review follow-ups

Branch: `fix/robustness-review-followups`.

Signals: separate bundled first-install appearance writes 2 → 0;
render-time URL-ref reads 1 → 0; unused exports 2 → 0;
incorrect next-step messages 2 → 0. The five earlier reports are formatted.

The transaction test first failed with graphite instead of cyan. Bundled theme
and cover now enter the validated installer and commit with the content. Imported
decks retain their default appearance, and updates retain learner theme selections.
Startup only repairs the bundled cover; no post-transaction theme save is needed.
The QR URL stays in a ref, while state determines the retry label.

Validation: mobile check and 453 tests pass; database check passes. Root dead-code
check, custom lint-rule tests, lint, and typecheck pass. Root check stops at the
owner's local `.vscode/settings.json` formatting, the spec's permitted exception.

## Deviations

- Installer implementation files moved under `decks/deck-installer/internal` on
  the starting branch; changes follow that validated boundary.
- The old missing-theme repair test now protects atomic appearance and cover
  repair, as the approved review explicitly replaces theme repair. Its cyan,
  cover, and learner-selected gold assertions remain.
