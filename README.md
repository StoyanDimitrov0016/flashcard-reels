# Flashcard Reels

Flashcard Reels turns technical study into a fast, swipeable feed. Review short questions across JavaScript, React, system design, databases, computer science, and operating systems, then rate your recall so difficult cards return more often.

The app includes a compact built-in demo, mixed and deck-focused study modes, local progress tracking, customizable deck colors, and portable `.fcrdeck` deck-package imports.

Importing external `.fcrdeck` files is the normal path for larger libraries. The demo and external files use the same validated installer, versioning, audio storage, and learner-history-preserving update flow.

## Try the Android app

[Install the Android preview (APK)](https://expo.dev/accounts/stoyan_dimitrov/projects/flashcard-reels/builds/e9d91528-d45a-4476-88f2-8c9c6b945539)

This is a preview build distributed outside Google Play. Android will ask you to approve installation from your browser or file manager. The build link is accessible to anyone who has it.

## Run locally

You need Node.js, npm, and the Expo Go app or a supported simulator.

```bash
npm install
npm start
```

Scan the QR code with Expo Go, or press `a`, `i`, or `w` to open Android, iOS, or web.

## Documentation

- [Product guide](docs/product-guide.md)
- [Architecture](docs/architecture.md)
- [Deck package format](docs/deck-packages.md)
- [Development guide](docs/development.md)
- [Audio generation](docs/audio-generation.md)
- [Android manual testing](docs/manual-device-testing.md)

Built with Expo, React Native, TypeScript, SQLite, and Drizzle ORM.
