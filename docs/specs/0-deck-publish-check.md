# 0 - Deck publish check

Status: implemented. See [deck packages](../deck-packages.md#publishing) for usage.

## Problem and value

Decks are written with AI in the repository, generated as `.fcrdeck` packages, and uploaded to
R2 with `npm run r2:push-decks`. Nothing currently compares a new package with the one already
published. An edit can silently change a card ID, which resets the learner's progress on that
card. An edit can also keep the old version number. The app treats a re-import of the same
version as a no-op, so installed decks never receive the change. Either mistake is easy to make
when an agent rewrites a deck, and it is invisible until progress is lost.

The publish check protects the stable deck and card identities that learning history depends
on. It serves roadmap item 2 (updating a publication without losing learner progress) and must be
in place before lessons and card-to-lesson links cause widespread deck edits.

## Functional requirements

1. Before any upload, the check compares every package being published with the version
   currently on R2, matching decks by deck ID.
2. The check blocks the whole publish when:
   - a deck's content changed but its version did not increase;
   - a deck's version is lower than the published version;
   - a published deck appears under a different file name;
   - a card ID or lesson ID also appears in a different deck. This covers the packages being
     published and the published versions they replace.
3. The check warns and requires explicit approval when:
   - a card was removed and a new card with an identical question or answer was added, which
     suggests an accidental ID change;
   - a new deck ID has the same title as a published deck, which suggests an accidental deck ID
     change.
4. For each deck, the check reports the old and new version and lists added, changed, and
   removed cards. Once lessons exist, it reports lessons the same way. Changed cards are listed
   so the owner can confirm that each one still teaches the same thing. A substantially
   different card needs a new ID.
5. A deck that is not yet on R2 is reported as new, with all its cards added.
6. Unchanged decks are reported as unchanged and are not uploaded.
7. Uploading requires the owner's confirmation after reading the report. A dry run prints the
   report and uploads nothing.

## Non-functional requirements

- **Data safety:** the check fails closed. When R2 cannot be read, or a published package cannot
  be parsed, nothing is uploaded.
- **Agent safety:** an agent may run the check and show the report, but it must never confirm an
  upload on the owner's behalf.
- **Comparison by content:** the check compares decoded deck content and audio, not archive bytes,
  so repackaging an unchanged deck is reported as unchanged.

## Out of scope

- Generating the web catalog from published packages. The web catalog is still maintained by hand
  in `apps/web/src/lib/deck-catalog.ts`; this is a candidate follow-up.
- Telling installed apps that an update exists.
- Any change to the mobile installer, which already preserves history across versions.
- Fuzzy detection of near-identical cards. Only identical question or answer text is detected.

## Hard-to-reverse decisions

None. This is tooling, and its rules put the existing identity policy from
[deck packages](../deck-packages.md) into practice. The rules can be adjusted later.

## Acceptance

1. Publishing unchanged decks reports every deck as unchanged and uploads nothing.
2. Editing one answer without raising the version blocks that deck and names it.
3. Editing one answer and raising the version lists that card as changed and uploads only after
   confirmation.
4. Giving an existing card a new ID while keeping its question produces a warning that names the
   card.
5. Lowering a version blocks that deck.
6. When R2 is unreachable, nothing is uploaded.
7. Automated tests cover the comparison rules with local fixture packages.

## Time budget

Proposed: two to three evenings. Owner to confirm.

## Open questions

None.
