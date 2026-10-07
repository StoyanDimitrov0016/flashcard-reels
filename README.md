# Flashcard Reels

Flashcard Reels turns technical study into a fast, swipeable feed. Review short questions across JavaScript, React, system design, databases, computer science, and operating systems, then rate your recall so difficult cards return more often.

The project contains two connected products:

- an Expo/React Native mobile app for local-first study;
- an internal Next.js/Vercel portal for browsing, inspecting, and transferring larger deck libraries.

The mobile app includes a bundled demo deck, mixed and deck-focused study modes, offline audio, local progress tracking, customizable deck themes, and portable `.fcrdeck` imports. The portal can transfer a deck directly to the app with a short-lived QR code.

Both apps use `@flashcard-reels/deck-contract` to validate the shared deck format. The mobile
installer validates complete packages; the portal reads manifests and lessons by byte range.

## Try the current builds

[Install the latest Android preview (APK)](https://expo.dev/accounts/flashcard-reels-org/projects/flashcard-reels/builds/b5e8320f-404d-4ba7-b61c-efe091c69fc6)

[Open the internal web deck portal](https://flashcard-reels.vercel.app/)

The APK is an EAS internal-distribution preview, not a Google Play release. Android may ask you to allow installation from your browser or file manager. The Expo build link is accessible to anyone who has it.

The Vercel site is currently for internal use and requires the shared team password. After signing in, use the portal to search the deck catalog, inspect cards, download a `.fcrdeck` package, or show a transfer QR code for the mobile app.

## Run locally

You need Node.js 24, npm 12, and the Expo Go app or a supported simulator.

```bash
npm install
npm run dev:mobile
```

Scan the QR code with Expo Go, or press `a`, `i`, or `w` to open Android, iOS, or the mobile web target.

To run the Vercel portal locally, configure its server-only environment variables first, then run:

```bash
npm run dev:web
```

See the [web portal guide](docs/guides/web-portal.md) for deployment, authentication, R2, and
phone-transfer details.

For focused work, change to the relevant workspace and use its local scripts, such
as `npm run check`, `npm test`, or `npm run doctor`. Root scripts are reserved
for repository-wide orchestration and validation. See the
[development guide](docs/guides/development.md).

## Test

`npm run verify` runs the complete automated verification. Unit tests cover pure deterministic
logic, integration tests use real SQLite/filesystem/application boundaries, and architecture tests
protect static module and resource contracts. Native gesture and presentation checks remain in the
manual device checklist.

## Documentation

Start at [docs/README.md](docs/README.md). The most-used pages:

- [Product](docs/product.md), [principles](docs/principles.md), and
  [architecture](docs/architecture.md)
- [Specs dashboard](docs/specs/README.md): what is being built and what is waiting
- [Development](docs/guides/development.md), [decks](docs/guides/decks.md), and
  [testing](docs/guides/testing.md) guides

Built with Expo, React Native, TypeScript, SQLite, Drizzle ORM, Next.js, Tailwind CSS, and Cloudflare R2.
