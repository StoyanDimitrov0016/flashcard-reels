import {
  createDeckPackage,
  parseDeckFiles,
  parseDeckPackage,
} from "@flashcard-reels/deck-contract";
import { zipSync } from "fflate";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { readDeckSource } from "./read-deck-source.mjs";

const root = process.cwd();
const sources = process.argv.slice(2);
if (sources.length === 0) {
  const sourceRoot = path.resolve("data/decks");
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  sources.push(
    ...entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(sourceRoot, entry.name))
  );
}
const archive = {};
const usedIds = new Set();
let cardCount = 0;
let lessonCount = 0;
let audioCount = 0;
await mkdir("build/curated-decks", { recursive: true });
for (const directory of sources) {
  const source = parseDeckFiles(await readDeckSource(path.resolve(directory)));
  const { deck, audio } = source;
  for (const id of [
    deck.id,
    ...deck.cards.map((card) => card.id),
    ...deck.lessons.flatMap((lesson) => [
      lesson.id,
      ...lesson.sections.map((section) => section.id),
    ]),
  ]) {
    if (usedIds.has(id)) {
      throw new Error(`ID ${id} appears in multiple curated decks`);
    }
    usedIds.add(id);
  }
  const bytes = createDeckPackage(source);
  const parsed = parseDeckPackage(bytes);
  if (JSON.stringify(parsed.deck) !== JSON.stringify(deck)) {
    throw new Error(`${directory}: generated content differs from its source`);
  }
  const file = `${deck.id}.fcrdeck`;
  await writeFile(path.resolve("build/curated-decks", file), bytes);
  archive[file] = bytes;
  cardCount += deck.cards.length;
  lessonCount += deck.lessons.length;
  audioCount += audio.size;
}
if (sources.length === 0) {
  throw new Error("No curated deck sources found");
}
const output = path.resolve(root, "../..", "flashcard-reels-decks.zip");
await writeFile(output, zipSync(archive, { level: 0 }));
console.log(
  `Prepared ${sources.length} decks, ${cardCount} cards, ${lessonCount} lessons, ${audioCount} combined audio files in ${path.relative(root, output)}.`
);
