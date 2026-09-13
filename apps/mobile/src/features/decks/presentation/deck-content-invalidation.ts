import type { DeckInstallResult } from "@/features/decks/deck-installer";

export function shouldInvalidateDeckContent(result: DeckInstallResult): boolean {
  return result.status === "installed" || result.status === "updated";
}
