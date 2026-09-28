import { useState } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DeckTheme } from "@/features/decks/presentation/deck-theme-presets";

import { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import { useDeckThemeSelectionRevision } from "@/features/decks/presentation/context/deck-theme-selection-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { toOperationError } from "@/shared/errors/normalize-error";
import { reportError } from "@/shared/errors/report-error";

export function useSaveDeckThemeSelection() {
  const { deckService } = useDecks();
  const { invalidateThemeSelections } = useDeckThemeSelectionRevision();
  const [pendingPreset, setPendingPreset] = useState<DeckTheme | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const savePreset = async (deckId: DeckId, preset: DeckTheme) => {
    const themeSelection = new DeckThemeSelection({ deckId, theme: preset.id });
    setPendingPreset(preset);
    setSaveError(null);
    try {
      await deckService.saveThemeSelection(themeSelection);
      invalidateThemeSelections();

      return themeSelection;
    } catch (error) {
      const normalized = toOperationError(error, {
        code: "DECK_OPERATION_FAILED",
        context: { deckId, operation: "deck-theme-selection-save" },
        message: "Could not save this theme",
      });
      reportError(normalized, "Deck theme selection save failure");
      setSaveError("Could not save this theme. Please try again.");
      return null;
    } finally {
      setPendingPreset(null);
    }
  };

  return { clearSaveError: () => setSaveError(null), pendingPreset, saveError, savePreset };
}
