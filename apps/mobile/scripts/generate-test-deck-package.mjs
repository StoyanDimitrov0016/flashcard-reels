import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createDeckPackageArchive } from "../src/features/decks/deck-installer/internal/deck-package-writer.ts";
import { DeckPackageSchema } from "../src/features/decks/deck-installer/internal/deck-package.schema.ts";

const [inputPath, outputPath, ...extraArguments] = process.argv.slice(2);
if (!inputPath || !outputPath || extraArguments.length > 0) {
  console.error("Usage: npm run decks:test:generate -- input.json output.fcrdeck");
  process.exit(2);
}

const inputFilePath = path.resolve(process.cwd(), inputPath);
const destinationPath = path.resolve(process.cwd(), outputPath);
try {
  const input = JSON.parse(await readFile(inputFilePath, "utf8"));
  const createdAt = input.createdAt ?? "2026-01-01T00:00:00.000Z";
  const updatedAt = input.updatedAt ?? createdAt;
  const document = DeckPackageSchema.parse({
    cards: input.cards.map((card, order) => ({
      answer: card.answer,
      createdAt: card.createdAt ?? createdAt,
      id: card.id,
      order,
      question: card.question,
      updatedAt: card.updatedAt ?? updatedAt,
    })),
    createdAt,
    description: input.description,
    id: input.id,
    title: input.title,
    updatedAt,
    version: input.version,
  });
  const inputDirectory = path.dirname(inputFilePath);
  const audioFiles = {};
  for (const card of input.cards) {
    for (const [side, sourcePath] of Object.entries({
      answer: card.answerAudio,
      question: card.questionAudio,
    })) {
      if (!sourcePath) {
        continue;
      }
      const sourceFilePath = path.resolve(inputDirectory, sourcePath);
      const relativeSource = path.relative(inputDirectory, sourceFilePath);
      if (relativeSource.startsWith("..") || path.isAbsolute(relativeSource)) {
        throw new Error(`Audio file must be inside the fixture directory: ${sourcePath}`);
      }
      audioFiles[`audio/${card.id}.${side}.mp3`] = new Uint8Array(await readFile(sourceFilePath));
    }
  }
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await writeFile(destinationPath, createDeckPackageArchive(document, audioFiles));
  console.log(
    `Generated ${path.relative(process.cwd(), destinationPath)} (${document.cards.length} cards).`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not generate deck package");
  process.exitCode = 1;
}
