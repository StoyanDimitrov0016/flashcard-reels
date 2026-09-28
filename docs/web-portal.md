# Web portal

The [internal portal](https://flashcard-reels.vercel.app/) is how decks reach the phone. After
signing in with the shared password, you can search decks, browse cards and lessons, download
a `.fcrdeck`, or show a QR code that sends a deck to the phone. It never stores learning data.

Built with Next.js App Router, Tailwind CSS, and shadcn/ui (Base UI) components. Workspace
conventions are in `apps/web/AGENTS.md`.

## Routes

| Route                                     | Access                   | Purpose                                               |
| ----------------------------------------- | ------------------------ | ----------------------------------------------------- |
| `/login`                                  | Public                   | Shared-password sign-in                               |
| `/`                                       | Session                  | Deck catalog, filtered by `?q=`                       |
| `/decks/<deck-id>`                        | Session                  | Cards (`?card=`, `?q=`) and lessons (`?view=lessons`) |
| `/decks/<deck-id>/download`               | Session                  | Downloads the package                                 |
| `POST /api/decks/<deck-id>/transfer-link` | Session                  | Creates a QR transfer link                            |
| `/t/<token>`                              | Signed token, 10 minutes | Phone download                                        |

Sign-in sets a signed, HTTP-only, same-site session cookie for 12 hours. The proxy protects
pages and API routes, and sensitive route handlers check the session again.

## Deck storage

Every object under `decks/` in the R2 bucket that ends in `.fcrdeck` appears in the catalog.
The deck ID comes from the package. Packages are read by byte range, so rendering a page never
downloads audio. A package that fails validation is skipped and logged.

Each server instance caches parsed summaries and previews in memory: at most 32 entries each,
30 minutes each, with an 8 MiB content budget for previews. The storage listing is reused for
60 seconds, and a re-uploaded package is read again.

## Phone transfer

1. In the portal, open a deck and choose **Send to phone**.
2. In the app, choose **Library → Import → Scan QR code** and scan it.
3. The QR link expires after 10 minutes. The portal redirects the phone to a 15-minute presigned
   R2 URL, and the app installs the package through its normal installer.

The app cancels a download after 60 seconds without new bytes. A slow download that keeps
receiving data can take longer.

## Configuration

Server-only variables, set in Vercel and in `apps/web/.env.local` (see `.env.example`):

```text
INTERNAL_APP_PASSWORD
AUTH_SESSION_SECRET
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
```

Never give them a `NEXT_PUBLIC_` prefix. The Vercel project root is `apps/web`.

- `DECK_TRANSFER_ORIGIN`: leave unset on Vercel, so links use the request's HTTPS origin. Set
  it only for a fixed public URL or a private development host. Public plain HTTP is rejected.
- `LOCAL_DECKS_DIR`: points a development server at a local folder of packages instead of R2.
  Ignored in production.

### Phone testing against a local server

With `DECK_TRANSFER_ORIGIN` unset, the QR code points straight at HTTPS R2 storage, so the
phone does not need to reach the laptop. The code is denser because the presigned URL is long.

For compact codes, set `DECK_TRANSFER_ORIGIN` to an HTTPS tunnel or the laptop's LAN address,
such as `http://192.168.1.20:3000`. Check that the phone's browser can open it first, and
restart the dev server after changing it. Never use `localhost`, which is the phone itself.
The Expo tunnel does not expose the web server.

## Checks

```bash
npm run check -w @flashcard-reels/web
npm test -w @flashcard-reels/web
npm run build -w @flashcard-reels/web
```
