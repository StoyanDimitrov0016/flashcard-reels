# Web app guide

This workspace is the deck catalog and phone-transfer portal. It may add
distribution and convenience, but the mobile learning experience must not depend
on this service being available.

## Product and data boundaries

- The portal owns deck discovery, inspection, download resolution, QR transfer,
  and related publishing/distribution surfaces. It does not own mobile learner
  progress or FSRS state.
- Decks remain portable `.fcrdeck` files. The catalog is a discovery and
  distribution layer, not the canonical container for learning content.
- Permanent links and QR codes should resolve stable deck identities. Temporary
  transfer URLs and R2 presigned URLs are delivery details and must remain
  short-lived.
- R2 stays private. Passwords, session secrets, R2 credentials, and transfer
  signing secrets are server-only and must never cross into client bundles or
  `NEXT_PUBLIC_*` variables.
- Do not introduce accounts, learner sync, marketplace/social machinery, or other
  product systems merely to anticipate possible future phases.

## Architecture

- Keep route handlers, pages, and layouts in `src/app`; reusable UI belongs in
  `src/components`, and server/data helpers belong in `src/lib`.
- Keep authorization checks close to sensitive server operations even when a
  broader proxy/middleware layer also protects the portal.
- Reuse `@flashcard-reels/design-tokens` for shared visual identity rather than
  copying token definitions into this workspace.
- Treat `next-env.d.ts` and `.next/` as generated output.
- Preserve the transfer chain: authenticated catalog action -> short-lived signed
  transfer route -> private R2 presigned download. Do not expose permanent bucket
  URLs or credentials to the browser.

## Testing

- Prefer unit tests for token/origin/validation policies and server-boundary tests
  for authentication, transfer resolution, and R2-facing behavior.
- Keep server-only guarantees testable; avoid tests that merely duplicate static
  implementation details.
