import { createDeckPackage, parseDeckFiles } from "@flashcard-reels/deck-contract";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { readDeckSource } from "./read-deck-source.mjs";

const sourceRoot = path.resolve(process.argv[2] ?? "data/decks");
const output = path.resolve(process.env.TECHNICAL_PACKAGE_OUTPUT_DIR ?? "build/decks");
await mkdir(output, { recursive: true });
for (const entry of await readdir(sourceRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }
  const source = parseDeckFiles(await readDeckSource(path.join(sourceRoot, entry.name)));
  const file = path.join(output, `${source.deck.id}.fcrdeck`);
  await writeFile(file, createDeckPackage(source));
  console.log(
    `Generated ${path.relative(process.cwd(), file)} (${source.deck.cards.length} cards).`
  );
}
