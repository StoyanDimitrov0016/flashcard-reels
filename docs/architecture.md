# Architecture

Flashcard Reels is an npm-workspaces Turborepo with an Expo mobile app, a Next.js deck portal, and shared design tokens.

## Mobile app

The mobile app is organized by feature slices—study, reels, decks, audio, learner profile, and flashcards—with domain, application, infrastructure, and presentation layers. The composition root connects those layers to SQLite, application-owned files, and the React Native UI.

SQLite and Drizzle persist decks, sessions, review history, preferences, and learner summaries. The deck installer validates `.fcrdeck` archives, manages versioned audio, and updates deck content without discarding existing learning history.

Study sessions persist their feed position and use a bounded materialized window. Discover and Focus share the same memory-aware feed composer, while the learning engine applies FSRS when reviews are finalized. Moving backwards through a feed does not reopen completed reviews.

## Web portal

The web app is an internal Next.js App Router application. It reads curated deck packages from Cloudflare R2, protects catalog routes with shared-password sessions, and creates short-lived signed transfer links for QR import. R2 credentials remain server-only.

## Boundaries and verification

Feature boundaries keep UI code independent from persistence and platform details. Unit tests cover deterministic policies, integration tests exercise SQLite/filesystem flows, and architecture tests protect module and asset contracts. Native gestures and presentation remain in the manual device checklist.
