import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { useFlashcards } from "@/features/flashcards/hooks/use-flashcards";
import { EmptyFocusedFeed } from "@/features/reels/components/empty-focused-feed";
import { FeedScopeSwitcher } from "@/features/reels/components/feed-scope-switcher";
import { ReelFeed } from "@/features/reels/components/reel-feed";
import { type FocusedFeedState, useFeedScope } from "@/features/reels/context/feed-scope-context";
import { usePreparedReelFeed } from "@/features/reels/hooks/use-prepared-reel-feed";
import { palette } from "@/shared/presentation/palette";

type FocusedFeedProps = Readonly<{
  focusedFeed: FocusedFeedState;
  onChooseDeck: () => void;
  onSessionStarted: () => void;
}>;

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
    <ReelFeed
      baseCards={preparedFeed.baseCards}
      cards={preparedFeed.cards}
      initialPosition={preparedFeed.currentPosition}
      key={preparedFeed.studySessionId}
      recurrenceIds={preparedFeed.recurrenceIds}
      studySessionId={preparedFeed.studySessionId}
    />
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
      initialPosition={preparedFeed.currentPosition}
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

function FocusedFeed({ focusedFeed, onChooseDeck, onSessionStarted }: FocusedFeedProps) {
  if (focusedFeed.status === "empty") {
    return <EmptyFocusedFeed onChooseDeck={onChooseDeck} />;
  }
  return (
    <ReadyFocusedFeed
      key={`focused-${focusedFeed.deckId}-${focusedFeed.revision}`}
      focusedFeed={focusedFeed}
      onSessionStarted={onSessionStarted}
    />
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { activeScope, consumeFocusedFeedReplacement, focusedFeed } = useFeedScope();
  const { cards, loading } = useFlashcards(null);
  let feed: React.ReactNode;

  if (activeScope === "mixed") {
    if (loading) {
      feed = <LoadingState />;
    } else {
      feed = <ReadyMixedFeed cards={cards} />;
    }
  } else {
    feed = (
      <FocusedFeed
        focusedFeed={focusedFeed}
        onChooseDeck={() => router.navigate("/(tabs)/decks")}
        onSessionStarted={consumeFocusedFeedReplacement}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <FeedScopeSwitcher />
      {feed}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: palette.background, flex: 1 },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
});
