import { useState } from "react";

import type { DeckPackageInstallResult } from "@/features/decks/domain/deck-package.model";
import { useAppServices } from "@/infrastructure/app-services";

type ImportState = Readonly<{ error: Error | null; importing: boolean }>;

export function useImportDeckPackage(): ImportState & {
  importPackage: () => Promise<DeckPackageInstallResult | null>;
} {
  const { deckPackageImportService, deckPackagePicker } = useAppServices();
  const [state, setState] = useState<ImportState>({ error: null, importing: false });

  const importPackage = async (): Promise<DeckPackageInstallResult | null> => {
    setState({ error: null, importing: true });
    try {
      const selection = await deckPackagePicker.pick();
      if (!selection) {
        setState({ error: null, importing: false });
        return null;
      }
      const result = await deckPackageImportService.importFile(selection.uri);
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
