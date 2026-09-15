import type { ExpoConfig } from "expo/config";

import packageJson from "./package.json";
import nativeIdentity from "./src/shared/foundation/native-identity.json";

const config: ExpoConfig = {
  name: nativeIdentity.appName,
  slug: nativeIdentity.slug,
  version: packageJson.version,
  orientation: "portrait",
  icon: "./assets/images/app-icon.png",
  scheme: nativeIdentity.scheme,
  userInterfaceStyle: "automatic",
  ios: {
    icon: "./assets/images/app-icon.png",
  },
  android: {
    package: nativeIdentity.androidPackage,
    adaptiveIcon: {
      backgroundColor: nativeIdentity.darkCanvas,
      foregroundImage: "./assets/images/adaptive-icon-foreground.png",
      monochromeImage: "./assets/images/adaptive-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    [
      "expo-router",
      {
        headers: {
          "Cross-Origin-Embedder-Policy": "credentialless",
          "Cross-Origin-Opener-Policy": "same-origin",
        },
      },
    ],
    "expo-font",
    "expo-sqlite",
    [
      "expo-audio",
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundPlayback: false,
        enableBackgroundRecording: false,
      },
    ],
    "expo-document-picker",
    [
      "expo-camera",
      {
        cameraPermission: "Allow Flashcard Reels to scan deck transfer QR codes.",
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: nativeIdentity.lightCanvas,
        dark: { backgroundColor: nativeIdentity.darkCanvas },
        image: "./assets/images/splash-logo.png",
        imageWidth: 220,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    repositoryUrl: "https://github.com/StoyanDimitrov0016/flashcard-reels",
    router: {},
    eas: {
      projectId: "3420f53b-a597-432c-be5b-cab7114861f8",
    },
  },
  owner: "stoyan_dimitrov",
};

export default config;
