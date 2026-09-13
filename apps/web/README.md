# Web

Next.js App Router application intended for Vercel. It uses Tailwind CSS and
shadcn/ui-compatible local components, while visual tokens live in the
framework-neutral `@flashcard-reels/design-tokens` workspace.

## Cloudflare R2

Copy `.env.example` to `.env.local` and configure an R2 S3 API token. Deck files
should use the object key `decks/<deck-id>.fcrdeck`. The server-only R2 module can
create 15-minute presigned GET URLs after the caller has been authenticated and
authorized for the requested deck.

No public download route is exposed yet. Add the product's authentication and
deck-level authorization policy before connecting `createAuthorizedDeckDownload`
to a Route Handler. R2 credentials must remain server-only.
