import type { ErrorBoundaryProps } from "expo-router";

import DeckDetailsScreen from "@/features/decks/presentation/screens/deck-details-screen";
import { ViewErrorBoundary } from "@/shared/presentation/components/view-error-boundary";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ViewErrorBoundary error={error} retry={retry} />;
}

export default DeckDetailsScreen;
