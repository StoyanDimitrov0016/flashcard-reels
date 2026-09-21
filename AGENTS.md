# Repository guide

Flashcard Reels is a local-first learning app that brings the fluid,
low-friction experience of modern social media to serious study. It combines
spaced repetition with a feed built around flashcards, so studying feels easy to
start and natural to continue.

Flashcard Reels is an npm-workspaces Turborepo.

## Repository structure

- `apps/mobile` - Expo / React Native app.
- `apps/web` - Next.js internal portal.
- `packages/design-tokens` - framework-neutral shared package.

## Working conventions

Before making changes, inspect the relevant existing implementation and nearby
patterns.

Prefer established repository patterns over introducing a new pattern when an
existing one already fits.

## Commands

Run repository-wide validation from the repository root:

```bash
npm run check
npm test
npm run check:dead-code
npm run build
npm run verify
```

For app-local work, prefer the workspace's own commands such as:

```bash
npm run check
npm test
npm run lint
```

Do not run unrelated workspace validation for routine app-local changes.

## Configuration ownership

- `.oxlintrc.json` and `.oxfmtrc.json` own repository-wide lint and formatting
  policy.
- `tsconfig.base.json` owns shared TypeScript strictness.
- Workspace TypeScript and framework configuration stays local to each app.
- `turbo.json` owns task dependencies and caching.
- `knip.json` owns dead-code policy.
