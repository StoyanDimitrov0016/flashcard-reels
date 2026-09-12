import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
describe("application asset boundary", () => {
  it("keeps every configured application image present", () => {
    const appConfig = readFileSync(path.join(repositoryRoot, "app.config.ts"), "utf8");
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
});
