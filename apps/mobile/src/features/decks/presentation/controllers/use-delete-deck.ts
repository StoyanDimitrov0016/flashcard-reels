import { useMutation } from "@tanstack/react-query";

import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { deckMutations } from "@/features/decks/presentation/mutations/deck-mutations";

/** Deletes an installed deck. Screens navigate from `mutate`'s onSuccess, which skips unmounted screens. */
export function useDeleteDeck() {
  return useMutation(deckMutations.remove(useDecks()));
}
