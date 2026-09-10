import { useState } from "react";

import type { DeckInstallResult } from "@/features/decks/deck-installer";
import { useAppServices } from "@/infrastructure/app-services";

type ImportState = Readonly<{ error: Error | null; importing: boolean }>;

export function useImportDeckPackage(): ImportState & {
  importPackage: () => Promise<DeckInstallResult | null>;
} {
  const { deckInstaller, deckPackagePicker } = useAppServices();
  const [state, setState] = useState<ImportState>({ error: null, importing: false });

  const importPackage = async (): Promise<DeckInstallResult | null> => {
    setState({ error: null, importing: true });
    try {
      const selection = await deckPackagePicker.pick();
      if (!selection) {
        setState({ error: null, importing: false });
        return null;
      }
      const result = await deckInstaller.installFromFile(selection);
      setState({ error: null, importing: false });
      return result;
    } catch (error) {
      const normalized =
        error instanceof Error ? error : new Error("Could not import deck package");
      setState({ error: normalized, importing: false });
      return null;
    }
  };

  return { ...state, importPackage };
}
