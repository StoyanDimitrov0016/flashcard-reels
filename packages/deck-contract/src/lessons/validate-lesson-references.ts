import type { Deck } from "../deck.schemas.ts";

import { DeckPackageParseError } from "../errors/deck-package-parse-error.ts";
import { parseLessonDocument } from "./lesson-document.ts";

/** Shared by full archive validation and the portal's audio-free package reader. */
export function validateLessonReferences(
  deck: Deck,
  lessonFiles: ReadonlyMap<string, string>
): void {
  if (!deck.cards.some((card) => (card.lessonSectionId ?? null) !== null)) {
    return;
  }
  const sectionIds = new Map(
    deck.lessons.map((lesson) => [
      lesson.id,
      new Set(
        parseLessonDocument(lessonFiles.get(lesson.id) ?? "", lesson.title).sections.map(
          (section) => section.id
        )
      ),
    ])
  );
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
