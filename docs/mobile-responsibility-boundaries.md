# Mobile responsibility boundaries

This document is the specification for the mobile architecture lint rules. The
rules provide fast feedback; this document defines the intended dependency
direction independently of their implementation.

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

Feature-root imports such as `@/features/learning-engine` are forbidden because
a root barrel can mix several responsibility layers. Imports must name an
explicit layer.

Shared code is feature-agnostic. It may depend only on shared modules plus
packages allowed by its responsibility layer; feature-specific types and
behavior belong in the owning feature.

## Module-edge coverage

The rules inspect:

- static imports;
- named and wildcard re-exports;
- dynamic imports with literal specifiers;
- CommonJS `require` calls with literal specifiers;
- both `@/` aliases and relative paths.

Non-literal dynamic imports and `require` calls are rejected in classified
mobile source because their dependency direction cannot be proven statically.

## Complexity

The boundary rule classifies the current file once and performs constant work
for every module edge. Relative paths are normalized syntactically; the rule
does not traverse the filesystem or resolve modules. Its runtime is therefore
linear in the number of module edges in the file.

## Adding a new area

New top-level feature areas must be assigned a responsibility before use. Do
not create a new directory name to avoid an existing boundary. Extend this
specification, add valid and invalid rule fixtures, and then update the rule.
