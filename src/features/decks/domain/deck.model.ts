import { z } from "zod";

import { UuidSchema } from "@/shared/domain/uuid";

export const DeckIdSchema = UuidSchema;
export type DeckId = z.infer<typeof DeckIdSchema>;

const DeckFieldsSchema = z.compile(
  z.object({
    id: DeckIdSchema,
    title: z.string(),
    description: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
);
export type DeckFields = Readonly<z.infer<typeof DeckFieldsSchema>>;

export class Deck {
  public readonly id: DeckId;
  public readonly title: string;
  public readonly description: string;
  public readonly createdAt: string;
  public readonly updatedAt: string;

  constructor(fields: DeckFields) {
    this.id = fields.id;
    this.title = fields.title;
    this.description = fields.description;
    this.createdAt = fields.createdAt;
    this.updatedAt = fields.updatedAt;
  }
}
