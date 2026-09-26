import { readFileSync, readdirSync } from "node:fs";
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

  it("keeps tooling reuse of installer internals explicit and narrow", () => {
    const expectedInternalImports = new Map([
      [
        "assert-bundled-deck-packages.mjs",
        ["../src/features/decks/deck-installer/internal/archive-deck-package.reader.ts"],
      ],
      [
        "generate-deck-package.mjs",
        [
          "../src/features/decks/deck-installer/internal/deck-package.schema.ts",
          "../src/features/decks/deck-installer/internal/deck-package-writer.ts",
        ],
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
