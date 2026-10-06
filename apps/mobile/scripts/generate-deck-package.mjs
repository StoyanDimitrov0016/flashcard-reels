import { createDeckPackage, parseDeckFiles } from "@flashcard-reels/deck-contract";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { readDeckSource } from "./read-deck-source.mjs";

const [sourceArgument, outputArgument, ...extraArguments] = process.argv.slice(2);
if (!sourceArgument || extraArguments.length > 0) {
  console.error("Usage: npm run decks:generate -- path/to/deck-source [output.fcrdeck]");
  process.exit(2);
}
const source = parseDeckFiles(await readDeckSource(path.resolve(sourceArgument)));
const output = outputArgument
  ? path.resolve(outputArgument)
  : path.resolve("build/decks", `${source.deck.id}.fcrdeck`);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, createDeckPackage(source));
console.log(
  `Generated ${path.relative(process.cwd(), output)}: ${source.deck.title} revision ${source.deck.revision}, ${source.deck.cards.length} cards, ${source.deck.lessons.length} lessons, ${source.audio.size} audio files.`
);
