import type { IdeaDeck } from "@/features/challenge-lab/domain/idea-deck";
import type { DeckThemeId } from "@/features/decks/domain/deck-theme-selection.model";

import { sampleIdeaDecks } from "@/features/challenge-lab/domain/sample-decks";
import { Deck, type DeckCoverAsset } from "@/features/decks/domain/deck.model";
import { Flashcard } from "@/features/flashcards/domain/flashcard.model";

/** Where an idea sits: the deck and card the production header reads, and the deck's theme. */
export type IdeaPlacement = Readonly<{
  card: Flashcard;
  deck: Deck;
  deckCardCount: number;
  theme: DeckThemeId;
}>;

// A theme is the learner's choice in the app, never package content, so the lab picks them here.
const labDeckLooks: Readonly<Record<string, { cover: DeckCoverAsset; theme: DeckThemeId }>> = {
  "deck-system-design": { cover: "system-design", theme: "blue" },
  "deck-javascript": { cover: "javascript", theme: "gold" },
  "deck-databases": { cover: "database", theme: "emerald" },
  "deck-networking": { cover: "computer-science", theme: "violet" },
};

const labTimestamp = "2026-10-08T00:00:00.000Z";

function placeDeck(ideaDeck: IdeaDeck): [string, IdeaPlacement][] {
  const look = labDeckLooks[ideaDeck.id] ?? { cover: "cards", theme: "graphite" };
  const deck = new Deck({
    id: ideaDeck.id,
    title: ideaDeck.title,
    description: ideaDeck.description,
    coverAsset: look.cover,
    revision: ideaDeck.revision,
    createdAt: labTimestamp,
    updatedAt: labTimestamp,
  });
  // Each idea counts as one card, which is how a schema 5 deck would show its size.
  return ideaDeck.ideas.map((idea, order) => [
    idea.id,
    {
      card: new Flashcard({
        id: idea.id,
        deckId: deck.id,
        order,
        active: true,
        hasAudio: false,
        question: idea.title,
        answer: idea.statement,
        lessonId: null,
        createdAt: labTimestamp,
        updatedAt: labTimestamp,
      }),
      deck,
      deckCardCount: ideaDeck.ideas.length,
      theme: look.theme,
    },
  ]);
}

export const placementsByIdeaId: ReadonlyMap<string, IdeaPlacement> = new Map(
  sampleIdeaDecks.flatMap(placeDeck)
);
