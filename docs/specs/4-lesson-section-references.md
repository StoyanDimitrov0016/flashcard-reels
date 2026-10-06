# 4 - Lesson section references

Status: superseded by [7 - Lesson sections as entities](7-lesson-sections-as-entities.md); the design below is historical.
The [stable identity review](../reviews/2026-10-05-stable-section-identities.md) supersedes the
generated-reference representation below. It records the explicit UUID markers now used for new
packages; the heading-path design here describes legacy schema 2 behavior.
The owner requested heading-derived segmentation, optional shared destinations, and an expanded
demo on a separate branch. The reference contract remains reviewable before merging to develop.

## Problem and value

A card opens its lesson, but the learner must find the explanation themselves. Opening at a
relevant section lets them reread the topic in context. Several cards can reference the same
section. Authors should write ordinary Markdown without custom anchors or manual segmentation.

## Functional requirements

1. Derive a section tree deterministically from Markdown headings. Each heading begins a section
   that ends before the next heading of equal or smaller depth, or at the document end. A parent
   section includes its child sections. Paragraphs, lists, and code remain in document order.
2. Preserve actual heading depths independently of display typography. Heading-like text inside
   fenced code is not a section. Content before the first heading remains readable introduction
   content; lessons without headings still open normally.
3. Generate references from the parsed structure. No author-supplied Markdown markers are
   required. The same Markdown and parser version must produce identical destinations across
   mobile, web, and authoring tools.
4. Keep lesson references nullable. A section reference is also nullable and requires a lesson.
   Many cards may share a destination. With no section reference, open the lesson at its start.
5. Opening either the card answer or its reading button opens the sheet at the referenced heading.
   Mark the related section with a continuous left border spanning its heading, content, and
   subsections in the deck accent. Stop the border at the section boundary without coloring its background.
   Reading can continue through the rest of the lesson.
   Both the reader and this deck's lesson list use 60% of the app window height. The reading
   progress bar is an overlay at the article bottom, hidden until a finger scroll. It stays visible
   through momentum and disappears one second after scrolling stops, without shifting content.
6. Opening another reference in the same lesson changes the destination. Close, back, and next
   lesson clear the previous reference. Automatic positioning happens once per opening after
   content layout is ready; it does not repeatedly override the learner's scrolling.
7. Validate references against actual lesson content before installation. Errors identify the card,
   lesson, and unresolved destination. Missing references are allowed; supplied invalid ones are
   rejected. Unexpected runtime resolution failure leaves the lesson readable at its start.

## Representation

Use a small document representation with ordered blocks plus a derived section index/tree.
Sections carry a generated reference, heading text and original depth, parent reference, and
block range. Block positions describe the current document; they are not persisted card references.

Generated references use normalized heading paths, for example:

```text
vertical-scaling
vertical-scaling/limitations
horizontal-scaling
horizontal-scaling/limitations
```

The opening level-one heading matching the lesson title acts as the document root, rather than
prefixing every reference. Suppressing that title in the renderer must not change segmentation.

Heading text is taken from parsed visible inline text, normalized with Unicode NFKC, lowercased,
and has runs of non-letter/non-number characters replaced with a hyphen. Leading/trailing hyphens
are removed; an empty result uses `section`. Parent paths are separated with `/`. Repeated sibling
slugs use `~2`, `~3`, and so on in document order. Literal tildes normalize to hyphens, avoiding
collisions between authored text and occurrence suffixes. IDs are scoped to their lesson.

Generated references are not permanent identities: renaming or moving a heading can change its
reference; reordering identical headings can change which occurrence it denotes. Deck revision
review must inspect existing links, including references that still resolve but may mean something
different. Do not silently use fuzzy matching to repair persisted references.

Package schema 2 adds optional nullable `lessonSectionId` beside nullable `lessonId`. A non-null
section requires a lesson. New readers also accept schema 1 packages without section destinations;
old readers cannot consume schema 2 packages. Package generation and inspection validate supplied
destinations against actual lesson Markdown. Portal content loading uses the same validation without
reading audio; catalog summary listing remains a manifest/assets check.

The feature uses the generated Phase 0 baseline with `flashcard-reels-v6.db`. The previous v5
database stays separate. This is development isolation, not a released-user migration strategy.

## Non-functional requirements

- Work offline using packaged content.
- Share segmentation and reference resolution rules outside React and native infrastructure.
  Keep layout measurement, scrolling, and markers in presentation.
- Preserve existing card IDs and learning history when adding or updating references.
- Keep Markdown safety policy: segmentation does not enable HTML execution or remote resources.
- Distinguish package schema version, deck content revision, and segmentation contract changes.
  Define support for current packages before changing the schema.

## Out of scope

Deck Studio, automated semantic matching in the app, external source provenance, exact sentence
selection, reading completion tracking, and manually annotated Markdown anchors.

## Hard-to-reverse decisions

1. Heading-derived sections and the generated-reference algorithm.
2. Package reference fields and compatibility policy.

The experimental choices above are implemented for review on the feature branch; they should be
reviewed alongside phone behavior before merging or publishing schema 2 decks.

## Acceptance

- A scaling fixture has vertical and horizontal sections, nested subsections, and lists. Several
  cards link to vertical scaling; another links to its limitations. Each opens the right start.
- Unchanged headings retain references when prose changes or unrelated uniquely named sibling
  sections are inserted. Test nested and duplicate headings, line endings, code fences, and actual
  heading depth. Do not assert private parser steps or pixel offsets.
- Invalid references fail package validation before installed content or learning history changes.
- Real installation, cold reload, and a deck revision preserve the intended references and study
  state. Nullable references remain valid.
- Maestro checks both entry points, the visible target and start marker, switching destinations
  within one lesson, normal reading without a destination, and returning to the same card.
- An agent reviews and links the demo deck first. Curated-deck annotation is a follow-up. Leave uncertain links
  null instead of inventing relationships. Review actual question/answer and section content.

## Time budget

Not yet agreed. Deliver a demo-deck vertical slice before expanding the linking work to all decks.

## Open questions

- Confirm the marker's appearance and initial position on the phone.
- Decide whether future heading edits should offer explicit link repair in Deck Studio. Generated
  references cannot infer semantic identity after arbitrary content edits.
