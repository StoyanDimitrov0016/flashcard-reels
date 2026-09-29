import { parseDeck, parseDeckPackage } from "@flashcard-reels/deck-contract";
import { zipSync } from "fflate";
import { execFile } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = process.cwd();

/** @param {string} name @param {string} fallback */
function option(name, fallback) {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : fallback;
}

// Prod decks by default; `decks:dev:prepare` passes the dev deck folders.
const sources = path.resolve(root, option("source", "data/decks"));
const packagesDirectory = path.resolve(root, option("packages", "build/curated-decks"));
const output = path.resolve(root, "..", "..", option("output", "flashcard-reels-decks.zip"));
const archive = {};
/** @type {Map<string, string>} */
const usedIds = new Map();
let cardCount = 0;
let lessonCount = 0;
let audioCount = 0;

/** @param {string} id @param {string} kind @param {string} directory */
function claimId(id, kind, directory) {
  const owner = usedIds.get(id);
  if (owner) {
    throw new Error(`${kind} ID ${id} appears in both ${owner} and ${directory}`);
  }
  usedIds.set(id, directory);
}

const sourceEntries = await readdir(sources, { withFileTypes: true });
for (const directory of sourceEntries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .toSorted()) {
  const source = path.join(sources, directory);
  const deck = parseDeck(JSON.parse(await readFile(path.join(source, "deck.json"), "utf8")));
  const packagePath = path.join(packagesDirectory, `${deck.id}.fcrdeck`);
  const { stdout } = await run(
    process.execPath,
    [path.join(root, "scripts", "generate-deck-package.mjs"), source, packagePath],
    { cwd: root }
  );
  process.stdout.write(stdout);

  const bytes = new Uint8Array(await readFile(packagePath));
  const parsed = parseDeckPackage(bytes);
  if (JSON.stringify(parsed.deck) !== JSON.stringify(deck)) {
    throw new Error(`${directory}: generated manifest differs from its source`);
  }
  claimId(deck.id, "deck", directory);
  for (const card of deck.cards) {
    claimId(card.id, "card", directory);
  }
  for (const lesson of deck.lessons) {
    claimId(lesson.id, "lesson", directory);
  }
  archive[`${deck.id}.fcrdeck`] = bytes;
  cardCount += deck.cards.length;
  lessonCount += deck.lessons.length;
  audioCount += parsed.audioFiles.size;
}

if (Object.keys(archive).length === 0) {
  throw new Error(`No deck sources found in ${path.relative(root, sources)}`);
}
await writeFile(output, zipSync(archive, { level: 0 }));
console.log(
  `Prepared ${Object.keys(archive).length} decks, ${cardCount} cards, ${lessonCount} lessons, ` +
    `${audioCount} combined audio files in ${path.relative(root, output)}.`
);
