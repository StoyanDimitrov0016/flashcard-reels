import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { DeckPackageSchema } from "../src/features/decks/deck-installer/internal/deck-package.schema.ts";
import { createDeckPackageArchive } from "../src/features/decks/deck-installer/internal/deck-package-writer.ts";

const root = process.cwd();
const sourceDirectory = path.join(root, "data", "demo-deck");
const audioDirectory = path.join(sourceDirectory, "audio");
const deckPackage = DeckPackageSchema.parse(
  JSON.parse(await readFile(path.join(sourceDirectory, "deck.json"), "utf8"))
);
const audioFiles = {};
for (const fileName of (await readdir(audioDirectory)).sort()) {
  audioFiles[`audio/${fileName}`] = new Uint8Array(
    await readFile(path.join(audioDirectory, fileName))
  );
}

const configuredOutput = process.env.DEMO_PACKAGE_OUTPUT;
const outputPath = configuredOutput
  ? path.resolve(root, configuredOutput)
  : path.join(root, "assets", "decks", `${deckPackage.id}.fcrdeck`);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, createDeckPackageArchive(deckPackage, audioFiles));
console.log(`Generated ${path.relative(root, outputPath)} (${deckPackage.cards.length} cards).`);
