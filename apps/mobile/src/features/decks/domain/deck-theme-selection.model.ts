import type { DeckId } from "@/features/decks/domain/deck.model";

const deckThemeIds = [
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

export type DeckThemeId = (typeof deckThemeIds)[number];

/** The theme a deck uses until the learner picks one, and when a stored theme is unknown. */
export const DEFAULT_DECK_THEME_ID: DeckThemeId = "graphite";

export function isDeckThemeId(value: string): value is DeckThemeId {
  return (deckThemeIds as readonly string[]).includes(value);
}

export type DeckThemeSelectionFields = Readonly<{
  deckId: DeckId;
  theme: DeckThemeId;
}>;

export class DeckThemeSelection {
  public readonly deckId: DeckId;
  public readonly theme: DeckThemeId;

  constructor(fields: DeckThemeSelectionFields) {
    this.deckId = fields.deckId;
    this.theme = fields.theme;
  }
}
