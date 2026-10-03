import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Uuid } from "@/shared/domain/uuid";

export type FlashcardFields = Readonly<{
  id: Uuid;
  deckId: DeckId;
  order: number;
  active: boolean;
  hasAudio: boolean;
  question: string;
  answer: string;
  lessonId: Uuid | null;
  lessonSectionId?: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type FlashcardId = Uuid;

export class Flashcard {
  public readonly id: FlashcardId;
  public readonly deckId: DeckId;
  public readonly order: number;
  public readonly active: boolean;
  public readonly hasAudio: boolean;
  public readonly question: string;
  public readonly answer: string;
  public readonly lessonId: Uuid | null;
  public readonly lessonSectionId: string | null;
  public readonly createdAt: string;
  public readonly updatedAt: string;

  constructor(fields: FlashcardFields) {
    this.id = fields.id;
    this.deckId = fields.deckId;
    this.order = fields.order;
    this.active = fields.active;
    this.hasAudio = fields.hasAudio;
    this.question = fields.question;
    this.answer = fields.answer;
    this.lessonId = fields.lessonId;
    this.lessonSectionId = fields.lessonSectionId ?? null;
    this.createdAt = fields.createdAt;
    this.updatedAt = fields.updatedAt;
  }
}
