import { ActivityIndicator, StyleSheet, View } from "react-native";

import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { useFlashcards } from "@/features/flashcards/hooks/use-flashcards";
import { ReelFeed } from "@/features/reels/components/reel-feed";
import { usePreparedReelFeed } from "@/features/reels/hooks/use-prepared-reel-feed";
import { palette } from "@/shared/presentation/palette";

function LoadingState() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={palette.textPrimary} size="large" />
    </View>
  );
}

type ReadyMixedFeedProps = Readonly<{ cards: Flashcard[] }>;

function ReadyMixedFeed({ cards }: ReadyMixedFeedProps) {
  const preparedFeed = usePreparedReelFeed(cards, "mixed", null, false);
  if (!preparedFeed) {
    return <LoadingState />;
  }

  return (
    <ReelFeed key={preparedFeed.studySessionId} preparedFeed={preparedFeed} sourceCards={cards} />
  );
}

export default function DiscoverScreen() {
  const { cards, loading } = useFlashcards(null);

  return (
    <View style={styles.screen}>
      {loading ? <LoadingState /> : <ReadyMixedFeed cards={cards} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: palette.background, flex: 1 },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
});
