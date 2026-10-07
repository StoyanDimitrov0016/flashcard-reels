# Documentation

| Document                        | Answers                                                |
| ------------------------------- | ------------------------------------------------------ |
| [Product](product.md)           | What the app does today.                               |
| [Principles](principles.md)     | The rules that settle trade-offs.                      |
| [Architecture](architecture.md) | How the system fits together and where data lives.     |
| [Decisions](decisions.md)       | Hard-to-reverse choices and why they were made.        |
| [Conventions](conventions.md)   | How code in this repository is written.                |
| [Specs](specs/README.md)        | The dashboard: what is being built, waiting, and done. |

Guides for specific tasks:

- [Development](guides/development.md): set up, run, validate, change the database, build.
- [Decks](guides/decks.md): the `.fcrdeck` format, authoring, audio, and publishing.
- [Web portal](guides/web-portal.md): configuration, phone transfer, and caching.
- [Testing](guides/testing.md): test layers, device scenarios, and the manual checklist.

Rules for agents working in one workspace are in that workspace's `AGENTS.md`.

## Keeping these docs useful

- Describe the system as it is now. History lives in Git, and implementation reports and agent
  handoffs are not committed.
- Each fact lives in one place; link to it from everywhere else.
- Keep each file readable in one sitting. If a doc grows past about 200 lines, split it by what the
  reader is trying to do.
- Change docs in the same commit as the behavior they describe.
