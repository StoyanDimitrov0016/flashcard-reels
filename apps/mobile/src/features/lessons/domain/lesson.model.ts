import type { DeckCoverAsset, DeckId } from "@/features/decks/domain/deck.model";
import type { Uuid } from "@/shared/domain/uuid";

export type LessonId = Uuid;
export type LessonSection = Readonly<{ id: Uuid; title: string; body: string }>;

export type LessonFields = Readonly<{
  id: LessonId;
  deckId: DeckId;
  order: number;
  title: string;
  intro: string | null;
  sections: readonly LessonSection[];
}>;

/** Deck-owned reading material. Its content is Markdown from the deck package. */
export class Lesson {
  public readonly id: LessonId;
  public readonly deckId: DeckId;
  public readonly order: number;
  public readonly title: string;
  public readonly intro: string | null;
  public readonly sections: readonly LessonSection[];

  constructor(fields: LessonFields) {
    this.id = fields.id;
    this.deckId = fields.deckId;
    this.order = fields.order;
    this.title = fields.title;
    this.intro = fields.intro;
    this.sections = fields.sections;
  }
}

export type LessonSummary = Readonly<{
  id: LessonId;
  order: number;
  title: string;
}>;

/** One installed deck and its lessons in reading order. */
export type DeckReadingList = Readonly<{
  deckCoverAsset: DeckCoverAsset;
  deckId: DeckId;
  deckTitle: string;
  lessons: readonly LessonSummary[];
}>;
