# Monorepo

The repository is an npm-workspaces Turborepo:

- `apps/mobile` — the existing Expo application.
- `apps/web` — the internal Next.js App Router deck portal deployed at [flashcard-reels.vercel.app](https://flashcard-reels.vercel.app/).
- `packages/design-tokens` — framework-neutral TypeScript colors and CSS custom properties.

## Commands

Root commands are repository-wide orchestration and CI entry points:

- `npm run dev` starts every development task through Turborepo.
- `npm run dev:mobile` and `npm run dev:web` start one app from the root.
- `npm run build` builds deployable workspaces.
- `npm run check` runs repository-wide formatting, conventions, lint, workspace
  type checks, and mobile architecture checks.
- `npm test` runs the mobile and web test suites through Turborepo.
- `npm run verify` runs root checks, all tests, dead-code analysis, and builds.

For routine app-local work, change to `apps/mobile` or `apps/web` and run that
workspace's own `npm run dev`, `npm run check`, `npm test`, `npm run lint`,
`npm run typecheck`, or `npm run format` scripts. This avoids validating unrelated
workspaces. Mobile-only extended commands such as `npm run doctor`,
`npm run check:android`, and `npm run verify` also run from `apps/mobile`.

For Vercel, import this repository and set the project root directory to `apps/web`.
The web workspace's `.env.example` lists the server-only Cloudflare R2 settings. Leave
`DECK_TRANSFER_ORIGIN` unset in Vercel so transfer links use the incoming public HTTPS
origin. A blank value is also treated as unset. Set it only when an explicit public
origin or private-network development host is required; validation rejects public
plain-HTTP origins.

The current deployment is password-protected for internal use. The web catalog
lists the curated R2-backed decks, while the mobile app remains the study and
learning-data client. See [Web portal](web-portal.md) for the user flow and
environment variables.

Expo commands must resolve the app package at `apps/mobile`, where
`expo-router/entry` is configured as the application entrypoint. Running
`npx expo start` or `npx expo export` from the repository root bypasses that
configuration and makes Expo look for a root-level `App` file.

TypeScript policy is shared through the root `tsconfig.base.json`. Each workspace
extends it and keeps its framework-specific additions local: Expo owns the mobile
base, Next.js owns the web integration, and the design-token package stays
framework-neutral. Type checking is delegated by Turborepo; there is no root
TypeScript source set to compile.

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
