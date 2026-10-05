import {
  assignLessonSectionIds,
  parseDeck,
  validateLessonReferences,
} from "@flashcard-reels/deck-contract";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  recoverLessonSectionMigration,
  writeLessonSectionMigration,
} from "./lesson-section-migration.transaction.mjs";

const directories = process.argv.slice(2);
if (directories.length === 0) {
  throw new Error("Usage: node scripts/migrate-lesson-section-ids.mjs <source-directory> [...]");
}

for (const source of directories) {
  const directory = path.resolve(source);
  if (await recoverLessonSectionMigration(directory)) {
    console.log(`Recovered section migration: ${directory}`);
  }
  const manifestPath = path.join(directory, "deck.json");
  const originalText = await readFile(manifestPath, "utf8");
  const originalManifest = JSON.parse(originalText);
  const deck = parseDeck(originalManifest);
  const originals = new Map();
  for (const lesson of deck.lessons) {
    originals.set(
      lesson.id,
      await readFile(path.join(directory, "lessons", `${lesson.id}.md`), "utf8")
    );
  }
  validateLessonReferences(deck, originals);
  if (deck.schema === 3) {
    console.log(`Already migrated: ${deck.title}`);
    continue;
  }
  const converted = new Map();
  const replacements = new Map();
  for (const lesson of deck.lessons) {
    const result = assignLessonSectionIds(originals.get(lesson.id), lesson.title, randomUUID);
    converted.set(lesson.id, result.markdown);
    replacements.set(lesson.id, result.sectionIds);
  }
  const updatedAt = new Date().toISOString();
  const updatedManifest = {
    ...originalManifest,
    schema: 3,
    revision: deck.revision + 1,
    updatedAt,
    cards: originalManifest.cards.map((card) => {
      if (!card.lessonSectionId) {
        return card;
      }
      const id = replacements.get(card.lessonId)?.get(card.lessonSectionId);
      if (!id) {
        throw new Error(`Cannot migrate reference on card ${card.id}`);
      }
      return Object.assign({}, card, { lessonSectionId: id, updatedAt });
    }),
  };
  const updated = parseDeck(updatedManifest);
  validateLessonReferences(updated, converted);
  await writeLessonSectionMigration(directory, [
    ...deck.lessons.map((lesson) => ({
      path: `lessons/${lesson.id}.md`,
      before: originals.get(lesson.id),
      after: converted.get(lesson.id),
    })),
    {
      path: "deck.json",
      before: originalText,
      after: `${JSON.stringify(updatedManifest, null, 2)}\n`,
    },
  ]);
  console.log(`Migrated ${deck.title}: schema 3, revision ${updated.revision}`);
}
