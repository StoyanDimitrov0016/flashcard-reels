# Web deck portal

The [internal web portal](https://flashcard-reels.vercel.app/) is a Next.js catalog for browsing and transferring curated Flashcard Reels decks. It is not a second study client and does not store mobile progress.

After signing in with the shared team password, users can search decks, browse cards and reveal answers, read a deck's lessons, download `.fcrdeck` packages, and display a phone-transfer QR code. The catalog lists packages under its configured `DECK_PREFIX` in the R2 bucket, so publishing a deck needs no portal change.

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
2. In the app, choose **Decks → Import → Scan QR code**.
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
DECK_PREFIX
```

Set `DECK_PREFIX=decks/` for Vercel Production and `DECK_PREFIX=dev/decks/` for Preview
and local R2-backed development. An unset prefix preserves the existing `decks/` catalog.
Blank values and malformed prefixes are rejected; prefixes must use lowercase path segments and
end in `/`. Configure Preview explicitly: Next.js uses production mode for preview builds too.
Changing this deployment configuration requires restarting or redeploying the portal, because each
server instance captures its catalog and caches for its lifetime. The storage adapter enforces the
same prefix for listing, byte reads, and signed downloads. A prefix is logical catalog separation;
separate buckets and credentials would be needed for storage permission isolation.

The publisher independently requires `--environment=dev` or `--environment=prod`; it never chooses
an upload destination from the portal's `DECK_PREFIX`. Local file storage still reads the configured
`LOCAL_DECKS_DIR`, without applying R2 prefix settings.

Leave `DECK_TRANSFER_ORIGIN` unset on Vercel. The app derives the origin from the incoming HTTPS request, which keeps production and custom-domain links correct. Set it only when a deliberate fixed origin is needed, such as a private development host; public plain HTTP is rejected.

For local R2-backed phone testing, leave `DECK_TRANSFER_ORIGIN` unset in
`apps/web/.env.local`. The QR code then points directly to HTTPS storage, so the
phone does not need access to the laptop. These longer signed download URLs make
denser QR codes than the compact links used in production.

To use compact links locally, configure a reachable HTTPS tunnel for the web
server, or use the computer's LAN address, for example `http://192.168.1.20:3000`.
Check that the phone can open that address in its browser before setting
`DECK_TRANSFER_ORIGIN`, and restart the web dev server after changing it. A phone
hotspot or firewall can prevent access even when the laptop is connected to the
phone. Do not use `localhost`, which points to the phone itself when scanned. The
Expo tunnel serves the mobile development bundle and does not expose the web server.

The mobile downloader cancels a transfer after 60 seconds without receiving more
bytes. Downloads that continue receiving data can take longer than one minute.

Do not set `LOCAL_DECKS_DIR` on Vercel. It points development servers at a local folder of packages and is ignored in production.

Configure the Vercel project root as `apps/web`. Never expose passwords, session secrets, or R2 credentials with a `NEXT_PUBLIC_` prefix.

Run web checks from the repository root:

```bash
npm run check -w @flashcard-reels/web
npm test -w @flashcard-reels/web
npm run build -w @flashcard-reels/web
```
