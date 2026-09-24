import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createDeckPackageArchive } from "../src/features/decks/deck-installer/internal/deck-package-writer.ts";
import { DeckPackageSchema } from "../src/features/decks/deck-installer/internal/deck-package.schema.ts";

const root = process.cwd();
const sourceDirectory = path.join(root, "data", "demo-deck");
const audioDirectory = path.join(sourceDirectory, "audio");
const deckPackage = DeckPackageSchema.parse(
  JSON.parse(await readFile(path.join(sourceDirectory, "deck.json"), "utf8"))
);
const audioFiles = {};
const audioFileNames = await readdir(audioDirectory);
for (const fileName of audioFileNames.toSorted()) {
  audioFiles[`audio/${fileName}`] = new Uint8Array(
    await readFile(path.join(audioDirectory, fileName))
  );
}

const lessonFiles = {};
for (const lesson of deckPackage.lessons ?? []) {
  lessonFiles[lesson.id] = await readFile(
    path.join(sourceDirectory, "lessons", `${lesson.id}.md`),
    "utf8"
  );
}

const configuredOutput = process.env.DEMO_PACKAGE_OUTPUT;
const outputPath = configuredOutput
  ? path.resolve(root, configuredOutput)
  : path.join(root, "assets", "decks", `${deckPackage.id}.fcrdeck`);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, createDeckPackageArchive(deckPackage, audioFiles, lessonFiles));
console.log(
  `Generated ${path.relative(root, outputPath)} (${deckPackage.cards.length} cards, ${Object.keys(lessonFiles).length} lessons).`
);
