import { useState } from "react";

import { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DeckAppearancePreset } from "@/features/decks/presentation/deck-appearance-presets";
import { useDeckAppearanceRevision } from "@/features/decks/presentation/context/deck-appearance-context";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { toOperationError } from "@/shared/errors/normalize-error";
import { reportError } from "@/shared/presentation/errors/report-error";

export function useSaveDeckAppearance() {
  const { deckService } = useDecks();
  const { invalidateAppearances } = useDeckAppearanceRevision();
  const [pendingPreset, setPendingPreset] = useState<DeckAppearancePreset | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const savePreset = async (deckId: DeckId, preset: DeckAppearancePreset) => {
    const appearance = new DeckAppearance({ deckId, presetId: preset.id });
    setPendingPreset(preset);
    setSaveError(null);
    try {
      await deckService.saveAppearance(appearance);
      invalidateAppearances();

      return appearance;
    } catch (error) {
      const normalized = toOperationError(error, {
        code: "DECK_OPERATION_FAILED",
        context: { deckId, operation: "deck-appearance-save" },
        message: "Could not save this palette",
      });
      reportError(normalized, "Deck appearance save failure");
      setSaveError("Could not save this palette. Please try again.");
      return null;
    } finally {
      setPendingPreset(null);
    }
  };

  return { clearSaveError: () => setSaveError(null), pendingPreset, saveError, savePreset };
}
