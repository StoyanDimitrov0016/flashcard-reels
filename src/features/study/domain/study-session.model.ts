import { z } from "zod";

import { DeckIdSchema, type DeckId } from "@/features/decks/domain/deck.model";

export const StudySessionModeSchema = z.enum(["mixed", "focused"]);
export type StudySessionMode = z.infer<typeof StudySessionModeSchema>;

export const StudySessionFieldsSchema = z.compile(
  z.object({
    completedAt: z.string().nullable(),
    createdAt: z.string(),
    currentPosition: z.number().int().nonnegative(),
    deckId: DeckIdSchema.nullable(),
    id: z.string(),
    mode: StudySessionModeSchema,
  })
);
export type StudySessionFields = Readonly<z.infer<typeof StudySessionFieldsSchema>>;

export class StudySession {
  public readonly id: string;
  public readonly mode: StudySessionMode;
  public readonly deckId: DeckId | null;
  public readonly currentPosition: number;
  public readonly createdAt: string;
  public readonly completedAt: string | null;

  constructor(fields: StudySessionFields) {
    this.completedAt = fields.completedAt;
    this.createdAt = fields.createdAt;
    this.currentPosition = fields.currentPosition;
    this.deckId = fields.deckId;
    this.id = fields.id;
    this.mode = fields.mode;
  }
}
