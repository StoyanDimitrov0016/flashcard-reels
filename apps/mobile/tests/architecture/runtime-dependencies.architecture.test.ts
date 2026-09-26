import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

// These packages are loaded at runtime by other libraries rather than imported by app code, so
// dead-code analysis cannot see them. Removing one crashes the app on launch.
const runtimeOnlyDependencies = [
  // Expo Router's TopTabs, which renders the swipeable bottom navigation.
  "react-native-tab-view",
  // The native pager behind TopTabs and the vertical reel feed.
  "react-native-pager-view",
] as const;

const PackageJsonSchema = z.object({ dependencies: z.record(z.string(), z.string()) });
const KnipConfigSchema = z.object({
  workspaces: z.record(
    z.string(),
    z.object({ ignoreDependencies: z.array(z.string()).optional() })
  ),
});

const packageJson = PackageJsonSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"))
);
const knipConfig = KnipConfigSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "..", "..", "knip.json"), "utf8"))
);

describe("runtime-only dependencies", () => {
  it.each(runtimeOnlyDependencies)("declares and resolves %s for the mobile app", (name) => {
    expect(packageJson.dependencies[name]).toBeDefined();
    expect(() =>
      createRequire(path.join(process.cwd(), "package.json")).resolve(name)
    ).not.toThrow();
  });

  it("keeps dead-code analysis from removing them", () => {
    expect(knipConfig.workspaces["apps/mobile"]?.ignoreDependencies).toEqual(
      expect.arrayContaining([...runtimeOnlyDependencies])
    );
  });
});
