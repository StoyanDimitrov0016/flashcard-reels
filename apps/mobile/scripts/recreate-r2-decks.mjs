// Rebuild curated packages from downloaded R2 snapshots in build/r2-source and
// generated local card audio. Outputs and R2 snapshots stay outside Git.
import { parseDeckPackage } from "@flashcard-reels/deck-contract";
import { zipSync } from "fflate";
import { readFile, readdir, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { createContractDeckPackageArchive } from "../src/features/decks/deck-installer/internal/contract-deck-package-writer.ts";

const root = process.cwd();
const r2Directory = path.join(root, "build", "r2-source");
const deckSources = path.join(root, "data", "decks");
const outputDirectory = path.join(root, "build", "r2-regenerated");
const bundlePath = path.resolve(root, "..", "..", "flashcard-reels-decks.zip");

const published = new Map();
for (const fileName of await readdir(r2Directory)) {
  if (!fileName.endsWith(".fcrdeck")) {
    continue;
  }
  const bytes = new Uint8Array(await readFile(path.join(r2Directory, fileName)));
  const parsed = parseDeckPackage(bytes);
  if (published.has(parsed.deck.id)) {
    throw new Error(`Duplicate R2 deck ID: ${parsed.deck.id}`);
  }
  published.set(parsed.deck.id, parsed);
}

const archive = {};
const usedIds = new Set();
const sourceEntries = await readdir(deckSources, { withFileTypes: true });
const sourceNames = sourceEntries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .toSorted();

for (const sourceName of sourceNames) {
  const sourceDirectory = path.join(deckSources, sourceName);
  const localDeck = JSON.parse(await readFile(path.join(sourceDirectory, "deck.json"), "utf8"));
  const r2 = published.get(localDeck.id);
  if (!r2) {
    throw new Error(`${sourceName}: no matching R2 package`);
  }
  const deck = r2.deck;
  if (
    localDeck.authorId !== deck.authorId ||
    localDeck.cards.length !== deck.cards.length ||
    localDeck.lessons.length !== deck.lessons.length
  ) {
    throw new Error(`${sourceName}: local identity or counts differ from R2`);
  }
  for (const [index, card] of deck.cards.entries()) {
    const local = localDeck.cards[index];
    if (
      local.id !== card.id ||
      local.question !== card.question ||
      local.answer !== card.answer ||
      local.lessonId !== card.lessonId
    ) {
      throw new Error(`${sourceName}: card ${index} differs from R2`);
    }
  }
  for (const [index, lesson] of deck.lessons.entries()) {
    const local = localDeck.lessons[index];
    const markdown = await readFile(
      path.join(sourceDirectory, "lessons", `${lesson.id}.md`),
      "utf8"
    );
    if (
      local.id !== lesson.id ||
      local.title !== lesson.title ||
      markdown !== r2.lessonFiles.get(lesson.id)
    ) {
      throw new Error(`${sourceName}: lesson ${index} differs from R2`);
    }
  }

  const audioFiles = {};
  const modificationTimes = [];
  for (const card of deck.cards) {
    const audioPath = path.join(sourceDirectory, "audio", `${card.id}.mp3`);
    audioFiles[card.id] = new Uint8Array(await readFile(audioPath));
    const audioStats = await stat(audioPath);
    modificationTimes.push(audioStats.mtimeMs);
  }
  const updatedAt = new Date(Math.max(...modificationTimes)).toISOString();
  if (updatedAt <= deck.updatedAt) {
    throw new Error(`${sourceName}: regenerated audio is not newer than the R2 deck`);
  }
  const updatedDeck = {
    ...deck,
    revision: deck.revision + 1,
    updatedAt,
    cards: deck.cards.map((card) => ({ ...card, audio: true, updatedAt })),
  };
  for (const id of [
    updatedDeck.id,
    ...updatedDeck.cards.map((card) => card.id),
    ...updatedDeck.lessons.map((lesson) => lesson.id),
  ]) {
    if (usedIds.has(id)) {
      throw new Error(`ID appears in multiple decks: ${id}`);
    }
    usedIds.add(id);
  }

  const lessonFiles = Object.fromEntries(r2.lessonFiles);
  const packageBytes = createContractDeckPackageArchive(updatedDeck, audioFiles, lessonFiles);
  const parsed = parseDeckPackage(packageBytes);
  if (
    parsed.audioFiles.size !== updatedDeck.cards.length ||
    parsed.lessonFiles.size !== updatedDeck.lessons.length
  ) {
    throw new Error(`${sourceName}: regenerated package assets are incomplete`);
  }
  await mkdir(outputDirectory, { recursive: true });
  const fileName = `${updatedDeck.id}.fcrdeck`;
  await writeFile(path.join(outputDirectory, fileName), packageBytes);
  await mkdir(path.join(outputDirectory, "manifests"), { recursive: true });
  await writeFile(
    path.join(outputDirectory, "manifests", `${sourceName}.json`),
    `${JSON.stringify(updatedDeck, null, 2)}\n`
  );
  archive[fileName] = packageBytes;
  console.log(
    `${sourceName}: r${deck.revision} -> r${updatedDeck.revision}, ${updatedDeck.cards.length} audio cards, ${updatedDeck.lessons.length} lessons, ${packageBytes.length} bytes, valid`
  );
}

if (Object.keys(archive).length !== published.size) {
  throw new Error(
    `Local sources ${Object.keys(archive).length} do not match R2 packages ${published.size}`
  );
}
await writeFile(bundlePath, zipSync(archive, { level: 0 }));
console.log(`Wrote ${bundlePath}`);
