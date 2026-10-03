import { useLocalSearchParams } from "expo-router";

import { DeckIdSchema } from "@/features/decks/contracts/deck.schema";

export function useDeckRouteId(): string | null {
  const { deckId } = useLocalSearchParams();
  const parsed = DeckIdSchema.safeParse(deckId);
  return parsed.success ? parsed.data : null;
}
