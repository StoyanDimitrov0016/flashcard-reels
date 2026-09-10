// oxlint-disable no-await-in-loop -- Read large bundled archives serially to keep peak test memory bounded.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ArchiveDeckPackageReader } from "@/features/decks/deck-installer/internal/archive-deck-package.reader";
import registry from "@/infrastructure/bundled-deck-registry.json";

describe("bundled deck registry", () => {
  it("matches every generated package deck ID and version", async () => {
    const packageDirectory = path.join(process.cwd(), "assets", "decks");
    const packageNames = await readdir(packageDirectory);
    const packageFiles = packageNames.filter((file) => file.endsWith(".fcrdeck"));
    expect(registry).toHaveLength(1);
    expect(packageFiles).toHaveLength(registry.length);
    const reader = new ArchiveDeckPackageReader();

    for (const packageFile of packageFiles) {
      const bytes = new Uint8Array(await readFile(path.join(packageDirectory, packageFile)));
      const deckPackage = reader.read(bytes);
      expect(packageFile).toBe(`${deckPackage.id}.fcrdeck`);
      const metadata = registry.find(
        (entry: { packageAsset: string }) => entry.packageAsset === packageFile
      );
      expect(metadata).toMatchObject({ id: deckPackage.id, version: deckPackage.version });
    }
  });
});
