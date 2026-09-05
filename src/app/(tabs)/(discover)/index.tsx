import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { EmptySession } from "@/features/reels/components/empty-session";
import { FeedModeSwitcher } from "@/features/reels/components/feed-mode-switcher";
import { ReelFeed } from "@/features/reels/components/reel-feed";
import { type DeckSession, useDeckSession } from "@/features/reels/context/deck-session-context";
import { useShuffledCards } from "@/features/reels/hooks/use-shuffled-cards";
import { useFlashcards } from "@/features/flashcards/hooks/use-flashcards";
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
  const shuffledCards = useShuffledCards(cards);

  return <ReelFeed cards={shuffledCards} key="for-you" />;
}

function ReadySessionFeed({
  session,
}: Readonly<{ session: Extract<DeckSession, { status: "ready" }> }>) {
  const { cards, loading } = useFlashcards(session.deckId);

  if (loading) {
    return <LoadingState />;
  }

  return <ReelFeed cards={cards} key={`session-${session.deckId}`} showMainFeedLink />;
}

function SessionFeed({ onChooseDeck, session }: SessionFeedProps) {
  if (session.status === "empty") {
    return <EmptySession onChooseDeck={onChooseDeck} />;
  }
  return <ReadySessionFeed key={`session-${session.deckId}`} session={session} />;
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
