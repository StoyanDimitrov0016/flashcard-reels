// Rebuild schema 4 R2 snapshots with regenerated local audio. Never writes to R2.
import {
  compareDeckPackages,
  createDeckPackage,
  parseDeckFiles,
  parseDeckPackage,
} from "@flashcard-reels/deck-contract";
import { zipSync } from "fflate";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { readDeckSource } from "./read-deck-source.mjs";

const root = process.cwd();
const published = new Map();
for (const file of await readdir("build/r2-source")) {
  if (!file.endsWith(".fcrdeck")) {
    continue;
  }
  const parsed = parseDeckPackage(
    new Uint8Array(await readFile(path.resolve("build/r2-source", file)))
  );
  if (published.has(parsed.deck.id)) {
    throw new Error(`Duplicate R2 deck ID: ${parsed.deck.id}`);
  }
  published.set(parsed.deck.id, parsed);
}
const archive = {};
const usedIds = new Set();
await mkdir("build/r2-regenerated", { recursive: true });
for (const entry of await readdir("data/decks", { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }
  const source = parseDeckFiles(await readDeckSource(path.resolve("data/decks", entry.name)));
  const previous = published.get(source.deck.id);
  if (!previous) {
    throw new Error(`${entry.name}: no matching R2 snapshot`);
  }
  const comparison = compareDeckPackages(previous, source);
  if (
    comparison.addedCards.length ||
    comparison.changedCards.length ||
    comparison.removedCards.length ||
    comparison.reorderedCardCount ||
    comparison.addedLessons.length ||
    comparison.changedLessons.length ||
    comparison.removedLessons.length ||
    comparison.reorderedLessonCount ||
    source.deck.authorId !== previous.deck.authorId
  ) {
    throw new Error(`${entry.name}: content differs from R2 snapshot`);
  }
  const updatedAt = new Date().toISOString();
  const updated = {
    ...source,
    deck: {
      ...source.deck,
      revision: previous.deck.revision + 1,
      updatedAt,
      cards: source.deck.cards.map((card) => Object.assign({}, card, { updatedAt })),
    },
  };
  for (const id of [
    updated.deck.id,
    ...updated.deck.cards.map((card) => card.id),
    ...updated.deck.lessons.flatMap((lesson) => [
      lesson.id,
      ...lesson.sections.map((section) => section.id),
    ]),
  ]) {
    if (usedIds.has(id)) {
      throw new Error(`ID appears in multiple decks: ${id}`);
    }
    usedIds.add(id);
  }
  const file = `${updated.deck.id}.fcrdeck`;
  const bytes = createDeckPackage(updated);
  await writeFile(path.resolve("build/r2-regenerated", file), bytes);
  archive[file] = bytes;
  console.log(`${entry.name}: r${previous.deck.revision} -> r${updated.deck.revision}, valid`);
}
if (Object.keys(archive).length !== published.size) {
  throw new Error("Local source count differs from R2 snapshots");
}
const output = path.resolve(root, "../..", "flashcard-reels-decks.zip");
await writeFile(output, zipSync(archive, { level: 0 }));
console.log(`Wrote ${output}`);
