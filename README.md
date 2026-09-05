# Flashcard Reels

A deliberately small Expo SDK 57 proof of concept: swipe vertically through full-screen
flashcards. The app uses TypeScript, Expo Router, React Compiler, Expo SQLite, Zod, Oxlint,
and Oxfmt.

## Run it

```bash
npm install
npm start
```

Scan the QR code with Expo Go, or press `a`, `i`, or `w` for Android, iOS, or web.

## Quality checks

```bash
npm run check
```

The current persistence layer is local SQLite. Backend synchronization, authentication, and
tests are intentionally deferred while the domain and repository boundaries settle.
