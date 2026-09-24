# Web

Internal deck catalog and phone-transfer portal for Flashcard Reels. The
production deployment is [flashcard-reels.vercel.app](https://flashcard-reels.vercel.app/)
and is currently protected by a shared password. It uses Next.js App Router,
Tailwind CSS, and shadcn/ui-compatible local components, while visual tokens
live in the framework-neutral `@flashcard-reels/design-tokens` workspace.

The portal lists every `.fcrdeck` package in storage. It lets you search decks,
browse cards and lessons, download a package, and show a short-lived QR transfer
link for the mobile app. It does not store mobile study progress.

## Routes

| Route                                     | Access                    | Purpose                                     |
| ----------------------------------------- | ------------------------- | ------------------------------------------- |
| `/login`                                  | Public                    | Shared-password sign-in                     |
| `/`                                       | Session                   | Deck catalog, filtered by `?q=`             |
| `/decks/<deck-id>`                        | Session                   | Cards (`?card=`, `?q=`) and `?view=lessons` |
| `/decks/<deck-id>/download`               | Session                   | Downloads the `.fcrdeck` package            |
| `POST /api/decks/<deck-id>/transfer-link` | Session                   | Creates the QR transfer link                |
| `/t/<token>`                              | Signed token (10 minutes) | Phone download                              |

## Internal access

Copy `.env.example` to `.env.local`. Set `INTERNAL_APP_PASSWORD` to the shared
password and set `AUTH_SESSION_SECRET` to a separate, random secret. Successful
login creates a signed, HTTP-only, same-site session cookie that expires after 12
hours. The proxy protects pages and API routes; sensitive Route Handlers also
verify the session directly.

Set the same variables in the Vercel project's environment settings. Never use a
`NEXT_PUBLIC_` prefix for passwords, signing secrets, or R2 credentials.

`DECK_TRANSFER_ORIGIN` is optional. Leave it unset on Vercel to derive the HTTPS
origin from the request. A blank value is also treated as unset. Use an override
only for a deliberate fixed public URL or private-network development host; public
plain-HTTP origins fail validation.

## Deck storage

Configure an R2 S3 API token with access to the deck bucket. Every object under
`decks/` whose name ends in `.fcrdeck` appears in the catalog; the deck ID comes
from the package manifest. The portal reads each package's manifest, cards, and
lessons by byte range, so audio is never downloaded to render a page. The list
of decks is refreshed every minute, and a package is read again after it is
re-uploaded. A package that fails validation is skipped and logged.

The transfer route verifies its signed token and redirects the phone to a
private, 15-minute presigned R2 URL. R2 credentials remain server-only.

For local development without R2, set `LOCAL_DECKS_DIR` to a folder of
`.fcrdeck` files. It is ignored in production builds. Generate packages with
`npm run decks:generate -w @flashcard-reels/mobile`.

Run `npm test -w @flashcard-reels/web` from the repository root to exercise the
deck library, authentication, transfer-token, origin-validation, and server-only
boundary tests. For the complete user workflow and Vercel setup, see
[../../docs/web-portal.md](../../docs/web-portal.md).
