import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import type { DeckThemeId } from "@/features/decks/domain/deck-theme-selection.model";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DeckTheme } from "@/features/decks/presentation/deck-theme-presets";

import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { deckMutations } from "@/features/decks/presentation/mutations/deck-mutations";

/** The deck whose theme the screen shows, and the theme it has loaded for it. */
type ShownThemeSelection = Readonly<{ deckId: DeckId | null; themeId: DeckThemeId | null }>;

type ChosenPreset = Readonly<{ deckId: DeckId; preset: DeckTheme }>;

/**
 * Saves a deck's theme. The save stays pending until the reloaded theme reaches the screen, and
 * the choice stays shown until \`shown\` reflects it, so the old theme never flashes in between.
 */
export function useSaveDeckThemeSelection(shown: ShownThemeSelection) {
  const save = useMutation(deckMutations.saveTheme(useDecks()));
  const [chosen, setChosen] = useState<ChosenPreset | null>(null);

  if (
    chosen &&
    !save.isPending &&
    chosen.deckId === shown.deckId &&
    chosen.preset.id === shown.themeId
  ) {
    setChosen(null);
  }

  const savePreset = (deckId: DeckId, preset: DeckTheme) => {
    setChosen({ deckId, preset });
    save.mutate({ deckId, theme: preset.id }, { onError: () => setChosen(null) });
  };

  const shownChoice = chosen?.deckId === shown.deckId ? chosen : null;

  return {
    clearSaveError: save.reset,
    /** The preset being saved, or saved but not yet shown by the screen. */
    pendingPreset: shownChoice?.preset ?? null,
    /** Only the write and its reload block another choice. */
    saving: shownChoice !== null && save.isPending,
    saveError: save.isError ? "Could not save this theme. Please try again." : null,
    savePreset,
  };
}
