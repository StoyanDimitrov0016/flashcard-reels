# Stable lesson section identities and development catalog

Implemented on `feat/stable-sections-and-dev-catalog`, based on `develop`; phone acceptance is pending. This supersedes the heading-path identity
decision in [the original spec](../specs/4-lesson-section-references.md). The original review remains
a historical account of schema 2.

The owner confirmed that this iteration keeps the implemented UUID-comment representation for
phone review. A structured lesson document with editor-managed identities is a future improvement,
not part of this branch. The bundled offline demo remains versioned; curated content does not.
The branch remains local and must not be pushed during this review.

Schema 3 stores a permanent UUID in an HTML comment before each section heading. The shared parser
consumes markers without rendering them and derives ranges and hierarchy from heading depths.
Renaming, moving, or reordering sections preserves their destinations when markers move with headings.
UUIDs are scoped to a lesson. A section moved to another lesson needs updated card lesson references.
Removing a referenced section rejects installation. Substantially different explanations need new IDs.

Validation rejects missing markers, duplicates, malformed markers, and markers followed by ordinary
content or the document end. It validates every schema 3 lesson, including lessons with no linked cards.
The repeated opening lesson title can remain unmarked. Schema 1 and 2 packages remain readable.

The demo is schema 3 revision 3; the seven curated authoring decks are schema 3 revision 4.
The curated revision follows the revision 3 audio updates pulled from origin/develop. Existing deck, card, lesson,
and author IDs remain intact. Demo card paths were resolved against the original content and replaced
with UUIDs; shared destinations still share an ID. Curated content is stored in R2; local authoring
copies and the old combined technical library are excluded from Git.
The bundled registry and package carry demo revision 3, so startup installs the update through the
normal installer and preserves existing card progress. No database schema change or reset is required.

R2 publication requires an explicit environment: `dev` selects `dev/decks/`, and `prod` selects the
existing `decks/`. Listing, comparison, existing-key reuse, and upload are scoped to the selected
prefix. New development objects do not enter the deployed portal's production listing. Next.js now uses server-only `DECK_PREFIX` to select the catalog for listing, reads, and downloads.
Vercel environment configuration remains a deployment step: Production uses `decks/`, Preview uses
`dev/decks/`.

Seven curated schema 3 revision 4 packages were uploaded under `dev/decks/`. Their audio was copied
from the existing production packages, including the 50 Foundations recordings. Production keys
were not written. The demo remains a local bundled package at revision 3.

## Validation

- Mobile and shared contract formatting, lint, and TypeScript checks pass.
- Contract tests cover permanent destinations, legacy paths, heading moves and duplicate reordering,
  marker validation, and fenced-code examples. Portal deck-library tests pass.
- The real SQLite installer scenario retains the stored card destination and review count after
  renaming its heading in a higher revision, then rejects an invalid update without replacing state.
- Authoring conversion resolves duplicate paths and shared links while preserving IDs; a second
  conversion leaves the stored UUIDs and revision intact.
- Bundled-package checks and Android JavaScript/assets export pass. Device acceptance remains pending.
- The pulled lockfile was installed with `npm ci --ignore-scripts`; better-sqlite3's bundled prebuilt
  binary was checked directly and used by the integration tests. Normal `npm ci` attempted an
  unnecessary native rebuild and failed to locate Python.
- Two gaps in the pulled test setup were corrected: the navigation-bar native component mock and
  the explicit installer-writer allowlist entry for `recreate-r2-decks.mjs`.
- The latest full validation run passed formatting, lint, and TypeScript checks; 493 mobile tests,
  33 contract tests, and 44 web tests passed. The migration scenario exceeded its five-second
  timeout while launching four Node processes alongside the parallel suites and Android export.
  Its timeout is now 30 seconds; that adjustment has not been rerun. The earlier full test run
  passed all 494 mobile tests. Android export passed separately.

## Phone acceptance

Run the updated development app and open the bundled demo. If the demo was deleted, import its
package from `apps/mobile/assets/decks/7f6f98a7-a84d-4cc8-b744-3d0b53e3c873.fcrdeck`.

- Open “What is vertical scaling?” through both the answer and reading button. Check its section.
- Open “Can more CPU cores fix every bottleneck?” and check it targets the same section.
- Open “What limits vertical scaling?” and check its nested section and marker boundaries.
- Check undefined and null destinations, then open a lesson normally from the lesson list.
- Restart the app and check destinations, existing review counts, and audio again.

The production APK cannot read schema 3 packages. Use the updated development app for this review.

## Review before branch publication

Marker parse failures are typed contract errors with source lines. Package validation catches only
these expected parse failures, retains their cause and lesson context, and lets unexpected failures
propagate. Schema requirements are validated directly instead of being thrown and caught as generic
errors. Every lesson is checked, including legacy manifests that contain no linked cards.

Authoring conversion uses shared parser heading source positions. Its filesystem transaction stores
a complete durable journal before replacing content. An interrupted run resumes with the same IDs
and revision; changed author files are rejected before further writes. This is a recoverable developer
tool operation, not a guarantee that a simultaneous publisher sees an atomic multi-file snapshot.

The portal prefix is validated once per storage instance. Listing is scoped to it, and reads/signing
reject foreign keys before contacting R2. No environment-specific inference or bucket permission
claim is made. Existing production deployments retain the compatibility default.
