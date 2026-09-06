import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { useFlashcards } from "@/features/flashcards/hooks/use-flashcards";
import { EmptyFocusedFeed } from "@/features/reels/components/empty-focused-feed";
import { ReelFeed } from "@/features/reels/components/reel-feed";
import { useFeedScope, type FocusedFeedState } from "@/features/reels/context/feed-scope-context";
import { usePreparedReelFeed } from "@/features/reels/hooks/use-prepared-reel-feed";
import { palette } from "@/shared/presentation/palette";

function LoadingState() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={palette.textPrimary} size="large" />
    </View>
  );
}

type ReadyFocusedFeedContentProps = Readonly<{
  cards: Flashcard[];
  deckId: DeckId;
  onSessionStarted: () => void;
  replaceSession: boolean;
}>;

function ReadyFocusedFeedContent({
  cards,
  deckId,
  onSessionStarted,
  replaceSession,
}: ReadyFocusedFeedContentProps) {
  const preparedFeed = usePreparedReelFeed(
    cards,
    "focused",
    deckId,
    replaceSession,
    onSessionStarted
  );
  if (!preparedFeed) {
    return <LoadingState />;
  }

  return (
    <ReelFeed
      baseCards={preparedFeed.baseCards}
      cards={preparedFeed.cards}
      initialReelPosition={preparedFeed.currentReelPosition}
      key={preparedFeed.studySessionId}
      recurrenceIds={preparedFeed.recurrenceIds}
      showMainFeedLink
      studySessionId={preparedFeed.studySessionId}
    />
  );
}

function ReadyFocusedFeed({
  focusedFeed,
  onSessionStarted,
}: Readonly<{
  focusedFeed: Extract<FocusedFeedState, { status: "ready" }>;
  onSessionStarted: () => void;
}>) {
  const { cards, loading } = useFlashcards(focusedFeed.deckId);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <ReadyFocusedFeedContent
      cards={cards}
      deckId={focusedFeed.deckId}
      onSessionStarted={onSessionStarted}
      replaceSession={focusedFeed.replaceSession}
    />
  );
}

export default function FocusedFeedScreen() {
  const router = useRouter();
  const { consumeFocusedFeedReplacement, focusedFeed } = useFeedScope();

  if (focusedFeed.status === "empty") {
    return <EmptyFocusedFeed onChooseDeck={() => router.navigate("../library")} />;
  }

  return (
    <View style={styles.screen}>
      <ReadyFocusedFeed
        focusedFeed={focusedFeed}
        key={`focused-${focusedFeed.deckId}-${focusedFeed.revision}`}
        onSessionStarted={consumeFocusedFeedReplacement}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: palette.background, flex: 1 },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
});
