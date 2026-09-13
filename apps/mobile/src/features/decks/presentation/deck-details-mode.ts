import type { DeckId } from "@/features/decks/domain/deck.model";

export type DeckDetailsMode = "library" | "progress";

export function getDeckDetailsHref(deckId: DeckId, mode: DeckDetailsMode) {
  return {
    params: { deckId, mode },
    pathname: "/decks/[deckId]" as const,
  };
}

export function resolveDeckDetailsMode(value: string | string[] | undefined): DeckDetailsMode {
  const mode = Array.isArray(value) ? value[0] : value;
  return mode === "progress" ? "progress" : "library";
}

export function showsLearningProgress(mode: DeckDetailsMode): boolean {
  return mode === "progress";
}
