import { z } from "zod";

import { DeckIdSchema, type DeckId } from "@/features/decks/domain/deck.model";

export const StudySessionScopeSchema = z.enum(["mixed", "focused"]);
export type StudySessionScope = z.infer<typeof StudySessionScopeSchema>;

export const StudySessionFieldsSchema = z.compile(
  z.object({
    completedAt: z.string().nullable(),
    createdAt: z.string(),
    currentReelPosition: z.number().int().nonnegative(),
    deckId: DeckIdSchema.nullable(),
    id: z.string(),
    scope: StudySessionScopeSchema,
  })
);
export type StudySessionFields = Readonly<z.infer<typeof StudySessionFieldsSchema>>;

export class StudySession {
  public readonly id: string;
  public readonly scope: StudySessionScope;
  public readonly deckId: DeckId | null;
  public readonly currentReelPosition: number;
  public readonly createdAt: string;
  public readonly completedAt: string | null;

  constructor(fields: StudySessionFields) {
    this.completedAt = fields.completedAt;
    this.createdAt = fields.createdAt;
    this.currentReelPosition = fields.currentReelPosition;
    this.deckId = fields.deckId;
    this.id = fields.id;
    this.scope = fields.scope;
  }
}
