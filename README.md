# Flashcard Reels

Flashcard Reels turns technical study into a fast, swipeable feed. Review short questions across JavaScript, React, system design, databases, computer science, and operating systems, then rate your recall so difficult cards return more often.

The project contains two connected products:

- an Expo/React Native mobile app for local-first study;
- an internal Next.js/Vercel portal for browsing, inspecting, and transferring larger deck libraries.

The mobile app includes a bundled demo deck, mixed and deck-focused study modes, offline audio, local progress tracking, customizable deck appearances, and portable `.fcrdeck` imports. The portal can transfer a deck directly to the app with a short-lived QR code.

## Try the current builds

[Install the latest Android preview (APK)](https://expo.dev/accounts/stoyan_dimitrov/projects/flashcard-reels/builds/7ead0247-4974-48b9-abe3-9784b4fab465)

[Open the internal web deck portal](https://flashcard-reels.vercel.app/)

The APK is an EAS internal-distribution preview, not a Google Play release. Android may ask you to allow installation from your browser or file manager. The Expo build link is accessible to anyone who has it.

The Vercel site is currently for internal use and requires the shared team password. After signing in, use the portal to search the deck catalog, inspect cards, download a `.fcrdeck` package, or show a transfer QR code for the mobile app.

## Run locally

You need Node.js 22+, npm 11+, and the Expo Go app or a supported simulator.

```bash
npm install
npm start
```

Scan the QR code with Expo Go, or press `a`, `i`, or `w` to open Android, iOS, or the mobile web target.

To run the Vercel portal locally, configure its server-only environment variables first, then run:

```bash
npm run dev:web
```

See [Web portal](docs/web-portal.md) for deployment, authentication, R2, and phone-transfer details.

For focused workspace work, use `npm run check:mobile`, `npm run check:web`, or
`npm run doctor` from the repository root. See the [monorepo guide](docs/monorepo.md)
for command and configuration ownership.

## Test

`npm run verify` runs the complete automated verification. Unit tests cover pure deterministic
logic, integration tests use real SQLite/filesystem/application boundaries, and architecture tests
protect static module and resource contracts. Native gesture and presentation checks remain in the
manual device checklist.

## Documentation

- [Product guide](docs/product-guide.md)
- [Web portal](docs/web-portal.md)
- [Architecture](docs/architecture.md)
- [Deck package format](docs/deck-packages.md)
- [Development guide](docs/development.md)
- [Audio generation](docs/audio-generation.md)
- [Android manual testing](docs/manual-device-testing.md)

Built with Expo, React Native, TypeScript, SQLite, Drizzle ORM, Next.js, Tailwind CSS, and Cloudflare R2.
