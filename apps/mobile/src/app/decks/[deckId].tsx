import { useRouter, type ErrorBoundaryProps } from "expo-router";

import DeckDetailsScreen from "@/features/decks/presentation/screens/deck-details-screen";
import { ErrorState } from "@/shared/presentation/components/error-state";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const router = useRouter();

  return (
    <ErrorState
      error={error}
      homeActionLabel="Go to Home"
      onHomeAction={() => router.replace("/(tabs)/(discover)")}
      onPrimaryAction={retry}
      primaryActionLabel="Try again"
      title="Couldn’t load deck"
    />
  );
}

export default DeckDetailsScreen;
