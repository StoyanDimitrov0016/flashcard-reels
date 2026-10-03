import { parseDeck } from "@flashcard-reels/deck-contract";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createContractDeckPackageArchive } from "../src/features/decks/deck-installer/internal/contract-deck-package-writer.ts";

const root = process.cwd();
const sourceDirectory = path.join(root, "data", "technical_flashcard_library");
const audioDirectory = path.join(sourceDirectory, "audio");
const outputDirectory = process.env.TECHNICAL_PACKAGE_OUTPUT_DIR
  ? path.resolve(root, process.env.TECHNICAL_PACKAGE_OUTPUT_DIR)
  : path.join(root, "assets", "decks");
const decks = JSON.parse(await readFile(path.join(sourceDirectory, "decks.json"), "utf8"));
const flashcards = JSON.parse(
  await readFile(path.join(sourceDirectory, "flashcards.json"), "utf8")
);

await mkdir(outputDirectory, { recursive: true });
for (const deck of decks) {
  const deckPackage = parseDeck({
    cards: flashcards
      .filter((card) => card.deckId === deck.id)
      .toSorted((left, right) => left.order - right.order)
      .map((card) => ({
        answer: card.answer,
        createdAt: card.createdAt,
        id: card.id,
        lessonId: null,
        audio: true,
        question: card.question,
        updatedAt: card.updatedAt,
      })),
    createdAt: deck.createdAt,
    description: deck.description,
    id: deck.id,
    title: deck.title,
    updatedAt: deck.updatedAt,
    authorId: "bf0b5aa7-18d6-4b36-aae9-5aa93f93235e",
    revision: deck.version ?? 1,
    schema: 1,
    lessons: [],
  });
  const audioFiles = {};
  for (const card of deckPackage.cards) {
    const audioPath = path.join(audioDirectory, `${card.id}.mp3`);
    audioFiles[card.id] = new Uint8Array(await readFile(audioPath));
  }
  const outputPath = path.join(outputDirectory, `${deck.id}.fcrdeck`);
  await writeFile(outputPath, createContractDeckPackageArchive(deckPackage, audioFiles));
  console.log(`Generated ${path.relative(root, outputPath)} (${deckPackage.cards.length} cards).`);
}
