import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeckPackageSchema } from "../src/features/decks/deck-installer/internal/deck-package.schema.ts";
import { createDeckPackageArchive } from "../src/features/decks/deck-installer/internal/deck-package-writer.ts";

const root = process.cwd();
const sourceDirectory = path.join(root, "data", "technical_flashcard_library");
const audioDirectory = path.join(sourceDirectory, "audio");
const outputDirectory = path.join(root, "assets", "decks");
const decks = JSON.parse(await readFile(path.join(sourceDirectory, "decks.json"), "utf8"));
const flashcards = JSON.parse(
  await readFile(path.join(sourceDirectory, "flashcards.json"), "utf8")
);

await mkdir(outputDirectory, { recursive: true });
for (const deck of decks) {
  const deckPackage = DeckPackageSchema.parse({
    cards: flashcards
      .filter((card) => card.deckId === deck.id)
      .map((card) => ({
        answer: card.answer,
        createdAt: card.createdAt,
        id: card.id,
        order: card.order,
        question: card.question,
        updatedAt: card.updatedAt,
      })),
    createdAt: deck.createdAt,
    description: deck.description,
    id: deck.id,
    title: deck.title,
    updatedAt: deck.updatedAt,
    version: deck.version ?? 1,
  });
  const audioFiles = {};
  for (const card of deckPackage.cards) {
    const audioPath = path.join(audioDirectory, `${card.id}.mp3`);
    audioFiles[`audio/${card.id}.answer.mp3`] = new Uint8Array(await readFile(audioPath));
  }
  const outputPath = path.join(outputDirectory, `${deck.id}.fcrdeck`);
  await writeFile(outputPath, createDeckPackageArchive(deckPackage, audioFiles));
  console.log(`Generated ${path.relative(root, outputPath)} (${deckPackage.cards.length} cards).`);
}
