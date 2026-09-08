import { useState } from "react";

import { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DeckAppearancePreset } from "@/features/decks/presentation/deck-appearance-presets";
import { useDeckAppearanceRevision } from "@/features/decks/presentation/context/deck-appearance-context";
import { useAppServices } from "@/infrastructure/app-services";
import { selectAction } from "@/shared/presentation/haptics";

export function useSaveDeckAppearance() {
  const { deckService } = useAppServices();
  const { invalidateAppearances } = useDeckAppearanceRevision();
  const [pendingPreset, setPendingPreset] = useState<DeckAppearancePreset | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const savePreset = async (deckId: DeckId, preset: DeckAppearancePreset) => {
    const appearance = new DeckAppearance({ deckId, ...preset });
    setPendingPreset(preset);
    setSaveError(null);
    try {
      await deckService.saveAppearance(appearance);
      invalidateAppearances();
      selectAction();
      return appearance;
    } catch {
      setSaveError("Could not save this palette. Please try again.");
      return null;
    } finally {
      setPendingPreset(null);
    }
  };

  return { clearSaveError: () => setSaveError(null), pendingPreset, saveError, savePreset };
}
