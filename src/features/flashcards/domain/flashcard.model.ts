import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Uuid } from "@/shared/domain/uuid";

export type FlashcardFields = Readonly<{
  id: Uuid;
  deckId: DeckId;
  deckPosition: number;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}>;

export type FlashcardId = Uuid;

export class Flashcard {
  public readonly id: FlashcardId;
  public readonly deckId: DeckId;
  public readonly deckPosition: number;
  public readonly question: string;
  public readonly answer: string;
  public readonly createdAt: string;
  public readonly updatedAt: string;

  constructor(fields: FlashcardFields) {
    this.id = fields.id;
    this.deckId = fields.deckId;
    this.deckPosition = fields.deckPosition;
    this.question = fields.question;
    this.answer = fields.answer;
    this.createdAt = fields.createdAt;
    this.updatedAt = fields.updatedAt;
  }
}
