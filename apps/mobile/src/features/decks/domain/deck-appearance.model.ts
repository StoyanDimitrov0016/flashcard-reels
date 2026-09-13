import type { DeckId } from "@/features/decks/domain/deck.model";

const deckAppearancePresetIds = [
  "graphite",
  "gold",
  "orange",
  "rose",
  "violet",
  "blue",
  "cyan",
  "emerald",
  "lime",
  "stone",
] as const;

export type DeckAppearancePresetId = (typeof deckAppearancePresetIds)[number];

export function isDeckAppearancePresetId(value: string): value is DeckAppearancePresetId {
  return (deckAppearancePresetIds as readonly string[]).includes(value);
}

export type DeckAppearanceFields = Readonly<{
  deckId: DeckId;
  presetId: DeckAppearancePresetId;
}>;

export class DeckAppearance {
  public readonly deckId: DeckId;
  public readonly presetId: DeckAppearancePresetId;

  constructor(fields: DeckAppearanceFields) {
    this.deckId = fields.deckId;
    this.presetId = fields.presetId;
  }
}
