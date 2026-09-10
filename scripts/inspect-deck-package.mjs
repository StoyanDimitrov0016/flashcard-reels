import { readFile } from "node:fs/promises";
import path from "node:path";

import { ArchiveDeckPackageReader } from "../src/features/decks/deck-installer/internal/archive-deck-package.reader.ts";

const [inputPath, ...extraArguments] = process.argv.slice(2);
if (!inputPath || extraArguments.length > 0) {
  console.error("Usage: npm run decks:inspect -- path/to/deck.fcrdeck");
  process.exit(2);
}

const resolvedPath = path.resolve(process.cwd(), inputPath);
try {
  const bytes = new Uint8Array(await readFile(resolvedPath));
  const deck = new ArchiveDeckPackageReader().read(bytes);
  let answerAudioCount = 0;
  let questionAudioCount = 0;
  for (const audioPath of deck.audioFiles.keys()) {
    if (audioPath.endsWith(".answer.mp3")) {
      answerAudioCount += 1;
    } else if (audioPath.endsWith(".question.mp3")) {
      questionAudioCount += 1;
    }
  }

  console.log(`File: ${resolvedPath}`);
  console.log(`Deck ID: ${deck.id}`);
  console.log(`Title: ${deck.title}`);
  console.log(`Version: ${deck.version}`);
  console.log(`Cards: ${deck.cards.length}`);
  console.log(`Answer audio: ${answerAudioCount}`);
  console.log(`Question audio: ${questionAudioCount}`);
  console.log(`Package size: ${bytes.byteLength} bytes`);
  console.log("Validation: passed");
} catch (error) {
  const reason = error instanceof Error ? error.message : "unknown package error";
  console.error(`Validation: failed - ${reason}`);
  process.exitCode = 1;
}
