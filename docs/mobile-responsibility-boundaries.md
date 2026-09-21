# Mobile responsibility boundaries

This document describes the intended dependency direction for the mobile app.
The deterministic import restrictions cover the stable alias-based boundaries;
the remaining conventions belong in [Codebase Preferences](codebase-preferences.md)
and review.

## Dependency matrix

| Source                      | May depend on                                                               | Must not depend on                                                                        |
| --------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `domain`                    | Domain code and framework-neutral shared code                               | Application, infrastructure, presentation, React, React Native, Expo, SQLite, and Drizzle |
| `application`               | Application code, domain code, contracts, and framework-neutral shared code | Infrastructure, presentation, React, React Native, Expo, SQLite, and Drizzle              |
| `infrastructure`            | Infrastructure, application ports, domain code, and contracts               | Presentation                                                                              |
| `presentation/controllers`  | Application APIs, domain types, presentation code, and feature dependencies | Infrastructure implementations and persistence packages                                   |
| `presentation/dependencies` | The global application container and application APIs                       | Other infrastructure implementations and persistence packages                             |
| Other `presentation` code   | Presentation code and domain types                                          | Application APIs, infrastructure, the global container, and persistence packages          |
| `app/_layout.tsx`           | All layers required to compose the application                              | Nothing; this is the composition root                                                     |
| Other `app` routes          | Presentation APIs and domain types                                          | Application APIs, infrastructure, the global container, and persistence packages          |

Feature-root imports such as `@/features/learning-engine` should name an
explicit layer because a root barrel can mix several responsibility layers.

Shared code is feature-agnostic. It may depend only on shared modules plus
packages allowed by its responsibility layer; feature-specific types and
behavior belong in the owning feature.

Presentation dependencies may access the global container only through
`@/infrastructure/app-services`. The Oxlint restriction enumerates the other
current root-infrastructure paths because its regex engine does not support a
portable negative lookaround exception. Add a new root infrastructure path to
that restriction if one is introduced.

The Oxlint restrictions match literal import specifiers. The current source
uses `@/` aliases for cross-layer imports, so those edges are covered. Relative
cross-layer imports and non-literal dynamic imports require review or a focused
architecture test; do not assume the import rule resolves them.
