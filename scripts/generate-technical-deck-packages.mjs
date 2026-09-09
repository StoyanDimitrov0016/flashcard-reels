import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { strToU8, zipSync } from "fflate";

import {
  DeckPackageCardSchema,
  DeckPackageManifestSchema,
} from "../src/features/decks/contracts/deck-package.schema.ts";

const root = process.cwd();
const sourceDirectory = path.join(root, "data", "technical_flashcard_library");
const audioDirectory = path.join(root, "assets", "audio", "technical");
const outputDirectory = path.join(root, "assets", "decks");
const decks = JSON.parse(await readFile(path.join(sourceDirectory, "decks.json"), "utf8"));
const flashcards = JSON.parse(
  await readFile(path.join(sourceDirectory, "flashcards.json"), "utf8")
);

await mkdir(outputDirectory, { recursive: true });
for (const deck of decks) {
  const manifest = DeckPackageManifestSchema.parse({
    createdAt: deck.createdAt,
    description: deck.description,
    id: deck.id,
    title: deck.title,
    updatedAt: deck.updatedAt,
    version: deck.version ?? 1,
  });
  const cards = flashcards
    .filter((card) => card.deckId === deck.id)
    .map((card) =>
      DeckPackageCardSchema.parse({
        answer: card.answer,
        answerAudio: `audio/${card.id}.mp3`,
        createdAt: card.createdAt,
        deckId: card.deckId,
        id: card.id,
        position: card.position,
        question: card.question,
        updatedAt: card.updatedAt,
      })
    );
  const archive = {
    "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
    "cards.json": strToU8(JSON.stringify(cards, null, 2)),
  };
  for (const card of cards) {
    const audioPath = path.join(audioDirectory, `${card.id}.mp3`);
    archive[card.answerAudio] = new Uint8Array(await readFile(audioPath));
  }
  const outputPath = path.join(outputDirectory, `${deck.id}.fcrdeck`);
  await writeFile(outputPath, zipSync(archive, { level: 6 }));
  console.log(`Generated ${path.relative(root, outputPath)} (${cards.length} cards).`);
}
