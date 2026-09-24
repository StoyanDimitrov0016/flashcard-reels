# Web deck portal

The [internal web portal](https://flashcard-reels.vercel.app/) is a Next.js catalog for browsing and transferring curated Flashcard Reels decks. It is not a second study client and does not store mobile progress.

After signing in with the shared team password, users can search decks, browse cards and reveal answers, read a deck's lessons, download `.fcrdeck` packages, and display a phone-transfer QR code. The catalog lists every package uploaded under `decks/` in the R2 bucket, so publishing a deck needs no portal change.

## Server cache

Each server instance keeps an in-memory `lru-cache` for parsed deck summaries and previews.
Both caches retain at most 32 entries and automatically remove entries after 30 minutes;
reads update recency but do not extend the TTL. The preview cache also has an 8 MiB budget
measured by the UTF-8 JSON size of its cards, lessons, and metadata. This is a content-size
budget, not an exact JavaScript heap limit. Larger previews are served without being cached.
Audio and complete archive bytes are never retained in these caches.

The storage listing is reused for 60 seconds. Refreshing it removes cached revisions that
were deleted or replaced. Concurrent preview loads share one read, and failed loads can be
retried. All caches are local to the server instance and disappear when it restarts.

## Phone transfer

1. Open a deck in the portal and choose **Send to phone**.
2. In the app, choose **Library → Import → Scan QR code**.
3. Grant camera access and scan the code.

The QR code contains a signed transfer URL that expires after 10 minutes; the dialog shows a new code when it does. The portal redirects the phone to a short-lived Cloudflare R2 download, and the mobile app performs its normal package validation and installation.

## Vercel configuration

Set these server-only variables in the Vercel project:

```text
INTERNAL_APP_PASSWORD
AUTH_SESSION_SECRET
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
```

Leave `DECK_TRANSFER_ORIGIN` unset on Vercel. The app derives the origin from the incoming HTTPS request, which keeps production and custom-domain links correct. Set it only when a deliberate fixed origin is needed, such as a private development host; public plain HTTP is rejected.

Do not set `LOCAL_DECKS_DIR` on Vercel. It points development servers at a local folder of packages and is ignored in production.

Configure the Vercel project root as `apps/web`. Never expose passwords, session secrets, or R2 credentials with a `NEXT_PUBLIC_` prefix.

Run web checks from the repository root:

```bash
npm run check -w @flashcard-reels/web
npm test -w @flashcard-reels/web
npm run build -w @flashcard-reels/web
```
