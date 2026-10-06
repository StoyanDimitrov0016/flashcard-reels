import type { DeckPackage, Flashcard, Lesson } from "../deck.types.ts";

type PublicationCard = Readonly<{ id: string; question: string }>;
type PublicationLesson = Readonly<{ id: string; title: string }>;
export type DeckComparison = Readonly<{
  addedCards: readonly PublicationCard[];
  changedCards: readonly PublicationCard[];
  removedCards: readonly PublicationCard[];
  reorderedCardCount: number;
  addedLessons: readonly PublicationLesson[];
  changedLessons: readonly PublicationLesson[];
  removedLessons: readonly PublicationLesson[];
  reorderedLessonCount: number;
  metadataChanged: boolean;
  audioChanged: boolean;
  warnings: readonly string[];
}>;

function compareEntries<T extends Readonly<{ id: string }>>(
  published: readonly T[],
  candidate: readonly T[],
  changed: (left: T, right: T) => boolean
) {
  const oldEntries = new Map(published.map((entry, index) => [entry.id, { entry, index }]));
  const newIds = new Set(candidate.map((entry) => entry.id));
  return {
    added: candidate.filter((entry) => !oldEntries.has(entry.id)),
    removed: published.filter((entry) => !newIds.has(entry.id)),
    changed: candidate.filter((entry) => {
      const old = oldEntries.get(entry.id);
      return old !== undefined && changed(old.entry, entry);
    }),
    reordered: candidate.filter((entry, index) => {
      const old = oldEntries.get(entry.id);
      return old !== undefined && old.index !== index;
    }).length,
  };
}

function sameCard(left: Flashcard, right: Flashcard): boolean {
  return (
    left.question === right.question &&
    left.answer === right.answer &&
    left.lessonId === right.lessonId &&
    left.lessonSectionId === right.lessonSectionId
  );
}

function sameLesson(left: Lesson, right: Lesson): boolean {
  return (
    left.title === right.title &&
    left.intro === right.intro &&
    left.sections.length === right.sections.length &&
    left.sections.every((section, index) => {
      const other = right.sections[index];
      return (
        other !== undefined &&
        section.id === other.id &&
        section.title === other.title &&
        section.body === other.body
      );
    })
  );
}

function sameAudio(left: DeckPackage["audio"], right: DeckPackage["audio"]): boolean {
  return (
    left.size === right.size &&
    [...left].every(([id, bytes]) => {
      const other = right.get(id);
      return (
        other !== undefined &&
        bytes.length === other.length &&
        bytes.every((byte, index) => byte === other[index])
      );
    })
  );
}

function cardLabel({ id, question }: Flashcard) {
  return { id, question };
}
function lessonLabel({ id, title }: Lesson) {
  return { id, title };
}

export function compareDeckPackages(
  published: DeckPackage,
  candidate: DeckPackage
): DeckComparison {
  const oldDeck = published.deck;
  const newDeck = candidate.deck;
  const cards = compareEntries(
    oldDeck.cards,
    newDeck.cards,
    (left, right) => !sameCard(left, right)
  );
  const lessons = compareEntries(
    oldDeck.lessons,
    newDeck.lessons,
    (left, right) => !sameLesson(left, right)
  );
  const warnings: string[] = [];
  for (const removed of cards.removed) {
    const replacement = cards.added.find(
      (added) => added.question === removed.question || added.answer === removed.answer
    );
    if (replacement) {
      warnings.push(
        `Card "${removed.question}" was removed (${removed.id}) and a card with the same text was added (${replacement.id}). If it teaches the same thing, keep the original ID so learners keep their progress.`
      );
    }
  }
  for (const lesson of oldDeck.lessons) {
    const replacementLesson = newDeck.lessons.find((entry) => entry.id === lesson.id);
    if (!replacementLesson) {
      continue;
    }
    const sections = compareEntries(lesson.sections, replacementLesson.sections, () => false);
    for (const removed of sections.removed) {
      const replacement = sections.added.find((added) => added.title === removed.title);
      if (replacement) {
        warnings.push(
          `Section "${removed.title}" in lesson ${lesson.id} was removed (${removed.id}) and a section with the same title was added (${replacement.id}); keep the original section ID so card links stay attached.`
        );
      }
    }
  }
  return {
    addedCards: cards.added.map(cardLabel),
    changedCards: cards.changed.map(cardLabel),
    removedCards: cards.removed.map(cardLabel),
    reorderedCardCount: cards.reordered,
    addedLessons: lessons.added.map(lessonLabel),
    changedLessons: lessons.changed.map(lessonLabel),
    removedLessons: lessons.removed.map(lessonLabel),
    reorderedLessonCount: lessons.reordered,
    audioChanged: !sameAudio(published.audio, candidate.audio),
    metadataChanged:
      oldDeck.authorId !== newDeck.authorId ||
      oldDeck.schema !== newDeck.schema ||
      oldDeck.title !== newDeck.title ||
      oldDeck.description !== newDeck.description ||
      oldDeck.createdAt !== newDeck.createdAt ||
      oldDeck.updatedAt !== newDeck.updatedAt ||
      newDeck.cards.some((card) => {
        const old = oldDeck.cards.find((entry) => entry.id === card.id);
        return (
          old !== undefined &&
          (old.createdAt !== card.createdAt || old.updatedAt !== card.updatedAt)
        );
      }),
    warnings,
  };
}
