import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const imageRoot = path.join(repositoryRoot, "assets", "images");

const stockExpoStarterAssets = [
  "expo-badge-white.png",
  "expo-badge.png",
  "expo-logo.png",
  "logo-glow.png",
  "react-logo.png",
  "react-logo@2x.png",
  "react-logo@3x.png",
  "tutorial-web.png",
  "tabIcons/explore.png",
  "tabIcons/explore@2x.png",
  "tabIcons/explore@3x.png",
  "tabIcons/home.png",
  "tabIcons/home@2x.png",
  "tabIcons/home@3x.png",
];

describe("application asset boundary", () => {
  it("keeps every configured application image present", () => {
    const appConfig = readFileSync(path.join(repositoryRoot, "app.json"), "utf8");
    const configuredImages = [...appConfig.matchAll(/\.\/assets\/images\/[\w@.-]+\.png/g)].map(
      ([asset]) => asset
    );

    expect(new Set(configuredImages)).toEqual(
      new Set([
        "./assets/images/app-icon.png",
        "./assets/images/adaptive-icon-foreground.png",
        "./assets/images/adaptive-icon-monochrome.png",
        "./assets/images/favicon.png",
        "./assets/images/splash-logo.png",
      ])
    );
    expect(
      configuredImages.filter((asset) => !existsSync(path.join(repositoryRoot, asset)))
    ).toEqual([]);
  });

  it("does not retain unused Expo starter artwork", () => {
    expect(
      stockExpoStarterAssets.filter((asset) => existsSync(path.join(imageRoot, asset)))
    ).toEqual([]);
  });
});
