import { useState } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DeckTheme } from "@/features/decks/presentation/deck-theme-presets";

import {
  type DeckThemeId,
  DeckThemeSelection,
} from "@/features/decks/domain/deck-theme-selection.model";
import { useDeckThemeSelectionRevision } from "@/features/decks/presentation/context/deck-theme-selection-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { toOperationError } from "@/shared/errors/normalize-error";
import { reportError } from "@/shared/errors/report-error";

/** The deck whose theme the screen shows, and the theme it has loaded for it. */
type ShownThemeSelection = Readonly<{ deckId: DeckId | null; themeId: DeckThemeId | null }>;

type ChosenPreset = Readonly<{ deckId: DeckId; preset: DeckTheme; saving: boolean }>;

/**
 * Saves a deck's theme. The save finishes before screens reload the saved theme, so the choice
 * stays pending until `shown` reflects it; otherwise the old theme would flash in between.
 */
export function useSaveDeckThemeSelection(shown: ShownThemeSelection) {
  const { deckService } = useDecks();
  const { invalidateThemeSelections } = useDeckThemeSelectionRevision();
  const [chosen, setChosen] = useState<ChosenPreset | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (
    chosen &&
    !chosen.saving &&
    chosen.deckId === shown.deckId &&
    chosen.preset.id === shown.themeId
  ) {
    setChosen(null);
  }

  const savePreset = async (deckId: DeckId, preset: DeckTheme) => {
    const themeSelection = new DeckThemeSelection({ deckId, theme: preset.id });
    setChosen({ deckId, preset, saving: true });
    setSaveError(null);
    try {
      await deckService.saveThemeSelection(themeSelection);
      invalidateThemeSelections();
      setChosen((current) =>
        current?.preset === preset ? { ...current, saving: false } : current
      );
      return themeSelection;
    } catch (error) {
      const normalized = toOperationError(error, {
        code: "DECK_OPERATION_FAILED",
        context: { deckId, operation: "deck-theme-selection-save" },
        message: "Could not save this theme",
      });
      reportError(normalized, "Deck theme selection save failure");
      setSaveError("Could not save this theme. Please try again.");
      setChosen(null);
      return null;
    }
  };

  const shownChoice = chosen?.deckId === shown.deckId ? chosen : null;

  return {
    clearSaveError: () => setSaveError(null),
    /** The preset being saved, or saved but not yet shown by the screen. */
    pendingPreset: shownChoice?.preset ?? null,
    /** Only the write blocks another choice; waiting for the reload does not. */
    saving: shownChoice?.saving ?? false,
    saveError,
    savePreset,
  };
}
