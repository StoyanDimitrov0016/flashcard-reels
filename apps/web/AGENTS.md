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

- This is Next.js 16. Its APIs differ from older releases; read the bundled docs
  in `node_modules/next/dist/docs` before relying on remembered behavior.
- `src/app` holds routes. `(auth)` contains sign-in and `(portal)` contains the
  signed-in pages under the shared header. Components and actions used by one
  route live next to it in private `_components` folders or `actions.ts`.
- `src/server` is server-only (`import "server-only"`): environment, auth,
  deck storage and package reading, and transfer tokens. Client code must not
  import it, except for `import type`.
- `src/components` holds shared UI, with primitives in `src/components/ui`.
  `src/lib` and `src/hooks` must stay safe to run in the browser.
- Pages read decks on the server through `getDeckLibrary()`. The browser only
  calls Route Handlers for actions that start from the UI, such as creating a
  transfer link, through TanStack Query and `requestJson` with a Zod schema.
- Forms use React Hook Form with `zodResolver`, and the server action checks the
  same schema again.
- `typedRoutes` is on. Write hrefs as literals. Use `runtimeRoute()` only for
  paths assembled at runtime.
- Every route segment that loads data has `loading.tsx`. Pages that can fail
  have `error.tsx` or `not-found.tsx`.
- Keep authorization checks close to sensitive server operations even when a
  broader proxy/middleware layer also protects the portal.
- Reuse `@flashcard-reels/design-tokens` for shared visual identity rather than
  copying token definitions into this workspace.
- Treat `next-env.d.ts` and `.next/` as generated output.
- Preserve the transfer chain: authenticated catalog action -> short-lived signed
  transfer route -> private R2 presigned download. Do not expose permanent bucket
  URLs or credentials to the browser.
- Read deck packages by byte range. The deck library reads the manifest, cards,
  and lessons from a `.fcrdeck` without downloading its audio.

## Testing

- Prefer unit tests for token/origin/validation policies and server-boundary tests
  for authentication, transfer resolution, and R2-facing behavior. Test the deck
  library against in-memory storage rather than mocking R2 calls.
- Keep server-only guarantees testable; avoid tests that merely duplicate static
  implementation details.
