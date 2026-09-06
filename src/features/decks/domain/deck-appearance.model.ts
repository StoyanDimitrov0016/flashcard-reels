import { DeckIdSchema, type DeckId } from "@/features/decks/domain/deck.model";
import { z } from "zod";

const DeckAppearanceFieldsSchema = z.compile(
  z.object({
    deckId: DeckIdSchema,
    accentColor: z.string(),
    backgroundColor: z.string(),
  })
);
export type DeckAppearanceFields = Readonly<z.infer<typeof DeckAppearanceFieldsSchema>>;

export class DeckAppearance {
  public readonly deckId: DeckId;
  public readonly accentColor: string;
  public readonly backgroundColor: string;

  constructor(fields: DeckAppearanceFields) {
    this.deckId = fields.deckId;
    this.accentColor = fields.accentColor;
    this.backgroundColor = fields.backgroundColor;
  }
}
