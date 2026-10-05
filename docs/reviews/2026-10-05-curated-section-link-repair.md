# Curated card section links

The owner found that System Design card 34/112 opened its lesson without highlighting its
section. The schema 4 revision 5 development packages contained null card section references.
The reader, reading button, and installation path carried the reference correctly; the package
data provided no destination.

The schema 3 R2 predecessors also lacked those links. Conversion preserved that omission, while
the saved develop authoring changes contained the intended schema 2 heading-path destinations.
The original implementation failed to reconcile these sources before publishing.

## Repair

Recover the authored card destinations from stash `1c4159f9ec9dda7a3669d05a245169f4620f157f`.
Use the historical parser from develop to resolve each heading path against the original lesson,
then map the ordered heading to its existing schema 4 section UUID. Check heading titles and
section counts exactly; reject unresolved references rather than guessing destinations.

Publish schema 4 revision 6 to the seven existing `dev/decks/` keys. Preserve card, lesson,
section, deck, and author IDs, questions, answers, lesson text, section order, and audio. Change
only the restored card destinations, changed card timestamps, deck timestamp, and revision.
Store revision 5 backups locally, compare every remote predecessor before writing, use conditional
ETag writes, and download every result to verify its hash and parsed references.

| Deck                           | Restored section links | Cards |
| ------------------------------ | ---------------------: | ----: |
| React                          |                    117 |   117 |
| Operating Systems and Hardware |                    109 |   109 |
| System Design                  |                    112 |   112 |
| JavaScript                     |                    116 |   116 |
| System Design Foundations      |                     49 |    50 |
| Databases                      |                    111 |   111 |
| Computer Science               |                    109 |   109 |

The Foundations card “What is a cache?” retains its authored null destination: its explanation
is the Caching lesson intro. It opens at the lesson start. All other authored destinations resolve.

System Design card 34, “What is cache invalidation?” (`858111b8-cadc-4889-a2ba-38d4c6cf8d12`),
references lesson `2a196588-0f9e-4f76-8432-4b336209c301`. Its verified destination is the
**Caching → Cache invalidation** section (`94bd3a35-ded2-4617-aa77-3390ca6ebefe`).

## Validation and phone acceptance

All seven candidate packages round-trip through the public contract. Each restored reference
resolves inside its card's lesson, and lesson content and audio equal revision 5. The reader,
reading-button navigation, and real SQLite installation suites pass (49 tests).

Refresh the portal and import the deck again into the phone. Revision 6 updates the existing
deck while stable card IDs retain learning history. Open System Design card 34 from its back
reading button: the sheet should position to Cache invalidation and show the accent border
across that section. Actual native positioning and highlighting remain a phone acceptance check.
