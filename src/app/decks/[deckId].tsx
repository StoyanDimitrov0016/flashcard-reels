import type { ErrorBoundaryProps } from "expo-router";

import DeckDetailsScreen from "@/features/decks/presentation/screens/deck-details-screen";
import { ErrorState } from "@/shared/presentation/components/error-state";

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <ErrorState
      message="The cards are still safe. Try loading them again."
      onPrimaryAction={retry}
      primaryActionLabel="Try again"
      title="Could not load this deck"
    />
  );
}

export default DeckDetailsScreen;
