# Web

Next.js App Router application intended for Vercel. It uses Tailwind CSS and
shadcn/ui-compatible local components, while visual tokens live in the
framework-neutral `@flashcard-reels/design-tokens` workspace.

## Internal access

Copy `.env.example` to `.env.local`. Set `INTERNAL_APP_PASSWORD` to the shared
password and set `AUTH_SESSION_SECRET` to a separate, random secret. Successful
login creates a signed, HTTP-only, same-site session cookie that expires after 12
hours. The proxy protects pages and API routes; sensitive Route Handlers also
verify the session directly.

Set the same variables in the Vercel project's environment settings. Never use a
`NEXT_PUBLIC_` prefix for passwords, signing secrets, or R2 credentials.

`DECK_TRANSFER_ORIGIN` is optional. Leave it empty on Vercel to derive the HTTPS
origin from the request. Use an override only for a deliberate public deployment URL
or a private-network development host; public plain-HTTP origins fail validation.

## Cloudflare R2

Configure an R2 S3 API token with access to the deck bucket. Deck files use the
object key `decks/<deck-id>.fcrdeck`. An authenticated request to
`GET /api/decks/<deck-id>/download` returns a compact, signed transfer URL. That
public, short-lived route verifies the token and redirects the app to a private,
15-minute presigned R2 URL. R2 credentials remain server-only.

Run `npm test -w @flashcard-reels/web` from the repository root to exercise the
transfer-token, origin-validation, and server-only boundary tests.
