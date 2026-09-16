import { useRouter, type ErrorBoundaryProps } from "expo-router";

import DeckDetailsScreen from "@/features/decks/presentation/screens/deck-details-screen";
import { ViewErrorState } from "@/shared/presentation/components/view-error-state";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const router = useRouter();

  return (
    <ViewErrorState
      error={error}
      onHomeAction={() => router.replace("/(tabs)/(discover)")}
      retry={retry}
      scope="screen"
    />
  );
}

export default DeckDetailsScreen;
