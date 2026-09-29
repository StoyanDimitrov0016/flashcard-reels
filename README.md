# Flashcard Reels

Flashcard Reels turns technical study into a fast, swipeable feed. Review short questions across JavaScript, React, system design, databases, computer science, and operating systems, then rate your recall so difficult cards return more often.

The project contains two connected products:

- an Expo/React Native mobile app for local-first study;
- an internal Next.js/Vercel portal for browsing, inspecting, and transferring larger deck libraries.

The mobile app includes a bundled demo deck, mixed and deck-focused study modes, offline audio, local progress tracking, customizable deck appearances, and portable `.fcrdeck` imports. The portal can transfer a deck directly to the app with a short-lived QR code.

## Try the current builds

[Install the latest Android preview (APK)](https://expo.dev/accounts/stoyan_dimitrov/projects/flashcard-reels/builds/29fcdb77-61dc-48f6-9d36-a2d4503de931)

[Open the internal web deck portal](https://flashcard-reels.vercel.app/)

The APK is an EAS internal-distribution preview, not a Google Play release. Android may ask you to allow installation from your browser or file manager. The Expo build link is accessible to anyone who has it.

The Vercel site is currently for internal use and requires the shared team password. After signing in, use the portal to search the deck catalog, inspect cards, download a `.fcrdeck` package, or show a transfer QR code for the mobile app.

## Run locally

You need the Node.js and npm versions pinned by the repository (`24.15.0` and `12.0.2`), plus the
Expo Go app or a supported simulator for mobile development.

```bash
npm ci
npm run dev:mobile
```

Scan the QR code with Expo Go, or press `a` or `i` to open Android or iOS. The Expo browser target
currently has an SDK 57 `expo-sqlite` worker-bundling issue documented in the local setup guide.

See [Local setup](docs/setup.md) for complete dependency installation, web environment setup,
physical-device instructions, and Android/iOS emulator installation.

To run the Vercel portal locally, configure its server-only environment variables first, then run:

```bash
npm run dev:web
```

See [Web portal](docs/web-portal.md) for deployment, authentication, R2, and phone-transfer details.

For focused work, change to the relevant workspace and use its local scripts, such
as `npm run check`, `npm test`, or `npm run doctor`. Root scripts are reserved
for repository-wide orchestration and validation. See the
[monorepo guide](docs/monorepo.md) for command and configuration ownership.

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
- [Local setup](docs/setup.md)
- [Audio generation](docs/audio-generation.md)
- [Android manual testing](docs/manual-device-testing.md)

Built with Expo, React Native, TypeScript, SQLite, Drizzle ORM, Next.js, Tailwind CSS, and Cloudflare R2.
