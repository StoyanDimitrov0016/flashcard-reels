import { DeckIdSchema, type DeckId } from "@/features/decks/domain/deck.model";
import { UuidSchema, type Uuid } from "@/shared/domain/uuid";
import { z } from "zod";

export const FlashcardIdSchema = UuidSchema;

export const FlashcardFieldsSchema = z.compile(
  z.object({
    id: FlashcardIdSchema,
    deckId: DeckIdSchema,
    question: z.string(),
    answer: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
);
export type FlashcardFields = Readonly<z.infer<typeof FlashcardFieldsSchema>>;

export type FlashcardId = Uuid;

export class Flashcard {
  public readonly id: FlashcardId;
  public readonly deckId: DeckId;
  public readonly question: string;
  public readonly answer: string;
  public readonly createdAt: string;
  public readonly updatedAt: string;

  constructor(fields: FlashcardFields) {
    this.id = fields.id;
    this.deckId = fields.deckId;
    this.question = fields.question;
    this.answer = fields.answer;
    this.createdAt = fields.createdAt;
    this.updatedAt = fields.updatedAt;
  }
}
