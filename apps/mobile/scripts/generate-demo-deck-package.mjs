import { createDeckPackage, parseDeckFiles } from "@flashcard-reels/deck-contract";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { readDeckSource } from "./read-deck-source.mjs";

const source = parseDeckFiles(await readDeckSource(path.resolve("data/demo-deck")));
const output = process.env.DEMO_PACKAGE_OUTPUT
  ? path.resolve(process.env.DEMO_PACKAGE_OUTPUT)
  : path.resolve("assets/decks", `${source.deck.id}.fcrdeck`);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, createDeckPackage(source));
console.log(
  `Generated ${path.relative(process.cwd(), output)} (${source.deck.cards.length} cards, ${source.deck.lessons.length} lessons).`
);
