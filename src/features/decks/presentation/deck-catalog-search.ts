import type { Deck } from "@/features/decks/domain/deck.model";

export function matchesDeckSearch(
  deck: Pick<Deck, "description" | "title">,
  query: string
): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return (
    normalizedQuery.length === 0 ||
    deck.title.toLocaleLowerCase().includes(normalizedQuery) ||
    deck.description.toLocaleLowerCase().includes(normalizedQuery)
  );
}
