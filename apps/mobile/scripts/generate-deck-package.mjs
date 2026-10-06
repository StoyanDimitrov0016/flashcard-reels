import { parseDeck } from "@flashcard-reels/deck-contract";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createContractDeckPackageArchive } from "../src/features/decks/deck-installer/internal/contract-deck-package-writer.ts";

const AudioFilePattern = /^([^/]+)\.mp3$/;

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
const rootTechnicalAudioDirectory = path.join(
  process.cwd(),
  "data",
  "technical_flashcard_library",
  "audio"
);
const deckPackage = parseDeck(
  JSON.parse(await readFile(path.join(sourceDirectory, "deck.json"), "utf8"))
);

const lessonFiles = {};
for (const lesson of deckPackage.lessons) {
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
    throw new Error(`Unexpected audio file ${fileName}; use <card-id>.mp3`);
  }
  if (!cardIds.has(match[1])) {
    throw new Error(`Audio file ${fileName} does not match a card in deck.json`);
  }
  audioFiles[match[1]] = new Uint8Array(await readFile(path.join(audioDirectory, fileName)));
}

// The technical library owns combined question/pause/answer audio for stable card IDs.
for (const card of deckPackage.cards) {
  if (!card.audio || audioFiles[card.id]) {
    continue;
  }
  try {
    audioFiles[card.id] = new Uint8Array(
      await readFile(path.join(rootTechnicalAudioDirectory, `${card.id}.mp3`))
    );
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

// Not dist/, which expo export empties.
const outputPath = outputArgument
  ? path.resolve(process.cwd(), outputArgument)
  : path.join(process.cwd(), "build", "decks", `${deckPackage.id}.fcrdeck`);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, createContractDeckPackageArchive(deckPackage, audioFiles, lessonFiles));
console.log(
  `Generated ${path.relative(process.cwd(), outputPath)}: ${deckPackage.title} revision ${deckPackage.revision}, ` +
    `${deckPackage.cards.length} cards, ${Object.keys(lessonFiles).length} lessons, ` +
    `${Object.keys(audioFiles).length} audio files.`
);
