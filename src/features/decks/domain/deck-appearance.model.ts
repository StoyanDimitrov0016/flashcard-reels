import type { DeckId } from "@/features/decks/domain/deck.model";

export type DeckAppearanceFields = Readonly<{
  deckId: DeckId;
  accentColor: string;
  backgroundColor: string;
}>;

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
