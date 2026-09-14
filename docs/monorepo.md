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
- `npm test` runs the mobile test suite through Turborepo.

For Vercel, import this repository and set the project root directory to `apps/web`.
The web workspace's `.env.example` lists the server-only Cloudflare R2 settings.

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

`apps/web/src/lib/r2.ts` implements short-lived presigned GET URLs, but it is not
connected to a public route. The eventual Route Handler must authenticate the user
and authorize the requested deck before calling it. Mobile should request a URL,
download the `.fcrdeck` file into app storage, then pass it through the existing
deck installer.
