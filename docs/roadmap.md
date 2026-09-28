# Roadmap

Where Flashcard Reels is going, phase by phase. The [principles](principles.md) hold throughout.

## Phase 0: daily use without data loss

One learner, the owner, studies daily on an Android phone from a release APK and never loses
progress. The requirements, gap list, and closing checks are in
[functional requirements](functional-requirements.md).

### Branches

Phase 0 work integrates on a `phase-0` branch. `main` stays the last stable state, because the
portal deploys from it and the README links its APK. Each step below is one or more branches
named `p0/<topic>`, merged into `phase-0` through a pull request, which runs CI. `phase-0`
merges into `main` once, when the closing checks pass. Branches cannot be named `phase-0/...`,
because Git cannot hold both `phase-0` and `phase-0/<topic>`.

### Order of work

1. **Deck packages, schema 1** (`feat/curated-deck-packages-v1`, merged). Closes G2 and
   the lesson-level half of G1.
2. **Docs** (committed on `phase-0`). The principles, requirements, roadmap, and consolidated docs, with
   `deck-packages.md` updated to schema 1.
3. **Migration baseline** (done on `phase-0`). The migrations are squashed into one `0000`
   baseline, and the database file is `flashcard-reels-v3.db`.
4. **R2 catalog cutover** (G6). Remove the old-format packages and publish the schema 1 decks.
5. **Presentation foundation** (`p0/presentation-foundation`). Bring every existing screen and
   component in line with [codebase preferences](codebase-preferences.md) §14–16. It is done
   when:
   - a written inventory lists every hard-coded color, size, and font value, every style block
     copied between screens, and every component that loads data or holds business rules;
   - each inventory item is fixed or rejected with a reason;
   - the "You can see it when" checks of §14–16 pass for every file in
     `apps/mobile/src/**/presentation` and `apps/mobile/src/app`.
6. **Specs** (`p0/specs`) for G3 and G5, then for the section half of G1. They hold the
   decisions that are hard to reverse: new learning data, the backup format, section IDs in the
   deck format, and the Decks and Reading layouts.
7. **Build in scoped tasks:** G3 with G5, then G1 sections, then G4. Each task ends with a
   review.
8. **Code review (Q3)** of the modules step 7 did not rebuild, such as the learning engine,
   deck installer, backups, and audio. Done when each has a review note and passes the Q3
   checks.
9. **Content (Q2).** Update the daily decks with section links once G1 fixes the format.
10. **Release checks (Q4, Q5)** on the final release APK, then merge `phase-0` into `main`.

## Phase 0.1

Worth doing after the Phase 0 gaps close. These do not block Phase 0.

- **Device voice.** Listen to the same 20 cards on the phone with the device's built-in
  text-to-speech and with `audiofier-tts`. If the owner prefers the device voice or cannot tell
  them apart, decks drop audio files and become much smaller.
- **Scheduled backups (experiment).** The app writes a backup on a regular schedule to a folder
  the learner picks. Still local-first. Try it before deciding whether it stays.

## Phase 1 candidates

Larger steps once Phase 0 is closed and the app is in daily use. Real use decides the order.

- **Portal accounts and deck authorship.** Sign-in with Clerk instead of the shared password,
  with decks owned by their author. This matters once there is more than one author or learner;
  for one owner, the shared password already keeps decks private.

## Future ideas

Not planned. Nothing here is built just to have it.

- **"You're all caught up" card.** Like Instagram's marker: a card in the feed says the day's
  study is done, and the learner can keep scrolling. It would need the day's rated cards and a
  daily time goal, which needs onboarding that asks how much time the learner wants to spend.
  Wait until it is clear this is useful.
- **Tutorial decks.** Several small bundled decks that teach the app through its own cards,
  such as "double-tap to reveal" or "hold to focus". Useful once other people use the app.

Earlier specs cite numbered roadmap items from notes that were never committed. This roadmap
does not number its items.
