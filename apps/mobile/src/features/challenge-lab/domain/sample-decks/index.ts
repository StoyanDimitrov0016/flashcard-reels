import type { Idea, IdeaDeck } from "../idea-deck";

import { databasesDeck } from "./databases";
import { javascriptDeck } from "./javascript";
import { networkingDeck } from "./networking";
import { systemDesignDeck } from "./system-design";

export const sampleIdeaDecks: readonly IdeaDeck[] = [
  systemDesignDeck,
  javascriptDeck,
  databasesDeck,
  networkingDeck,
];

/** Every sample idea, taking one from each deck in turn, so new ideas alternate between decks. */
export const interleavedSampleIdeas: readonly Idea[] = Array.from(
  { length: Math.max(...sampleIdeaDecks.map((deck) => deck.ideas.length)) },
  (_, index) => sampleIdeaDecks.flatMap((deck) => deck.ideas.slice(index, index + 1))
).flat();
