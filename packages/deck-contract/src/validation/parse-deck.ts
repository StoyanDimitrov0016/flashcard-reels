import { DeckSchema, type Deck } from "../deck.schemas";
import { DeckParseError } from "../errors/deck-parse-error";
import { validateDeckRelationships } from "./validate-deck-relationships";
import { toDeckParseIssues } from "./zod-issues";

/** Parses the manifest format before checking relationships between its entries. */
export function parseDeck(input: unknown): Deck {
  const result = DeckSchema.safeParse(input);
  if (!result.success) {
    throw new DeckParseError(toDeckParseIssues(result.error.issues), { cause: result.error });
  }
  validateDeckRelationships(result.data);
  return result.data;
}
