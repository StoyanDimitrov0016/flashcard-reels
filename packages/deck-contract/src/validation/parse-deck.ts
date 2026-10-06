import { DeckSchema, type Deck } from "../deck.schemas.ts";
import { DeckParseError } from "../errors/deck-parse-error.ts";
import { validateDeckRelationships } from "./validate-deck-relationships.ts";
import { toDeckParseIssues } from "./zod-issues.ts";

/** Parses the manifest format before checking relationships between its entries. */
export function parseDeck(input: unknown): Deck {
  const result = DeckSchema.safeParse(input);
  if (!result.success) {
    throw new DeckParseError(toDeckParseIssues(result.error.issues), { cause: result.error });
  }
  validateDeckRelationships(result.data);
  return result.data;
}
