# Flashcard Reels

Flashcard Reels turns technical study into a swipeable feed. Swipe through short questions,
double-tap to reveal the answer, and rate your recall so difficult cards return more often.
Short lessons let you learn a deck's material before you are tested on it.

The repository holds two products:

- an Expo/React Native app for local-first study on Android;
- an internal Next.js portal for browsing decks and sending them to the phone with a QR code.

## Try it

- [Latest Android preview APK](https://expo.dev/accounts/stoyan_dimitrov/projects/flashcard-reels/builds/29fcdb77-61dc-48f6-9d36-a2d4503de931).
  An EAS internal build, not a Google Play release; Android may ask to allow installs from
  your browser.
- [Web deck portal](https://flashcard-reels.vercel.app/), protected by a shared team password.

## Run locally

Requires Node.js 24 and npm 11+.

```bash
npm install
npm run dev:mobile   # scan the QR code with Expo Go, or press a / i / w
npm run dev:web      # needs the server-only variables in docs/web-portal.md
npm run verify       # full repository validation
```

## Documentation

Start with the first three.

- [Principles](docs/principles.md): the product ideas every feature follows.
- [Functional requirements](docs/functional-requirements.md): what the app does and does not
  do, and what closes Phase 0.
- [Roadmap](docs/roadmap.md): the Phase 0 order of work and what comes after.
- [Architecture](docs/architecture.md): how the repository, mobile app, and portal fit together.
- [Learning data](docs/learning-data.md): how progress is stored, archived, backed up, and
  restored.
- [Deck packages](docs/deck-packages.md): the `.fcrdeck` format, authoring, and publishing.
- [Visual system](docs/visual-system.md): theme, deck appearance, and layout rules.
- [Web portal](docs/web-portal.md): routes, access, storage, phone transfer, and deployment.
- [Development](docs/development.md): commands, checks, database changes, builds, and Maestro.
- [Manual device testing](docs/manual-device-testing.md): the Android checklist.
- [Codebase preferences](docs/codebase-preferences.md): implementation conventions with
  examples.
- [Feature specs](docs/specs/README.md): the decisions behind each feature.

Built with Expo, React Native, TypeScript, SQLite, Drizzle ORM, Next.js, Tailwind CSS, and
Cloudflare R2.
