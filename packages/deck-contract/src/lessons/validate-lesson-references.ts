import type { Deck } from "../deck.schemas.ts";

import { DeckPackageParseError } from "../errors/deck-package-parse-error.ts";
import { LessonMarkdownParseError } from "../errors/lesson-markdown-parse-error.ts";
import { parseLessonDocument, type LessonDocument } from "./lesson-document.ts";

/** Shared by full archive validation and the portal's audio-free package reader. */
export function validateLessonReferences(
  deck: Deck,
  lessonFiles: ReadonlyMap<string, string>
): void {
  const sectionIds = new Map<string, Set<string>>();
  for (const [index, lesson] of deck.lessons.entries()) {
    const path = ["lessons", index];
    const markdown = lessonFiles.get(lesson.id);
    if (markdown === undefined) {
      throw new DeckPackageParseError([{ message: `Missing lesson ${lesson.id}`, path }]);
    }
    let document: LessonDocument;
    try {
      document = parseLessonDocument(markdown, lesson.title);
    } catch (error) {
      if (!(error instanceof LessonMarkdownParseError)) {
        throw error;
      }
      throw new DeckPackageParseError(
        [{ message: `Lesson ${lesson.id}: ${error.message}`, path }],
        { cause: error, context: { lessonId: lesson.id, line: error.line } }
      );
    }
    if (
      deck.schema < 3 &&
      document.blocks.some((block) => block.type === "heading" && block.sectionId)
    ) {
      throw new DeckPackageParseError([
        {
          message: `Lesson ${lesson.id}: Permanent section markers require package schema 3`,
          path,
        },
      ]);
    }
    if (
      deck.schema === 3 &&
      document.blocks.some((block) => block.type === "heading" && !block.sectionId)
    ) {
      throw new DeckPackageParseError([
        {
          message: `Lesson ${lesson.id}: Schema 3 requires a permanent section marker before every section heading`,
          path,
        },
      ]);
    }
    sectionIds.set(lesson.id, new Set(document.sections.map((section) => section.id)));
  }
  for (const [index, card] of deck.cards.entries()) {
    const sectionId = card.lessonSectionId ?? null;
    if (sectionId !== null && (!card.lessonId || !sectionIds.get(card.lessonId)?.has(sectionId))) {
      throw new DeckPackageParseError([
        {
          message: `Card ${card.id} references missing section ${card.lessonSectionId} in lesson ${card.lessonId}`,
          path: ["cards", index, "lessonSectionId"],
        },
      ]);
    }
  }
}
