# Monorepo

The repository is an npm-workspaces Turborepo:

- `apps/mobile` — the existing Expo application.
- `apps/web` — the Next.js App Router application deployed from Vercel.
- `packages/design-tokens` — framework-neutral TypeScript colors and CSS custom properties.

## Commands

Run commands from the repository root:

- `npm run dev:mobile` starts Expo through Turborepo.
- `npm start` starts Expo directly from the mobile workspace.
- `npm run android`, `npm run ios`, and `npm run web:mobile` launch the
  corresponding Expo target from the mobile workspace.
- `npm run dev:web` starts Next.js.
- `npm run build` builds deployable workspaces.
- `npm run check` runs each workspace's checks through Turborepo.
- `npm test` runs the mobile and web test suites through Turborepo.
- `npm run verify` runs root checks, all tests, and deployable builds.
- `npm run verify:mobile` runs the extended Expo and Android validation path.

For Vercel, import this repository and set the project root directory to `apps/web`.
The web workspace's `.env.example` lists the server-only Cloudflare R2 settings. Leave
`DECK_TRANSFER_ORIGIN` empty in Vercel so transfer links use the incoming public HTTPS
origin. Set it only when an explicit public origin or private-network development host is
required; validation rejects public plain-HTTP origins.

Expo commands must resolve the app package at `apps/mobile`, where
`expo-router/entry` is configured as the application entrypoint. Running
`npx expo start` or `npx expo export` from the repository root bypasses that
configuration and makes Expo look for a root-level `App` file.

## Styling decision

The web app uses Tailwind CSS because that is shadcn/ui's supported component
distribution path. Product colors are not coupled to Tailwind: the shared package
exports plain TypeScript objects for React Native and CSS variables for the web.
That boundary allows a future StyleX package without migrating the source palette.

## R2 download boundary

The authenticated `GET /api/decks/<deck-id>/download` route creates a compact,
short-lived `/t/<token>` URL for QR transfer. The public transfer route verifies the
signed token and redirects the mobile client to a short-lived R2 presigned URL, so R2
credentials and the verbose signature never appear in the QR code. The mobile app then
downloads the `.fcrdeck` file directly from R2 and passes it through the existing deck
installer.

## Automation

`.github/workflows/ci.yml` runs strict formatting, conventions, lint, type checks,
architecture rules, all tests, a production-dependency audit, the web build, database
validation, dead-code checks, Expo Doctor, and an Android export. EAS production builds
are intentionally separate and run manually or from `mobile-v*` tags.
