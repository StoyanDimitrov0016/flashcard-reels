import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createDeckPackageArchive } from "../src/features/decks/deck-installer/internal/deck-package-writer.ts";
import { DeckPackageSchema } from "../src/features/decks/deck-installer/internal/deck-package.schema.ts";

const AudioFilePattern = /^([^/]+)\.(answer|question)\.mp3$/;

const [sourceArgument, outputArgument, ...extraArguments] = process.argv.slice(2);
if (!sourceArgument || extraArguments.length > 0) {
  console.error("Usage: npm run decks:generate -- path/to/deck-source [output.fcrdeck]");
  process.exit(2);
}

async function readOptionalDirectory(directory) {
  try {
    return await readdir(directory);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

const sourceDirectory = path.resolve(process.cwd(), sourceArgument);
const deckPackage = DeckPackageSchema.parse(
  JSON.parse(await readFile(path.join(sourceDirectory, "deck.json"), "utf8"))
);

const lessonFiles = {};
for (const lesson of deckPackage.lessons ?? []) {
  lessonFiles[lesson.id] = await readFile(
    path.join(sourceDirectory, "lessons", `${lesson.id}.md`),
    "utf8"
  );
}

const cardIds = new Set(deckPackage.cards.map((card) => card.id));
const audioDirectory = path.join(sourceDirectory, "audio");
const audioFiles = {};
const audioFileNames = await readOptionalDirectory(audioDirectory);
for (const fileName of audioFileNames.toSorted()) {
  const match = AudioFilePattern.exec(fileName);
  if (!match) {
    throw new Error(`Unexpected audio file ${fileName}; use <card-id>.<answer|question>.mp3`);
  }
  if (!cardIds.has(match[1])) {
    throw new Error(`Audio file ${fileName} does not match a card in deck.json`);
  }
  audioFiles[`audio/${fileName}`] = new Uint8Array(
    await readFile(path.join(audioDirectory, fileName))
  );
}

// Not dist/, which expo export empties.
const outputPath = outputArgument
  ? path.resolve(process.cwd(), outputArgument)
  : path.join(process.cwd(), "build", "decks", `${deckPackage.id}.fcrdeck`);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, createDeckPackageArchive(deckPackage, audioFiles, lessonFiles));
console.log(
  `Generated ${path.relative(process.cwd(), outputPath)}: ${deckPackage.title} v${deckPackage.version}, ` +
    `${deckPackage.cards.length} cards, ${Object.keys(lessonFiles).length} lessons, ` +
    `${Object.keys(audioFiles).length} audio files.`
);
