// oxlint-disable no-await-in-loop -- Read large bundled archives serially to keep peak test memory bounded.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ArchiveDeckPackageReader } from "@/features/decks/infrastructure/archive-deck-package.reader";

const registryEntryPattern = /id: "([0-9a-f-]{36})",\s*version: (\d+),/g;

describe("bundled deck registry", () => {
  it("matches every generated package deck ID and version", async () => {
    const registrySource = await readFile(
      path.join(process.cwd(), "src", "infrastructure", "bundled-deck-packages.ts"),
      "utf8"
    );
    const registry = new Map(
      [...registrySource.matchAll(registryEntryPattern)].map((match) => [
        match[1],
        Number(match[2]),
      ])
    );
    const packageDirectory = path.join(process.cwd(), "assets", "decks");
    const packageFiles = (await readdir(packageDirectory)).filter((file) =>
      file.endsWith(".fcrdeck")
    );
    expect(registry.size).toBeGreaterThan(0);
    expect(packageFiles).toHaveLength(registry.size);
    const reader = new ArchiveDeckPackageReader();

    for (const packageFile of packageFiles) {
      const bytes = new Uint8Array(await readFile(path.join(packageDirectory, packageFile)));
      const deckPackage = reader.read(bytes);
      expect(packageFile).toBe(`${deckPackage.id}.fcrdeck`);
      expect(registry.get(deckPackage.id)).toBe(deckPackage.version);
    }
  });
});
