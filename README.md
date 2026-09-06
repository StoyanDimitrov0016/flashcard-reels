# Flashcard Reels

A deliberately small Expo SDK 57 proof of concept: swipe vertically through full-screen
flashcards. The app uses TypeScript, Expo Router, React Compiler, Expo SQLite, Drizzle ORM, Zod,
Vitest 5, OXLint, and OXFmt.

## Run it

```bash
npm install
npm start
```

Scan the QR code with Expo Go, or press `a`, `i`, or `w` for Android, iOS, or web.

## Architecture

The app uses a local SQLite database. Drizzle owns the schema and SQLite repository
implementations, while repository interfaces keep persistence behind the application/domain
layers.

Study data currently includes independent Mixed and Focused study sessions, persisted prepared feed
order, flashcard review attempts, and simple intra-session recurrence.

The current Drizzle migration is the clean development baseline. Reset stale pre-Drizzle or other
old local development databases before running the app after schema changes.

## Development commands

```bash
npm start                 # start Expo
npm run check             # formatting, conventions, lint, and TypeScript
npm run check:android     # export the Android bundle
npm run test:run          # run Vitest once
npm test                  # run Vitest in watch mode
npm run db:generate     # generate a Drizzle migration
npm run db:check        # validate the Drizzle schema/migrations
```
