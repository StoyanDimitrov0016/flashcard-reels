import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = path.join(process.cwd(), "src");
const installerRoot = path.join(sourceRoot, "features", "decks", "deck-installer");
const scriptsRoot = path.join(process.cwd(), "scripts");

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...sourceFiles(entryPath));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(entryPath);
    }
  }
  return files;
}

function scriptFiles(): string[] {
  return readdirSync(scriptsRoot)
    .filter((name) => name.endsWith(".mjs"))
    .map((name) => path.join(scriptsRoot, name));
}

describe("deck-installer module boundary", () => {
  it("exposes only file installation and application-owned public types", () => {
    const publicSource = readFileSync(path.join(installerRoot, "index.ts"), "utf8");

    expect(publicSource).toContain("installFromFile");
    expect(publicSource).toContain("DeckPackageValidationError");
    expect(publicSource).toContain("DeckPackageVersionError");
    expect(publicSource).not.toContain("installFromBytes");
    expect(publicSource).not.toContain("getInstalledVersion");
    expect(publicSource).not.toMatch(/expo-|fflate|Staged|Archive|Transaction/);
  });

  it("keeps installer internals private to the module and its composition root", () => {
    const offenders = sourceFiles(sourceRoot)
      .filter((file) => !file.startsWith(installerRoot))
      .filter(
        (file) =>
          path.relative(sourceRoot, file).replaceAll(path.sep, "/") !==
          "infrastructure/deck-package-services.ts"
      )
      .filter((file) => readFileSync(file, "utf8").includes("/deck-installer/internal/"));

    expect(offenders).toEqual([]);
  });

  it("has no legacy installer contracts or implementations outside the module", () => {
    const legacyPaths = [
      "features/decks/contracts/deck-package.schema.ts",
      "features/decks/domain/deck-package.model.ts",
      "features/decks/domain/deck-package-limits.ts",
      "features/decks/infrastructure/archive-deck-package.reader.ts",
      "features/decks/infrastructure/sqlite-deck-package-installation.transaction.ts",
      "features/audio/infrastructure/installed-audio-storage.ts",
    ];

    expect(legacyPaths.filter((file) => existsSync(path.join(sourceRoot, file)))).toEqual([]);
  });

  it("keeps tooling reuse of installer internals explicit and narrow", () => {
    const expectedInternalImports = new Map([
      [
        "assert-bundled-deck-packages.mjs",
        ["../src/features/decks/deck-installer/internal/archive-deck-package.reader.ts"],
      ],
      [
        "generate-demo-deck-package.mjs",
        [
          "../src/features/decks/deck-installer/internal/deck-package.schema.ts",
          "../src/features/decks/deck-installer/internal/deck-package-writer.ts",
        ],
      ],
      [
        "generate-test-deck-package.mjs",
        [
          "../src/features/decks/deck-installer/internal/deck-package.schema.ts",
          "../src/features/decks/deck-installer/internal/deck-package-writer.ts",
        ],
      ],
      [
        "generate-technical-deck-packages.mjs",
        [
          "../src/features/decks/deck-installer/internal/deck-package.schema.ts",
          "../src/features/decks/deck-installer/internal/deck-package-writer.ts",
        ],
      ],
      [
        "inspect-deck-package.mjs",
        ["../src/features/decks/deck-installer/internal/archive-deck-package.reader.ts"],
      ],
    ]);
    const violations = scriptFiles().flatMap((file) => {
      const name = path.basename(file);
      const source = readFileSync(file, "utf8");
      const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)]
        .map((match) => match[1])
        .filter((specifier): specifier is string => Boolean(specifier))
        .filter((specifier) => specifier.includes("/deck-installer/internal/"));
      const expected = expectedInternalImports.get(name) ?? [];
      return imports
        .filter((specifier) => !expected.includes(specifier))
        .map((specifier) => `${name}: ${specifier}`);
    });

    expect(violations).toEqual([]);
  });
});
