import { parseDeckPackage } from "@flashcard-reels/deck-contract";
// oxlint-disable no-await-in-loop -- Read large bundled archives serially to keep peak test memory bounded.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import registry from "@/infrastructure/bundled-deck-registry.json";

describe("bundled deck registry", () => {
  it("matches every generated package deck ID and revision", async () => {
    const packageDirectory = path.join(process.cwd(), "assets", "decks");
    const packageNames = await readdir(packageDirectory);
    const packageFiles = packageNames.filter((file) => file.endsWith(".fcrdeck"));
    expect(registry).toHaveLength(1);
    expect(packageFiles).toHaveLength(registry.length);

    for (const packageFile of packageFiles) {
      const bytes = new Uint8Array(await readFile(path.join(packageDirectory, packageFile)));
      const deckPackage = parseDeckPackage(bytes).deck;
      expect(packageFile).toBe(`${deckPackage.id}.fcrdeck`);
      const metadata = registry.find(
        (entry: { packageAsset: string }) => entry.packageAsset === packageFile
      );
      expect(metadata).toMatchObject({
        appearance: { presetId: "gold" },
        id: deckPackage.id,
        revision: deckPackage.revision,
      });
    }
  });
});
