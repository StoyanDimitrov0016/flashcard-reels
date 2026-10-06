import { parseDeck } from "@flashcard-reels/deck-contract";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createContractDeckPackageArchive } from "../src/features/decks/deck-installer/internal/contract-deck-package-writer.ts";

const root = process.cwd();
const sourceDirectory = path.join(root, "data", "demo-deck");
const audioDirectory = path.join(sourceDirectory, "audio");
const deckPackage = parseDeck(
  JSON.parse(await readFile(path.join(sourceDirectory, "deck.json"), "utf8"))
);
const audioFiles = {};
const audioFileNames = new Set(await readdir(audioDirectory));
for (const card of deckPackage.cards) {
  const fileName = `${card.id}.mp3`;
  if (card.audio && audioFileNames.has(fileName)) {
    audioFiles[card.id] = new Uint8Array(await readFile(path.join(audioDirectory, fileName)));
  }
}

const lessonFiles = {};
for (const lesson of deckPackage.lessons) {
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
await writeFile(outputPath, createContractDeckPackageArchive(deckPackage, audioFiles, lessonFiles));
console.log(
  `Generated ${path.relative(root, outputPath)} (${deckPackage.cards.length} cards, ${Object.keys(lessonFiles).length} lessons).`
);
