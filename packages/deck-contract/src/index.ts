import type { Deck } from "./deck.schemas";

import { DeckValidator } from "./deck.validator";

const deckValidator = new DeckValidator();

export function parseDeck(input: unknown): Deck {
  return deckValidator.parse(input);
}

export { DeckParseError } from "./deck.errors";
export type { DeckParseIssue } from "./deck.errors";
export type { Deck, Flashcard, Lesson } from "./deck.schemas";
