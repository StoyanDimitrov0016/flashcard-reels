import { useRouter, type ErrorBoundaryProps } from "expo-router";

import DeckDetailsScreen from "@/features/decks/presentation/screens/deck-details-screen";
import { ErrorState } from "@/shared/presentation/components/error-state";

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const router = useRouter();

  return (
    <ErrorState
      homeActionLabel="Go to Home"
      message="The cards are still safe. Try loading them again."
      onHomeAction={() => router.replace("/(tabs)/(discover)")}
      onPrimaryAction={retry}
      primaryActionLabel="Try again"
      title="Could not load this deck"
    />
  );
}

export default DeckDetailsScreen;
