# Web app guide

This workspace owns the Next.js App Router portal and its Vercel deployment.
Run normal development commands from this directory using its local scripts. Use
root scripts only when repository-wide orchestration or validation is required.

## Boundaries

- Keep route handlers, pages, and layouts in `src/app`; reusable UI belongs in
  `src/components`, and server/data helpers belong in `src/lib`.
- Keep passwords, session secrets, R2 credentials, and token signing code
  server-only. Never expose them through `NEXT_PUBLIC_*` variables or client
  modules.
- Reuse `@flashcard-reels/design-tokens` for shared visual values rather than
  copying token definitions into this workspace.
- Treat `next-env.d.ts` and `.next/` as generated output. Do not edit them.

## Validation

Use `npm run check` and `npm test` from this directory for ordinary changes.
The web lint and typecheck commands intentionally run `next typegen` first; preserve
that ordering. Run `npm run build` here after routing, server/client boundary,
environment, or deployment-related changes.
