# Local setup

This repository contains two applications:

| Application          | Technology          | Default development address      | Emulator required?                                                    |
| -------------------- | ------------------- | -------------------------------- | --------------------------------------------------------------------- |
| Mobile study app     | Expo / React Native | Metro on `http://localhost:8081` | No. Use Expo Go on a phone, an Android emulator, or an iOS Simulator. |
| Internal deck portal | Next.js             | `http://localhost:3000`          | No. It runs in a desktop browser.                                     |

The fastest way to see the product is to run the mobile app on a physical phone with Expo Go. Use
an emulator when a phone is unavailable or when testing device behavior repeatedly.

## 1. Install the prerequisites

Install:

- [Git](https://git-scm.com/downloads);
- Node.js `24.15.0`, as pinned in the repository's `.node-version` file;
- npm `12.0.2`, as pinned in the root `package.json`.

The exact versions used by CI are the safest choice. A Node version manager may read
`.node-version`; otherwise install the Node 24 release from the
[Node.js download page](https://nodejs.org/en/download) and select it manually. Then install the
repository's npm version:

```powershell
npm install --global npm@12.0.2
node --version
npm --version
```

The final two commands should print `v24.15.0` and `12.0.2`.

EAS CLI, Android Studio, Xcode, Java, and a native compiler are not required for the basic Expo Go
workflow. EAS CLI is only needed to create cloud builds.

## 2. Install all workspace modules

Run installation once from the repository root. Do not install each workspace separately.

```powershell
git clone https://github.com/StoyanDimitrov0016/flashcard-reels.git
cd flashcard-reels
npm ci
```

`npm ci` installs the exact dependency tree from `package-lock.json` and is also what CI uses. Use
`npm install` instead only when intentionally changing dependencies or regenerating the lockfile.

Optional installation checks:

```powershell
npm run doctor -w @flashcard-reels/mobile
npm run check -w @flashcard-reels/web
```

## 3. Run the mobile app

### Option A: physical phone (recommended first run)

1. Install [Expo Go](https://expo.dev/go) on the Android or iOS phone.
2. Put the phone and development computer on the same network.
3. From the repository root, start Metro:

   ```powershell
   npm run dev:mobile
   ```

4. Scan the terminal QR code with Expo Go on Android. On iOS, use the Camera app or Expo Go. A
   physical iOS device may require Expo CLI and Expo Go to be signed in to the same Expo account;
   run `npx expo login` if Expo asks for it.

Useful keys in the Metro terminal are `r` to reload, `j` to open React Native DevTools, and `m` to
open the developer menu. If the phone cannot reach Metro, check the firewall and Wi-Fi first. A
tunnel is a useful fallback:

```powershell
npm run dev -w @flashcard-reels/mobile -- --tunnel
```

### Option B: Android emulator

On Windows, macOS, or Linux, install Android Studio and its emulator. On Windows, Google currently
recommends at least 16 GB RAM and 16 GB free disk space for Studio plus the emulator; hardware
virtualization must be enabled.

1. Download and install [Android Studio](https://developer.android.com/studio/install). In the setup
   wizard, include **Android Virtual Device** and accept the SDK licenses. Expo also maintains an
   [Android emulator walkthrough](https://docs.expo.dev/workflow/android-studio-emulator/) with
   screenshots for each operating system.
2. In **Settings > Languages & Frameworks > Android SDK**, install:
   - Android SDK Platform 36 (Android 16) and an API 36 system image;
   - Android SDK Build-Tools;
   - Android SDK Platform-Tools;
   - Android Emulator.
3. On Windows, create the user variable `ANDROID_HOME` with the Android SDK directory. Its default
   value is `%LOCALAPPDATA%\Android\Sdk`. Add these entries to the user `Path`:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\emulator`
4. Open a new PowerShell window and verify the setup:

   ```powershell
   adb --version
   ```

5. In Android Studio, open **More Actions > Virtual Device Manager** (or **Device Manager** from an
   open project), choose **Create Virtual Device**, select a recent Pixel profile and the API 36
   image, and finish the wizard. Prefer an image that includes Google Play so Expo Go is available.
6. Start the virtual device from Device Manager. Once Android has booted, run:

   ```powershell
   npm run dev:mobile
   ```

7. Press `a` in the Metro terminal. Expo CLI opens the project in the running emulator and installs
   a compatible Expo Go when necessary.

If the emulator reports that acceleration is unavailable on Windows, enable CPU virtualization in
the BIOS/UEFI, turn on **Windows Hypervisor Platform** in **Turn Windows features on or off**, and
restart Windows. Google's
[emulator acceleration guide](https://developer.android.com/studio/run/emulator-acceleration)
contains the current platform-specific checks.

The `android:machine:start` and `android:machine:stop` scripts in the mobile workspace are a
maintainer-machine workaround. Their defaults point to an archived emulator at
`D:\AndroidEmulatorArchive\36.6.11` and an AVD named `Expo_API_35_Stable`. Do not use them on a
normal setup; launch the AVD through Android Studio as described above.

### Option C: iOS Simulator (macOS only)

iOS Simulator cannot be installed on Windows or Linux.

1. On a Mac, install Xcode from the Mac App Store, launch it once, accept its license, and let it
   install the requested components.
2. Install an iOS simulator runtime in Xcode's settings if one is not already present.
3. Start the mobile development server with `npm run dev:mobile`, then press `i`.

Expo's [iOS Simulator guide](https://docs.expo.dev/workflow/ios-simulator/) covers selecting a
specific simulator and reinstalling Expo Go if its SDK version does not match.

### Current limitation: mobile app in a browser

The checked-in Expo SDK 57 browser target currently fails in Metro while serializing the
`expo-sqlite` web worker with `Worker chunk not found`. Android and iOS are unaffected. Use Expo Go
on a phone or emulator for the mobile client, and use the separate Next.js portal for browser work.

After the upstream worker-bundling issue is resolved or the project upgrades to a compatible Expo
version, the intended command is:

```powershell
npm run web -w @flashcard-reels/mobile
```

You can also press `w` after `npm run dev:mobile`. This target is separate from the Next.js deck
portal and should not be treated as a substitute until its bundle succeeds again.

## 4. Run the web deck portal

The portal requires server-only authentication settings and a deck source. For local development,
the bundled demo deck can be used instead of Cloudflare R2.

From the repository root, copy the example environment file:

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Put the generated secret and a development password into `apps/web/.env.local`:

```dotenv
INTERNAL_APP_PASSWORD=choose-at-least-12-characters
AUTH_SESSION_SECRET=paste-the-generated-32-byte-secret-here
DECK_TRANSFER_ORIGIN=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=flashcard-reels

LOCAL_DECKS_DIR=../mobile/assets/decks
```

`INTERNAL_APP_PASSWORD` must contain at least 12 characters and `AUTH_SESSION_SECRET` at least 32.
The relative deck path is resolved from `apps/web`, which is the web workspace's process directory.
The `.env.local` file is ignored by Git; never commit passwords or R2 credentials.

Start the portal:

```powershell
npm run dev:web
```

Open `http://localhost:3000` and sign in with `INTERNAL_APP_PASSWORD`. The bundled demo deck should
appear in the catalog.

Local downloads work immediately. For a QR code that a physical phone can reach while using local
deck storage, set `DECK_TRANSFER_ORIGIN` to the computer's private LAN address, for example
`http://192.168.1.20:3000`, restart the web server, and allow port 3000 through the firewall. Do not
use `localhost`, because it refers to the phone itself. For an Android emulator, the usual host
address is `http://10.0.2.2:3000`.

To use the real catalog instead, remove `LOCAL_DECKS_DIR` and fill in all four `R2_*` values with
credentials for the private Cloudflare R2 bucket. See [Web portal](web-portal.md) for the storage,
transfer-link, and deployment details.

## 5. Run both applications

After configuring `apps/web/.env.local`, one root command starts both persistent development tasks:

```powershell
npm run dev
```

Separate terminals running `npm run dev:mobile` and `npm run dev:web` are often easier to read and
restart independently.

## 6. Validate changes

Use workspace-local checks during focused work:

```powershell
npm run check -w @flashcard-reels/mobile
npm test -w @flashcard-reels/mobile

npm run check -w @flashcard-reels/web
npm test -w @flashcard-reels/web
```

Before a repository-wide handoff, run:

```powershell
npm run verify
```

The full verification runs formatting, custom lint rules, lint, type checks, tests, dead-code
analysis, and production builds. It takes longer than the app-local commands.

## Common problems

- **Wrong Node or npm version:** compare `node --version` and `npm --version` with the pinned values
  above, then reopen the terminal after switching versions.
- **Expo cannot find Android:** confirm `ANDROID_HOME`, run `adb --version`, boot an AVD before
  pressing `a`, and reopen the terminal after changing environment variables.
- **Phone cannot open the Expo project:** keep the phone and computer on the same Wi-Fi, permit Node
  through the firewall, disable an interfering VPN, or use the Expo tunnel command above.
- **Metro has stale state:** stop it and run
  `npm run dev -w @flashcard-reels/mobile -- --clear`.
- **Web portal reports missing environment values:** use `LOCAL_DECKS_DIR` for local files or set
  every `R2_*` variable; also check the minimum password and secret lengths.
- **Port already in use:** stop the old Metro process on port 8081 or the old Next.js process on
  port 3000 before starting another development server.
