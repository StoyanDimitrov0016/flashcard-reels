import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { useFlashcards } from "@/features/flashcards/hooks/use-flashcards";
import { EmptySession } from "@/features/reels/components/empty-session";
import { FeedModeSwitcher } from "@/features/reels/components/feed-mode-switcher";
import { ReelFeed } from "@/features/reels/components/reel-feed";
import { type DeckSession, useDeckSession } from "@/features/reels/context/deck-session-context";
import { usePreparedReelFeed } from "@/features/reels/hooks/use-prepared-reel-feed";
import { palette } from "@/shared/presentation/palette";

type SessionFeedProps = Readonly<{ onChooseDeck: () => void; session: DeckSession }>;

function LoadingState() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={palette.textPrimary} size="large" />
    </View>
  );
}

type ReadyForYouFeedProps = Readonly<{ cards: Flashcard[] }>;

function ReadyForYouFeed({ cards }: ReadyForYouFeedProps) {
  const preparedCards = usePreparedReelFeed(cards);

  return <ReelFeed cards={preparedCards} />;
}

type ReadySessionFeedContentProps = Readonly<{ cards: Flashcard[] }>;

function ReadySessionFeedContent({ cards }: ReadySessionFeedContentProps) {
  const preparedCards = usePreparedReelFeed(cards);

  return <ReelFeed cards={preparedCards} showMainFeedLink />;
}

function ReadySessionFeed({
  session,
}: Readonly<{ session: Extract<DeckSession, { status: "ready" }> }>) {
  const { cards, loading } = useFlashcards(session.deckId);

  if (loading) {
    return <LoadingState />;
  }

  return <ReadySessionFeedContent cards={cards} />;
}

function SessionFeed({ onChooseDeck, session }: SessionFeedProps) {
  if (session.status === "empty") {
    return <EmptySession onChooseDeck={onChooseDeck} />;
  }
  return (
    <ReadySessionFeed key={`session-${session.deckId}-${session.revision}`} session={session} />
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { activeMode, session } = useDeckSession();
  const { cards, loading } = useFlashcards(null);
  let feed: React.ReactNode;

  if (activeMode === "for-you") {
    if (loading) {
      feed = <LoadingState />;
    } else {
      feed = <ReadyForYouFeed cards={cards} />;
    }
  } else {
    feed = <SessionFeed onChooseDeck={() => router.navigate("/(tabs)/decks")} session={session} />;
  }

  return (
    <View style={styles.screen}>
      <FeedModeSwitcher />
      {feed}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: palette.background, flex: 1 },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
});
