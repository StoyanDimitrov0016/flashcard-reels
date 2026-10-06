import { parseDeck } from "@flashcard-reels/deck-contract";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createContractDeckPackageArchive } from "../src/features/decks/deck-installer/internal/contract-deck-package-writer.ts";

const [inputPath, outputPath, ...extraArguments] = process.argv.slice(2);
if (!inputPath || !outputPath || extraArguments.length > 0) {
  console.error("Usage: npm run decks:test:generate -- input.json output.fcrdeck");
  process.exit(2);
}

const inputFilePath = path.resolve(process.cwd(), inputPath);
const destinationPath = path.resolve(process.cwd(), outputPath);
try {
  const document = parseDeck(JSON.parse(await readFile(inputFilePath, "utf8")));
  const inputDirectory = path.dirname(inputFilePath);
  const audioFiles = {};
  for (const card of document.cards) {
    if (card.audio) {
      audioFiles[card.id] = new Uint8Array(
        await readFile(path.join(inputDirectory, "audio", `${card.id}.mp3`))
      );
    }
  }
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await writeFile(destinationPath, createContractDeckPackageArchive(document, audioFiles));
  console.log(
    `Generated ${path.relative(process.cwd(), destinationPath)} (${document.cards.length} cards).`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not generate deck package");
  process.exitCode = 1;
}
