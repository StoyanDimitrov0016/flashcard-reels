import { parseDeckPackage } from "@flashcard-reels/deck-contract";
import { readFile } from "node:fs/promises";
import path from "node:path";

const [inputPath, ...extraArguments] = process.argv.slice(2);
if (!inputPath || extraArguments.length > 0) {
  console.error("Usage: npm run decks:inspect -- path/to/deck.fcrdeck");
  process.exit(2);
}

const resolvedPath = path.resolve(process.cwd(), inputPath);
try {
  const bytes = new Uint8Array(await readFile(resolvedPath));
  const { deck, audioFiles } = parseDeckPackage(bytes);

  console.log(`File: ${resolvedPath}`);
  console.log(`Deck ID: ${deck.id}`);
  console.log(`Title: ${deck.title}`);
  console.log(`Schema: ${deck.schema}`);
  console.log(`Revision: ${deck.revision}`);
  console.log(`Cards: ${deck.cards.length}`);
  console.log(`Combined audio: ${audioFiles.size}`);
  console.log(`Lessons: ${deck.lessons.length}`);
  console.log(`Package size: ${bytes.byteLength} bytes`);
  console.log("Validation: passed");
} catch (error) {
  const reason = error instanceof Error ? error.message : "unknown package error";
  console.error(`Validation: failed - ${reason}`);
  process.exitCode = 1;
}
