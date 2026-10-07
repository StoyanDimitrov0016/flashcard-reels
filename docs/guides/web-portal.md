# Web portal

The [internal portal](https://flashcard-reels.vercel.app/) is a password-protected catalog for
browsing curated decks and sending them to a phone. It lists every package under its `DECK_PREFIX`,
so publishing a deck needs no portal change. Architecture rules for this workspace are in
[`apps/web/AGENTS.md`](../../apps/web/AGENTS.md).

## Configuration

`apps/web/.env.example` lists every variable. All of them are server-only; never expose one with a
`NEXT_PUBLIC_` prefix.

| Variable                                                                      | Notes                                                                                                                                                                                              |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INTERNAL_APP_PASSWORD`, `AUTH_SESSION_SECRET`                                | Shared password and session signing secret (`openssl rand -base64 32`).                                                                                                                            |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Cloudflare R2 S3 API credentials.                                                                                                                                                                  |
| `DECK_PREFIX`                                                                 | **Required, no default.** `decks/` for Vercel Production; `dev/decks/` for Preview and local. Lowercase segments ending in `/`. Set Preview explicitly: Next.js builds Preview in production mode. |
| `DECK_TRANSFER_ORIGIN`                                                        | Leave unset on Vercel, where links use the request's HTTPS origin. Set it only for a deliberate fixed origin. Public plain HTTP is rejected.                                                       |
| `LOCAL_DECKS_DIR`                                                             | Development only: serve packages from a local folder instead of R2. Ignored in production. Never set it on Vercel.                                                                                 |

The Vercel project root is `apps/web`. Each server instance captures its catalog configuration for
its lifetime, so redeploy after changing it. A prefix separates catalogs logically; isolating
storage permissions would take separate buckets and credentials.

## Phone transfer

1. In the portal, open a deck and choose **Send to phone**.
2. In the app, choose **Decks → Import → Scan QR code** and allow camera access.
3. Scan. The app downloads from R2 and installs through its normal validation.

QR links expire after 10 minutes, and the dialog refreshes the code. The app cancels a download
after 60 seconds with no new bytes; a download that keeps receiving data can take longer.

**Testing transfers locally.** With `DECK_TRANSFER_ORIGIN` unset, the QR code points straight at an
HTTPS R2 URL, so the phone doesn't need to reach your laptop; the code is just denser. For compact
links, set it to an HTTPS tunnel or your LAN address (for example `http://192.168.1.20:3000`).
First check that the phone's browser can open that address, then restart the dev server. Never use
`localhost`, which points at the phone itself. The Expo tunnel doesn't expose the web server.

## Caching

All caches are in memory and local to one server instance, and they disappear on restart.

- Parsed deck summaries and previews use `lru-cache`, up to 32 entries each with a 30-minute TTL.
  Reads update recency but don't extend the TTL.
- Previews also have an 8 MiB budget, measured by the UTF-8 JSON size of their content (not heap
  size). Larger previews are served without being cached.
- The storage listing is reused for 60 seconds. A refresh evicts deleted or replaced revisions.
- Concurrent loads of one preview share a single read, and failed loads can be retried. Audio and
  whole archives are never cached.
