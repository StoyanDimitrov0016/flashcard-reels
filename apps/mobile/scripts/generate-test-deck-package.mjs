import { createDeckPackage, parseDeckFiles } from "@flashcard-reels/deck-contract";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { readDeckSource } from "./read-deck-source.mjs";

const [input, output, ...extraArguments] = process.argv.slice(2);
if (!input || !output || extraArguments.length > 0) {
  console.error("Usage: npm run decks:test:generate -- input.json output.fcrdeck");
  process.exit(2);
}
try {
  const source = parseDeckFiles(await readDeckSource(path.dirname(path.resolve(input))));
  const destination = path.resolve(output);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, createDeckPackage(source));
  console.log(
    `Generated ${path.relative(process.cwd(), destination)} (${source.deck.cards.length} cards).`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not generate deck package");
  process.exitCode = 1;
}
